"""
routers/coach.py
----------------
Endpoints for the Coach, the conversational agent.

  GET  /api/coach/briefing — starter questions for the loaded dataset
  POST /api/coach/ask      — answer one question, with evidence and a step trace

The conversation history lives in the browser and is sent with each
request, so the backend stays stateless per question.
"""

from __future__ import annotations

import time
from collections import defaultdict, deque

from fastapi import APIRouter, HTTPException, Request

from agent import mock_router
from agent.coach import answer_question
from config import settings
from models.coach import CoachBriefing, CoachReply, CoachRequest
from routers.upload import get_current_data

router = APIRouter(prefix="/coach", tags=["coach"])

# Sliding-window rate limit per client IP. Only enforced when a real API key
# is set — it exists to cap spend on a public demo, and mock mode costs nothing.
_WINDOW_SECONDS = 3600
_recent_calls: dict[str, deque[float]] = defaultdict(deque)


def _enforce_rate_limit(client_ip: str) -> None:
    if not settings.ANTHROPIC_API_KEY:
        return
    now = time.monotonic()
    calls = _recent_calls[client_ip]
    while calls and now - calls[0] > _WINDOW_SECONDS:
        calls.popleft()
    if len(calls) >= settings.COACH_RATE_LIMIT_PER_HOUR:
        raise HTTPException(
            status_code=429,
            detail="The Coach has reached its hourly question limit for this demo. Please try again later.",
        )
    calls.append(now)


def _mode() -> str:
    return "claude" if settings.ANTHROPIC_API_KEY else "mock"


def _require_dataset():
    current = get_current_data()
    profile, df = current.get("profile"), current.get("dataframe")
    if profile is None or df is None:
        raise HTTPException(
            status_code=400,
            detail="No dataset loaded. Upload a CSV or load the sample dataset first.",
        )
    return profile, df


@router.get("/briefing", response_model=CoachBriefing)
async def briefing():
    """Starter questions tailored to the columns this dataset actually has."""
    profile, _ = _require_dataset()
    return CoachBriefing(suggestions=mock_router.starter_suggestions(profile), mode=_mode())


@router.post("/ask", response_model=CoachReply)
async def ask(body: CoachRequest, request: Request):
    """Answer one question about the loaded dataset."""
    profile, df = _require_dataset()

    question = body.question.strip()
    if not question:
        raise HTTPException(status_code=400, detail="Ask a question first.")
    if len(question) > settings.COACH_MAX_QUESTION_CHARS:
        raise HTTPException(
            status_code=400,
            detail=f"That question is too long. Keep it under {settings.COACH_MAX_QUESTION_CHARS} characters.",
        )
    body.question = question

    # Behind a hosting proxy every request shares the proxy's address, so
    # prefer the original client address it forwards.
    forwarded = request.headers.get("x-forwarded-for", "").split(",")[0].strip()
    _enforce_rate_limit(forwarded or (request.client.host if request.client else "unknown"))
    return await answer_question(body, df, profile)
