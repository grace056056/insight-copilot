"""
agent/coach.py
--------------
The Coach: a conversational agent that answers questions about the dataset.

One turn looks like this:

  question
    → plan      (Claude picks tools; in mock mode a keyword router does)
    → compute   (pandas runs each tool call and returns Evidence)
    → narrate   (the answer is written from that Evidence)
    → verify    (every number in the answer is looked up in the Evidence)

The model plans and narrates. It never computes. The verify step is what
makes that a property of the system instead of a request in a prompt: an
answer containing a number the tools did not produce is sent back for one
rewrite, and if it still fails, the reply is delivered flagged as
unverified so the UI can say so.

Safety rails on the agent loop:
  - at most COACH_MAX_STEPS model calls per question
  - tool errors are returned to the model as data, never raised
  - only the last few turns of history are sent
"""

from __future__ import annotations

import json
import logging

import pandas as pd

from agent import mock_router
from agent.grounding import collect_evidence_numbers, find_unverified
from agent.tools import (
    ToolResult,
    dataset_context,
    evidence_for_model,
    execute_tool,
    runnable_template_names,
)
from config import settings
from models.coach import CoachEvidence, CoachReply, CoachRequest, CoachStep
from models.schemas import DataProfile, SemanticRole

logger = logging.getLogger(__name__)

HISTORY_TURNS = 6
NEXT_STEP_MARKER = "next step:"


async def answer_question(
    request: CoachRequest,
    df: pd.DataFrame,
    profile: DataProfile,
    client=None,
) -> CoachReply:
    """Answer one question. `client` lets tests inject a scripted model."""
    if client is None and not settings.ANTHROPIC_API_KEY:
        return _mock_answer(request, df, profile)
    try:
        return _claude_answer(request, df, profile, client)
    except Exception as e:
        # The Coach degrades to the mock path instead of failing the request.
        logger.error("Coach model call failed (%s) — falling back to mock router", e)
        return _mock_answer(request, df, profile)


# ---------------------------------------------------------------------------
# Shared turn state
# ---------------------------------------------------------------------------

class _Turn:
    """Evidence and steps gathered while answering one question."""

    def __init__(self) -> None:
        self.evidence: list[CoachEvidence] = []
        self.steps: list[CoachStep] = []

    def record(self, tool: str, result: ToolResult) -> str | None:
        self.steps.append(CoachStep(tool=tool, label=result.label, ok=result.ok))
        if not result.ok or result.evidence is None:
            return None
        evidence_id = f"E{len(self.evidence) + 1}"
        self.evidence.append(CoachEvidence(id=evidence_id, title=result.title, evidence=result.evidence))
        return evidence_id

    def numbers(self) -> set[float]:
        # Values, digits inside labels, and how many rows each result has
        return collect_evidence_numbers(
            [[e.evidence.data, e.evidence.description, len(e.evidence.data)] for e in self.evidence]
        )


def _split_next_step(text: str) -> tuple[str, str | None]:
    """
    Separate the finding from the recommendation.

    The grounding check covers the finding only. The "Next step" line is
    advice ("follow up within 30 days"), not a claim about the data, and the
    prompt forbids it from introducing figures about the dataset.
    """
    idx = text.lower().rfind(NEXT_STEP_MARKER)
    if idx == -1:
        return text.strip(), None
    return text[:idx].strip(), text[idx + len(NEXT_STEP_MARKER):].strip() or None


def _exempt_text(request: CoachRequest) -> str:
    """Numbers the user or earlier turns already put into the conversation."""
    return " ".join([request.question] + [t.content for t in request.history])


def _attach_focus(request: CoachRequest, turn: _Turn, df: pd.DataFrame, profile: DataProfile) -> str | None:
    """Re-run the focused insight's template so its numbers are evidence in this turn."""
    if request.focus is None or request.focus.category not in runnable_template_names(profile):
        return None
    result = execute_tool("run_template", {"name": request.focus.category}, df, profile)
    return turn.record("run_template", result)


# ---------------------------------------------------------------------------
# Claude path — a tool-use loop
# ---------------------------------------------------------------------------

def _claude_answer(request: CoachRequest, df: pd.DataFrame, profile: DataProfile, client) -> CoachReply:
    from prompts.coach_v1 import CORRECTION_PROMPT, FOCUS_NOTE, SYSTEM_PROMPT, build_tools

    if client is None:
        import anthropic
        client = anthropic.Anthropic(api_key=settings.ANTHROPIC_API_KEY)

    turn = _Turn()
    system = SYSTEM_PROMPT.format(
        max_steps=settings.COACH_MAX_STEPS - 1,
        dataset_context=dataset_context(profile),
    )
    focus_id = _attach_focus(request, turn, df, profile)
    if focus_id:
        system += "\n" + FOCUS_NOTE.format(
            evidence_id=focus_id,
            category=request.focus.category,
            text=request.focus.text,
            evidence_json=json.dumps(evidence_for_model(turn.evidence[0].evidence), default=str),
        )

    tools = build_tools(runnable_template_names(profile), [c.name for c in profile.columns])
    messages: list[dict] = [
        {"role": t.role, "content": t.content} for t in request.history[-HISTORY_TURNS:]
    ]
    messages.append({"role": "user", "content": request.question})

    answer = ""
    corrected = False
    for _ in range(settings.COACH_MAX_STEPS):
        response = client.messages.create(
            model=settings.ANTHROPIC_MODEL,
            max_tokens=settings.COACH_MAX_TOKENS,
            system=system,
            tools=tools,
            messages=messages,
        )
        tool_calls = [b for b in response.content if b.type == "tool_use"]

        if tool_calls:
            messages.append({"role": "assistant", "content": [_block_to_dict(b) for b in response.content]})
            results = []
            for call in tool_calls:
                result = execute_tool(call.name, dict(call.input), df, profile)
                evidence_id = turn.record(call.name, result)
                payload = (
                    {"evidence_id": evidence_id, **evidence_for_model(result.evidence)}
                    if evidence_id else {"error": result.error}
                )
                results.append({
                    "type": "tool_result",
                    "tool_use_id": call.id,
                    "content": json.dumps(payload, default=str),
                    "is_error": not result.ok,
                })
            messages.append({"role": "user", "content": results})
            continue

        answer = "".join(b.text for b in response.content if b.type == "text").strip()
        unverified = find_unverified(_split_next_step(answer)[0], turn.numbers(), _exempt_text(request))
        if unverified and not corrected:
            # One chance to fix it, with the specific numbers that failed.
            corrected = True
            messages.append({"role": "assistant", "content": answer})
            messages.append({"role": "user", "content": CORRECTION_PROMPT.format(numbers=", ".join(unverified))})
            continue
        break
    else:
        answer = answer or (
            "I ran out of steps before I could finish that one. The evidence I gathered "
            "is below. Try asking a narrower question."
        )

    body, next_step = _split_next_step(answer)
    unverified = find_unverified(body, turn.numbers(), _exempt_text(request))
    return CoachReply(
        answer=body,
        next_step=next_step,
        evidence=turn.evidence,
        steps=turn.steps,
        grounded=not unverified,
        unverified_numbers=unverified,
        suggestions=mock_router.follow_up_suggestions(profile, None),
        mode="claude",
    )


def _block_to_dict(block) -> dict:
    if block.type == "tool_use":
        return {"type": "tool_use", "id": block.id, "name": block.name, "input": block.input}
    return {"type": "text", "text": getattr(block, "text", "")}


# ---------------------------------------------------------------------------
# Mock path — same tools, keyword planning
# ---------------------------------------------------------------------------

def _mock_answer(request: CoachRequest, df: pd.DataFrame, profile: DataProfile) -> CoachReply:
    from services.narrator import _mock_narrate

    turn = _Turn()
    runnable = runnable_template_names(profile)
    plan = mock_router.plan_question(request.question, df, profile, runnable)

    # "Ask about this" with a question the router can't parse → explain the insight itself
    if plan is None and request.focus and request.focus.category in runnable:
        plan = mock_router.Plan(kind="template", template=request.focus.category)

    if plan is None:
        return CoachReply(
            answer=(
                "I can't answer that one in demo mode. Without an API key I understand questions "
                "about revenue, orders, customers, units and discounts, broken down by a column, "
                "filtered to a value, or tracked by month."
            ),
            grounded=True,
            suggestions=mock_router.starter_suggestions(profile),
            mode="mock",
        )

    next_step = None
    spec = None
    if plan.kind == "template":
        result = execute_tool("run_template", {"name": plan.template}, df, profile)
        turn.record("run_template", result)
        if result.ok:
            narrative = _mock_narrate(
                [{"template": plan.template, "display_name": result.title, "evidence": result.evidence}]
            )[0]
            answer, next_step = narrative["text"], narrative["recommendation"]
        else:
            answer = f"I couldn't run that analysis: {result.error}"
    else:
        spec = plan.spec
        result = execute_tool("query_data", spec.model_dump(mode="json"), df, profile)
        turn.record("query_data", result)
        if result.ok:
            revenue_cols = {c.name for c in profile.columns if c.semantic_role == SemanticRole.REVENUE}
            answer = mock_router.phrase_query_answer(
                spec, result.evidence.data, result.evidence.y_key, result.title,
                money=spec.metric_column in revenue_cols,
            )
        else:
            answer = f"I couldn't compute that: {result.error}"

    unverified = find_unverified(answer, turn.numbers(), _exempt_text(request))
    return CoachReply(
        answer=answer,
        next_step=next_step,
        evidence=turn.evidence,
        steps=turn.steps,
        grounded=not unverified,
        unverified_numbers=unverified,
        suggestions=mock_router.follow_up_suggestions(profile, spec),
        mode="mock",
    )
