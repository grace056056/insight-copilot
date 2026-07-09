"""
models/schemas.py
-----------------
Pydantic models defining the API's data contracts.

These schemas serve three purposes:
  1. Request/response validation for FastAPI endpoints
  2. Typed contracts between backend services
  3. Documentation — recruiters can read these to understand the data model

Design note:
  Every field has a clear type and purpose. The Evidence model is the key
  differentiator — it's what makes insights auditable and separates this
  project from a ChatGPT wrapper.
"""

from __future__ import annotations

from enum import Enum
from typing import Any

from pydantic import BaseModel, Field


# ---------------------------------------------------------------------------
# Enums — constrained vocabularies for type safety
# ---------------------------------------------------------------------------

class DType(str, Enum):
    """Detected data type for a column (deterministic profiling)."""
    NUMERIC = "numeric"
    CATEGORICAL = "categorical"
    DATETIME = "datetime"
    TEXT = "text"
    IDENTIFIER = "identifier"


class SemanticRole(str, Enum):
    """
    Business meaning of a column in an e-commerce context.
    Assigned by the LLM during semantic profiling (Day 2).
    """
    REVENUE = "revenue"
    QUANTITY = "quantity"
    CUSTOMER_ID = "customer_id"
    ORDER_ID = "order_id"
    PRODUCT = "product"
    CATEGORY = "category"
    DATE = "date"
    DISCOUNT = "discount"
    REGION = "region"
    CHANNEL = "channel"
    STATUS = "status"
    OTHER = "other"


class HealthSeverity(str, Enum):
    INFO = "info"
    WARNING = "warning"


class Priority(str, Enum):
    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"


class FeedbackType(str, Enum):
    USEFUL = "useful"
    NOT_USEFUL = "not_useful"
    WRONG = "wrong"


class WrongReason(str, Enum):
    NUMBERS_WRONG = "numbers_wrong"
    NOT_RELEVANT = "not_relevant"
    ALREADY_KNEW = "already_knew"


class ChartType(str, Enum):
    BAR = "bar"
    LINE = "line"
    PIE = "pie"
    METRIC = "metric"
    HORIZONTAL_BAR = "horizontal_bar"


# ---------------------------------------------------------------------------
# Column-level models
# ---------------------------------------------------------------------------

class ColumnStats(BaseModel):
    """Statistical summary of a single column. Computed deterministically."""

    nullable_pct: float = Field(description="Percentage of null/empty values (0-100)")
    unique_count: int = Field(description="Number of distinct values")
    total_count: int = Field(description="Total number of rows")

    # Numeric-only stats (None for non-numeric columns)
    min: float | None = None
    max: float | None = None
    mean: float | None = None
    median: float | None = None
    std: float | None = None

    # Categorical-only stats (None for numeric columns)
    top_values: list[TopValue] | None = None


class TopValue(BaseModel):
    """A frequently occurring value and its count."""
    value: str
    count: int
    percentage: float  # percentage of total rows


class ColumnProfile(BaseModel):
    """
    Complete profile of a single column — both statistical and semantic.

    The deterministic profiler fills in: name, dtype, stats, is_dimension, is_measure.
    The semantic profiler (Day 2) fills in: semantic_role.
    """

    name: str
    dtype: DType
    semantic_role: SemanticRole = SemanticRole.OTHER  # Set by LLM in Day 2
    stats: ColumnStats
    is_dimension: bool = Field(description="True if this column groups/segments data")
    is_measure: bool = Field(description="True if this column is aggregatable (sum, avg)")


# ---------------------------------------------------------------------------
# Dataset-level models
# ---------------------------------------------------------------------------

class HealthFlag(BaseModel):
    """A data quality issue detected during profiling."""
    column: str
    issue: str  # e.g. "high_nulls", "single_value", "outliers"
    detail: str  # human-readable explanation
    severity: HealthSeverity


class DataProfile(BaseModel):
    """
    The complete profile of an uploaded dataset.

    This is the central data structure of the entire application.
    It's computed once on upload and passed to every downstream service
    (hypothesis generation, analysis templates, chat context).

    Why this matters:
      The LLM never sees raw CSV data. It receives this structured profile,
      which contains computed statistics and semantic classifications.
      This separation ensures numerical accuracy and reduces token usage.
    """

    filename: str
    row_count: int
    column_count: int
    date_range: DateRange | None = None
    grain: str | None = Field(
        default=None,
        description="Data granularity, e.g. 'order-line', 'daily-summary', 'customer'",
    )
    summary: str | None = Field(
        default=None,
        description="AI-generated one-line summary of the dataset (set in Day 2)",
    )
    columns: list[ColumnProfile]
    health_flags: list[HealthFlag]


class DateRange(BaseModel):
    """The temporal span of the dataset."""
    start: str  # ISO date string
    end: str
    span_days: int


# ---------------------------------------------------------------------------
# Insight models (Day 3+, defined now for schema completeness)
# ---------------------------------------------------------------------------

class Evidence(BaseModel):
    """
    The auditable proof behind an AI-generated insight.

    This is what separates Insight Copilot from a ChatGPT wrapper.
    Every claim links to a specific computation with real data.
    """

    template_used: str = Field(description="Which analysis template produced this")
    description: str = Field(description="What computation was performed")
    data: list[dict[str, Any]] = Field(description="The actual computed data slice")
    chart_type: ChartType
    x_key: str = Field(description="Key for chart x-axis")
    y_key: str = Field(description="Key for chart y-axis")
    group_key: str | None = None
    highlight: str | None = Field(
        default=None,
        description="Which data point to visually emphasize",
    )


class Insight(BaseModel):
    """A single AI-generated business insight with linked evidence."""

    id: str = Field(description="Unique identifier, e.g. 'ins_001'")
    text: str = Field(description="Human-readable finding with specific numbers")
    priority: Priority
    confidence: float = Field(ge=0, le=1, description="Model confidence 0-1")
    category: str = Field(description="Analysis category, e.g. 'revenue_trend'")
    recommendation: str = Field(
        description="Actionable next step the business should consider"
    )
    evidence: Evidence
    feedback: FeedbackType | None = None


# ---------------------------------------------------------------------------
# API request/response models
# ---------------------------------------------------------------------------

class UploadResponse(BaseModel):
    """Response from POST /api/upload."""
    profile: DataProfile


class AnalyzeRequest(BaseModel):
    """Request to POST /api/analyze."""
    profile: DataProfile
    feedback_items: list[FeedbackItem] | None = None


class AnalyzeResponse(BaseModel):
    """Response from POST /api/analyze."""
    insights: list[Insight]
    suggested_questions: list[str]


class FeedbackItem(BaseModel):
    """A single piece of user feedback on an insight."""
    insight_id: str
    type: FeedbackType
    wrong_reason: WrongReason | None = None
    category: str  # Inherited from the insight's category


# Fix forward reference for TopValue in ColumnStats
ColumnStats.model_rebuild()
