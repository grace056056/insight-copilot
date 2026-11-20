"""
agent/mock_router.py
--------------------
The Coach without an API key.

In mock mode there is no model to plan with, so a keyword router turns the
question into the same tool calls Claude would make. The tools, the
Evidence and the grounding check are identical to the real path — only the
planning and the wording are simpler. This keeps offline development and
the test suite honest: they exercise the real computation layer.

It understands questions built from: a metric (revenue, orders, customers,
units, discount, average), up to two dimensions ("by region"), values to
filter on ("for Electronics"), a month ("in March") and a time grain
("by month"). Anything else gets an explanation of what it can answer.
"""

from __future__ import annotations

import calendar
import re
from dataclasses import dataclass

import pandas as pd

from models.coach import Agg, FilterOp, QueryFilter, QuerySpec
from models.schemas import DataProfile, SemanticRole

_DIMENSION_WORDS: dict[SemanticRole, list[str]] = {
    SemanticRole.REGION: ["region", "regions", "area", "areas", "location", "locations"],
    SemanticRole.CHANNEL: ["channel", "channels", "platform", "platforms"],
    SemanticRole.CATEGORY: ["category", "categories"],
    SemanticRole.PRODUCT: ["product", "products", "item", "items"],
    SemanticRole.STATUS: ["status", "statuses"],
}
_MONTHS = {name.lower(): i for i, name in enumerate(calendar.month_name) if name}
_MAX_VALUE_CARDINALITY = 60


@dataclass
class Plan:
    kind: str                       # "template" | "query"
    template: str | None = None
    spec: QuerySpec | None = None


def _has(q: str, *words: str) -> bool:
    return any(re.search(rf"\b{re.escape(w)}\b", q) for w in words)


def _column(profile: DataProfile, role: SemanticRole) -> str | None:
    return next((c.name for c in profile.columns if c.semantic_role == role), None)


def plan_question(question: str, df: pd.DataFrame, profile: DataProfile, runnable: list[str]) -> Plan | None:
    q = question.lower()
    revenue = _column(profile, SemanticRole.REVENUE)
    order_id = _column(profile, SemanticRole.ORDER_ID)
    customer = _column(profile, SemanticRole.CUSTOMER_ID)
    quantity = _column(profile, SemanticRole.QUANTITY)
    discount = _column(profile, SemanticRole.DISCOUNT)
    date = _column(profile, SemanticRole.DATE)

    # --- Filters: a value of a low-cardinality column named in the question ---
    filters: list[QueryFilter] = []
    filtered_columns: set[str] = set()
    for col in profile.columns:
        if col.name not in df.columns or col.semantic_role == SemanticRole.DATE:
            continue
        if col.stats.unique_count > _MAX_VALUE_CARDINALITY or pd.api.types.is_numeric_dtype(df[col.name]):
            continue
        hits = [
            str(v) for v in df[col.name].dropna().unique()
            if len(str(v)) >= 3 and re.search(rf"(?<!\w){re.escape(str(v).lower())}(?!\w)", q)
        ]
        if len(hits) == 1:
            filters.append(QueryFilter(column=col.name, op=FilterOp.EQ, value=hits[0]))
        elif hits:
            filters.append(QueryFilter(column=col.name, op=FilterOp.IN, value=hits))
        if hits:
            filtered_columns.add(col.name)

    # --- Month filter: "in March" -------------------------------------------
    month = next((m for name, m in _MONTHS.items() if _has(q, name)), None)
    if month and date and profile.date_range:
        start_year = int(profile.date_range.start[:4])
        if start_year == int(profile.date_range.end[:4]):
            last_day = calendar.monthrange(start_year, month)[1]
            filters.append(QueryFilter(column=date, op=FilterOp.GTE, value=f"{start_year}-{month:02d}-01"))
            filters.append(QueryFilter(column=date, op=FilterOp.LTE, value=f"{start_year}-{month:02d}-{last_day}"))

    # --- Dimensions: "by region", "which channel" ---------------------------
    group_by: list[str] = []
    for role, words in _DIMENSION_WORDS.items():
        col = _column(profile, role)
        if col and col not in filtered_columns and _has(q, *words):
            group_by.append(col)
    if customer and _has(q, "top customers", "best customers", "which customer", "by customer", "per customer"):
        group_by.append(customer)
    group_by = group_by[:2]

    # --- Time grain ---------------------------------------------------------
    time_grain = None
    if date:
        if _has(q, "daily", "by day", "per day", "each day"):
            time_grain = "day"
        elif _has(q, "weekly", "by week", "per week", "each week"):
            time_grain = "week"
        elif _has(q, "monthly", "by month", "per month", "each month", "month by month",
                  "over time", "trend", "trending"):
            time_grain = "month"

    # --- Standard analyses --------------------------------------------------
    plain = not filters and not group_by
    if "repeat_purchase" in runnable and _has(q, "repeat", "retention", "returning", "loyal", "one-time", "come back"):
        return Plan(kind="template", template="repeat_purchase")
    if plain and not time_grain and "aov_analysis" in runnable and _has(q, "aov", "average order value", "order value"):
        return Plan(kind="template", template="aov_analysis")
    if plain and "revenue_trend" in runnable and _has(q, "growth", "month over month", "mom"):
        return Plan(kind="template", template="revenue_trend")

    # --- Metric -------------------------------------------------------------
    agg: Agg | None = None
    metric: str | None = None
    wants_average = _has(q, "average", "avg", "mean", "aov", "typical")

    if customer and customer not in group_by and _has(q, "customers", "customer", "buyers", "shoppers") \
            and _has(q, "how many", "number of", "count", "unique", "distinct"):
        agg, metric = Agg.NUNIQUE, customer
    elif _has(q, "how many orders", "number of orders", "order count", "order volume", "orders"):
        agg, metric = (Agg.NUNIQUE, order_id) if order_id else (Agg.COUNT, None)
    elif quantity and _has(q, "units", "quantity", "items sold", "volume"):
        agg, metric = (Agg.MEAN if wants_average else Agg.SUM), quantity
    elif discount and _has(q, "discount", "discounts", "discounted"):
        agg, metric = Agg.MEAN, discount
    elif revenue and wants_average:
        agg, metric = Agg.MEAN, revenue
    elif revenue and (_has(q, "revenue", "sales", "sell", "sells", "sold", "money", "earn", "earned", "gmv",
                           "income", "performing", "perform", "best", "worst", "top", "most", "least",
                           "highest", "lowest", "biggest", "smallest") or group_by or filters or time_grain):
        agg, metric = Agg.SUM, revenue

    if agg is None:
        return None

    sort = "asc" if _has(q, "lowest", "worst", "least", "bottom", "weakest", "smallest", "fewest") else "desc"
    top_n = re.search(r"\b(?:top|bottom|best|worst)\s+(\d{1,2})\b", q)
    limit = max(1, min(int(top_n.group(1)), 50)) if top_n else 20

    return Plan(kind="query", spec=QuerySpec(
        agg=agg, metric_column=metric, group_by=group_by, time_grain=time_grain,
        filters=filters, sort=sort, limit=limit,
    ))


# ---------------------------------------------------------------------------
# Wording — deterministic sentences built from the evidence rows
# ---------------------------------------------------------------------------

def phrase_query_answer(spec: QuerySpec, rows: list[dict], y_key: str, title: str, money: bool) -> str:
    def fmt(v) -> str:
        if isinstance(v, (int, float)):
            if money:
                return f"${v:,.2f}"
            return f"{v:,.2f}" if isinstance(v, float) and not float(v).is_integer() else f"{int(v):,}"
        return str(v)

    if not rows:
        return f"{title}: no rows matched, so there is nothing to report. Check the column roles in the profile."

    if not spec.group_by and not spec.time_grain:
        row = rows[0]
        return f"{title}: {fmt(row[y_key])}, across {row['rows_matched']:,} matching rows."

    keys = [k for k in rows[0] if k not in (y_key, "share_pct")]

    def name(row: dict) -> str:
        return " / ".join(str(row[k]) for k in keys)

    if spec.time_grain:
        first, last = rows[0], rows[-1]
        peak = max(rows, key=lambda r: r[y_key])
        return (
            f"{title}: {fmt(first[y_key])} in {name(first)} and {fmt(last[y_key])} in {name(last)}. "
            f"The peak was {fmt(peak[y_key])} in {name(peak)}."
        )

    lead, tail = rows[0], rows[-1]
    word_lead, word_tail = ("lowest", "highest") if spec.sort == "asc" else ("highest", "lowest")
    sentence = f"{title}: {name(lead)} is {word_lead} at {fmt(lead[y_key])}"
    if "share_pct" in lead:
        sentence += f" ({lead['share_pct']}% of the total)"
    if len(rows) > 1:
        sentence += f", and {name(tail)} is {word_tail} of the {len(rows)} shown at {fmt(tail[y_key])}"
    return sentence + "."


# ---------------------------------------------------------------------------
# Suggested questions — every one of these is answerable in mock mode
# ---------------------------------------------------------------------------

def starter_suggestions(profile: DataProfile) -> list[str]:
    roles = {c.semantic_role for c in profile.columns}
    out: list[str] = []
    if SemanticRole.REVENUE in roles:
        if SemanticRole.REGION in roles:
            out.append("Which region brings in the most revenue?")
        if SemanticRole.DATE in roles:
            out.append("How did revenue change month by month?")
        if SemanticRole.CHANNEL in roles:
            out.append("What is the average order value by channel?")
        if SemanticRole.CATEGORY in roles and SemanticRole.REGION in roles:
            out.append("Show revenue by category and region")
    if SemanticRole.CUSTOMER_ID in roles and SemanticRole.DATE in roles and SemanticRole.REVENUE in roles:
        out.append("How much revenue comes from repeat customers?")
    if not out:
        out.append("How many orders are in this dataset?")
    return out[:4]


def follow_up_suggestions(profile: DataProfile, spec: QuerySpec | None) -> list[str]:
    if spec is None:
        return starter_suggestions(profile)[:3]
    roles = {c.semantic_role: c.name for c in reversed(profile.columns)}
    used = set(spec.group_by)
    out: list[str] = []
    if not spec.time_grain and SemanticRole.DATE in roles and SemanticRole.REVENUE in roles:
        out.append("How did revenue change month by month?")
    for role, label in ((SemanticRole.CHANNEL, "channel"), (SemanticRole.CATEGORY, "category"),
                        (SemanticRole.REGION, "region")):
        if role in roles and roles[role] not in used and SemanticRole.REVENUE in roles:
            out.append(f"What is revenue by {label}?")
    return out[:3]
