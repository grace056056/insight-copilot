"""
The Coach: query tool, grounding check, mock router, the Claude tool-use
loop (driven by a scripted fake model — no API calls), and the endpoints.
"""

import asyncio
from types import SimpleNamespace

import pandas as pd
import pytest

from agent import mock_router
from agent.coach import answer_question
from agent.grounding import collect_evidence_numbers, find_unverified
from agent.query import QueryError, run_query
from models.coach import CoachFocus, CoachRequest, QuerySpec


def ask(question, df, profile, client=None, **kwargs):
    request = CoachRequest(question=question, **kwargs)
    return asyncio.run(answer_question(request, df, profile, client=client))


# ---------------------------------------------------------------------------
# query_data — results must equal a direct pandas computation
# ---------------------------------------------------------------------------

def test_query_grouped_sum_matches_pandas(sample_profiled):
    profile, df = sample_profiled
    ev = run_query(df, profile, QuerySpec(agg="sum", metric_column="total_amount", group_by=["region"]))
    expected = df.groupby("region")["total_amount"].sum().round(2)
    got = {row["region"]: row["sum_total_amount"] for row in ev.data}
    assert got == pytest.approx(expected.to_dict())
    assert sum(row["share_pct"] for row in ev.data) == pytest.approx(100, abs=0.3)
    assert ev.data[0]["sum_total_amount"] == max(got.values())  # sorted desc by default


def test_query_filters_and_scalar(sample_profiled):
    profile, df = sample_profiled
    spec = QuerySpec(
        agg="nunique", metric_column="customer_id",
        filters=[{"column": "channel", "op": "eq", "value": "mobile app"},   # case-insensitive
                 {"column": "total_amount", "op": "gte", "value": 50}],
    )
    ev = run_query(df, profile, spec)
    subset = df[(df["channel"] == "Mobile App") & (df["total_amount"] >= 50)]
    assert ev.data == [{"nunique_customer_id": subset["customer_id"].nunique(), "rows_matched": len(subset)}]


def test_query_time_grain_and_date_filter(sample_profiled):
    profile, df = sample_profiled
    spec = QuerySpec(
        agg="count", time_grain="month",
        filters=[{"column": "order_date", "op": "lte", "value": "2024-02-29"}],
    )
    ev = run_query(df, profile, spec)
    assert [row["month"] for row in ev.data] == ["2024-01", "2024-02"]
    months = pd.to_datetime(df["order_date"]).dt.to_period("M").astype(str)
    assert ev.data[0]["row_count"] == int((months == "2024-01").sum())
    assert ev.chart_type.value == "line"


@pytest.mark.parametrize("spec, fragment", [
    (dict(agg="sum", metric_column="nope"), "Unknown column"),
    (dict(agg="sum", metric_column="region"), "not numeric"),
    (dict(agg="sum"), "needs a metric_column"),
    (dict(agg="count", filters=[{"column": "region", "op": "eq", "value": "Mars"}]), "No rows match"),
])
def test_query_rejects_what_it_cannot_compute(sample_profiled, spec, fragment):
    profile, df = sample_profiled
    with pytest.raises(QueryError, match=fragment):
        run_query(df, profile, QuerySpec(**spec))


# ---------------------------------------------------------------------------
# Grounding check
# ---------------------------------------------------------------------------

def test_grounding_accepts_evidence_numbers_at_any_written_precision():
    pool = collect_evidence_numbers([{"revenue": 28111.26, "growth_pct": -12.4, "month": "2024-03"}])
    text = "Revenue hit $28,111.26 (about 28111.3) in 2024-03, then declined 12.4%. See the top 3."
    assert find_unverified(text, pool) == []


def test_grounding_flags_invented_and_derived_numbers():
    pool = collect_evidence_numbers([{"a": 100.0, "b": 250.0}])
    assert find_unverified("A is 100 and B is 250, a gap of 150, or 28.1k overall.", pool) == ["150", "28.1"]


def test_grounding_exempts_numbers_the_user_typed():
    assert find_unverified("Orders above 75 dollars", set(), exempt_text="orders above $75?") == []


# ---------------------------------------------------------------------------
# Mock mode — same tools, keyword planning
# ---------------------------------------------------------------------------

def test_mock_coach_answers_with_evidence(sample_profiled):
    profile, df = sample_profiled
    reply = ask("Which region brings in the most revenue?", df, profile)
    top = df.groupby("region")["total_amount"].sum().idxmax()
    assert reply.mode == "mock"
    assert top in reply.answer
    assert reply.grounded and reply.evidence[0].evidence.template_used == "query"
    assert reply.steps[0].tool == "query_data"


def test_every_suggested_question_is_answerable_and_grounded(sample_profiled):
    profile, df = sample_profiled
    questions = set(mock_router.starter_suggestions(profile))
    for q in list(questions):
        questions.update(ask(q, df, profile).suggestions)
    assert len(questions) >= 5
    for q in questions:
        reply = ask(q, df, profile)
        assert reply.evidence, q
        assert reply.grounded, (q, reply.unverified_numbers)


def test_mock_coach_is_honest_about_what_it_cannot_parse(sample_profiled):
    profile, df = sample_profiled
    reply = ask("what's the weather like?", df, profile)
    assert not reply.evidence and "demo mode" in reply.answer and reply.suggestions


def test_focus_falls_back_to_the_insight_template(sample_profiled):
    profile, df = sample_profiled
    reply = ask("why does this matter?", df, profile,
                focus=CoachFocus(category="repeat_purchase", text="..."))
    assert reply.evidence[0].evidence.template_used == "repeat_purchase"


# ---------------------------------------------------------------------------
# Claude path — the tool-use loop, driven by a scripted model
# ---------------------------------------------------------------------------

def tool_use(name, tool_input, call_id="call_1"):
    return SimpleNamespace(content=[SimpleNamespace(type="tool_use", id=call_id, name=name, input=tool_input)])


def text(body):
    return SimpleNamespace(content=[SimpleNamespace(type="text", text=body)])


class ScriptedModel:
    """Stands in for anthropic.Anthropic: returns queued responses, records requests."""

    def __init__(self, *responses):
        self._responses = list(responses)
        self.requests = []
        self.messages = SimpleNamespace(create=self._create)

    def _create(self, **kwargs):
        self.requests.append({**kwargs, "messages": list(kwargs["messages"])})
        response = self._responses.pop(0)
        return response(kwargs) if callable(response) else response


REGION_QUERY = {"agg": "sum", "metric_column": "total_amount", "group_by": ["region"]}


def test_claude_loop_runs_tools_and_returns_grounded_answer(sample_profiled):
    profile, df = sample_profiled
    west = round(df[df["region"] == "West"]["total_amount"].sum(), 2)
    model = ScriptedModel(
        tool_use("query_data", REGION_QUERY),
        text(f"West leads with ${west:,.2f} in revenue.\nNext step: Shift ad budget toward West."),
    )
    reply = ask("Which region is best?", df, profile, client=model)

    assert reply.mode == "claude" and reply.grounded
    assert reply.answer == f"West leads with ${west:,.2f} in revenue."
    assert reply.next_step == "Shift ad budget toward West."
    assert [e.id for e in reply.evidence] == ["E1"]
    # The model saw aggregated rows from pandas, tagged with the evidence id
    tool_result = model.requests[1]["messages"][-1]["content"][0]
    assert tool_result["type"] == "tool_result" and '"evidence_id": "E1"' in tool_result["content"]
    # ...and the system prompt carried the column profile, not raw rows
    assert "total_amount" in model.requests[0]["system"] and "ORD-00" not in model.requests[0]["system"]


def test_claude_loop_sends_invented_numbers_back_for_one_rewrite(sample_profiled):
    profile, df = sample_profiled
    west = round(df[df["region"] == "West"]["total_amount"].sum(), 2)
    model = ScriptedModel(
        tool_use("query_data", REGION_QUERY),
        text("West leads with roughly $99,999 in revenue."),
        text(f"West leads with ${west:,.2f} in revenue."),
    )
    reply = ask("Which region is best?", df, profile, client=model)
    assert reply.grounded
    assert "99999" in model.requests[2]["messages"][-1]["content"]  # the correction named the bad number


def test_claude_reply_is_flagged_when_the_rewrite_is_still_ungrounded(sample_profiled):
    profile, df = sample_profiled
    model = ScriptedModel(
        tool_use("query_data", REGION_QUERY),
        text("West leads with $99,999."),
        text("West leads with $88,888."),
    )
    reply = ask("Which region is best?", df, profile, client=model)
    assert reply.grounded is False and reply.unverified_numbers == ["88888"]


def test_claude_loop_lets_the_model_recover_from_a_bad_tool_call(sample_profiled):
    profile, df = sample_profiled
    model = ScriptedModel(
        tool_use("query_data", {"agg": "sum", "metric_column": "revenue"}),   # no such column
        tool_use("run_template", {"name": "repeat_purchase"}, call_id="call_2"),
        text("Repeat buyers matter here."),
    )
    reply = ask("Do repeat buyers matter?", df, profile, client=model)
    assert [s.ok for s in reply.steps] == [False, True]
    failed = model.requests[1]["messages"][-1]["content"][0]
    assert failed["is_error"] is True and "Unknown column" in failed["content"]
    assert len(reply.evidence) == 1


def test_claude_loop_stops_at_the_step_cap(sample_profiled):
    profile, df = sample_profiled
    model = ScriptedModel(*[
        (lambda kw, i=i: tool_use("query_data", REGION_QUERY, call_id=f"call_{i}")) for i in range(20)
    ])
    reply = ask("Loop forever", df, profile, client=model)
    from config import settings
    assert len(model.requests) == settings.COACH_MAX_STEPS
    assert "ran out of steps" in reply.answer


def test_focus_evidence_is_available_without_a_tool_call(sample_profiled):
    profile, df = sample_profiled
    model = ScriptedModel(text("That concentration is a risk worth watching."))
    reply = ask("Is this a risk?", df, profile, client=model,
                focus=CoachFocus(category="top_products", text="Winter Jacket leads."))
    assert reply.evidence[0].evidence.template_used == "top_products"
    assert "Winter Jacket leads." in model.requests[0]["system"]


def test_a_failing_model_falls_back_to_the_mock_router(sample_profiled):
    profile, df = sample_profiled

    def boom(_kwargs):
        raise RuntimeError("API down")

    reply = ask("What is revenue by channel?", df, profile, client=ScriptedModel(boom))
    assert reply.mode == "mock" and reply.evidence


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------

def test_coach_endpoints_require_a_dataset(client):
    assert client.get("/api/coach/briefing").status_code == 400
    assert client.post("/api/coach/ask", json={"question": "hi"}).status_code == 400


def test_coach_endpoints(client):
    client.get("/api/sample-dataset")
    briefing = client.get("/api/coach/briefing").json()
    assert briefing["mode"] == "mock" and briefing["suggestions"]

    r = client.post("/api/coach/ask", json={"question": briefing["suggestions"][0]})
    assert r.status_code == 200
    body = r.json()
    assert body["grounded"] is True and body["evidence"][0]["evidence"]["data"]

    assert client.post("/api/coach/ask", json={"question": "   "}).status_code == 400
    assert client.post("/api/coach/ask", json={"question": "x" * 501}).status_code == 400


# ---------------------------------------------------------------------------
# Found in the first live run against the real API
# ---------------------------------------------------------------------------

def test_small_talk_reply_is_cleaned_and_profile_facts_count_as_grounded(sample_profiled):
    profile, df = sample_profiled
    model = ScriptedModel(text(
        "Hi, I'm **Pip**. Your data has 3,500 rows and runs from 2024-01-01 to 2024-06-30."
    ))
    reply = ask("hi pip", df, profile, client=model)
    assert "*" not in reply.answer and "Pip" in reply.answer
    assert reply.grounded and reply.next_step is None
    assert not reply.steps and not reply.evidence
    assert len(model.requests) == 1          # no tool calls, no rewrite


def test_next_step_numbers_are_checked_in_the_claude_path(sample_profiled):
    profile, df = sample_profiled
    bad = "West leads on revenue.\nNext step: Win back the 9,999 lapsed buyers."
    model = ScriptedModel(tool_use("query_data", REGION_QUERY), text(bad), text(bad))
    reply = ask("Which region is best?", df, profile, client=model)
    assert reply.grounded is False and reply.unverified_numbers == ["9999"]


def test_prompt_covers_small_talk_and_name():
    from prompts.coach_v1 import SYSTEM_PROMPT
    assert "small talk" in SYSTEM_PROMPT and "radar" in SYSTEM_PROMPT and "asterisks" in SYSTEM_PROMPT
