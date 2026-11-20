"""
models/coach.py
---------------
Data contracts for the Coach — the conversational agent.

The Coach answers questions in plain language, but it never computes a
number itself. Every figure in a reply comes from an Evidence object that a
pandas tool produced during that turn, and the reply carries those Evidence
objects back to the UI so each answer can be audited.
"""

from __future__ import annotations

from enum import Enum
from typing import Any, Literal

from pydantic import BaseModel, Field

from models.schemas import Evidence


# ---------------------------------------------------------------------------
# query_data tool — a constrained aggregation spec (NOT free-form code)
# ---------------------------------------------------------------------------

class Agg(str, Enum):
    SUM = "sum"
    MEAN = "mean"
    MEDIAN = "median"
    MIN = "min"
    MAX = "max"
    COUNT = "count"        # number of rows
    NUNIQUE = "nunique"    # number of distinct values


class FilterOp(str, Enum):
    EQ = "eq"
    NE = "ne"
    GT = "gt"
    GTE = "gte"
    LT = "lt"
    LTE = "lte"
    IN = "in"
    CONTAINS = "contains"


class QueryFilter(BaseModel):
    column: str
    op: FilterOp
    value: Any


class QuerySpec(BaseModel):
    """
    One aggregation over the dataset, described as data.

    The agent fills this in; pandas executes it. Because the spec can only
    express "aggregate one column, optionally grouped and filtered", there
    is no arbitrary code to sandbox, and the spec itself is readable proof
    of what was computed.
    """

    agg: Agg
    metric_column: str | None = Field(
        default=None,
        description="Column to aggregate. Omit only when agg is 'count'.",
    )
    group_by: list[str] = Field(default_factory=list, max_length=2)
    time_grain: Literal["day", "week", "month"] | None = None
    filters: list[QueryFilter] = Field(default_factory=list, max_length=5)
    sort: Literal["desc", "asc"] = "desc"
    limit: int = Field(default=20, ge=1, le=50)


# ---------------------------------------------------------------------------
# API contracts
# ---------------------------------------------------------------------------

class ChatTurn(BaseModel):
    role: Literal["user", "assistant"]
    content: str


class CoachFocus(BaseModel):
    """The insight the user opened the Coach from ("Ask about this")."""
    category: str
    text: str


class CoachRequest(BaseModel):
    question: str
    history: list[ChatTurn] = Field(default_factory=list)
    focus: CoachFocus | None = None


class CoachStep(BaseModel):
    """One tool call the Coach made, shown to the user as a trace."""
    tool: str
    label: str
    ok: bool = True


class CoachEvidence(BaseModel):
    id: str  # "E1", "E2", ... unique within one reply
    title: str
    evidence: Evidence


class CoachReply(BaseModel):
    answer: str
    next_step: str | None = None
    evidence: list[CoachEvidence] = Field(default_factory=list)
    steps: list[CoachStep] = Field(default_factory=list)
    grounded: bool = Field(
        description="True when every number in the answer was found in the evidence"
    )
    unverified_numbers: list[str] = Field(default_factory=list)
    suggestions: list[str] = Field(default_factory=list)
    mode: Literal["claude", "mock"]


class CoachBriefing(BaseModel):
    suggestions: list[str]
    mode: Literal["claude", "mock"]
