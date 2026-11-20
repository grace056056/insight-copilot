"""
agent/query.py
--------------
Executes a QuerySpec with pandas and returns an Evidence object.

This is the Coach's general-purpose computation tool. The five analysis
templates answer five fixed questions; this answers the open-ended ones
("revenue by region for Electronics", "orders per month on Mobile App")
without ever letting the model write code or do arithmetic.
"""

from __future__ import annotations

import pandas as pd

from analysis.revenue_basis import net_basis
from models.coach import Agg, FilterOp, QueryFilter, QuerySpec
from models.schemas import ChartType, DataProfile, Evidence, SemanticRole

MAX_TIME_ROWS = 120

_AGG_WORDS = {
    Agg.SUM: "Sum",
    Agg.MEAN: "Average",
    Agg.MEDIAN: "Median",
    Agg.MIN: "Minimum",
    Agg.MAX: "Maximum",
    Agg.COUNT: "Row count",
    Agg.NUNIQUE: "Distinct count",
}
_OP_WORDS = {
    FilterOp.EQ: "=", FilterOp.NE: "≠", FilterOp.GT: ">", FilterOp.GTE: "≥",
    FilterOp.LT: "<", FilterOp.LTE: "≤", FilterOp.IN: "in", FilterOp.CONTAINS: "contains",
}
_NUMERIC_AGGS = {Agg.SUM, Agg.MEAN, Agg.MEDIAN, Agg.MIN, Agg.MAX}


class QueryError(ValueError):
    """The spec cannot run on this dataset. The message is safe to show the model."""


def run_query(df: pd.DataFrame, profile: DataProfile, spec: QuerySpec) -> Evidence:
    columns = list(df.columns)

    def require(col: str) -> str:
        if col not in df.columns:
            raise QueryError(f"Unknown column '{col}'. Available columns: {', '.join(columns)}")
        return col

    # --- Validate -----------------------------------------------------------
    if spec.agg != Agg.COUNT and not spec.metric_column:
        raise QueryError(f"agg '{spec.agg.value}' needs a metric_column.")
    if spec.metric_column:
        require(spec.metric_column)
    for g in spec.group_by:
        require(g)

    # Net basis: cancelled/refunded orders are left out, unless the question
    # is about order status itself (it filters or groups by that column).
    basis = net_basis(df, profile)
    asks_about_status = basis.status_column in spec.group_by or any(
        f.column == basis.status_column for f in spec.filters
    )
    note = ""
    work = df
    if basis.applied and not asks_about_status:
        work, note = basis.df, basis.note()
    total_rows = len(work)

    # --- Filter -------------------------------------------------------------
    for f in spec.filters:
        work = work[_filter_mask(work, require(f.column), f)]
    matched = len(work)
    if matched == 0:
        raise QueryError("No rows match these filters. Check the filter values against the column's top values.")

    # --- Metric -------------------------------------------------------------
    if spec.agg == Agg.COUNT:
        value_key = "row_count"
        series = pd.Series(1, index=work.index)
        agg_fn = "sum"
    else:
        value_key = f"{spec.agg.value}_{spec.metric_column}"
        series = work[spec.metric_column]
        if spec.agg in _NUMERIC_AGGS:
            series = pd.to_numeric(
                series.astype(str).str.replace(r"[$€£,]", "", regex=True), errors="coerce"
            )
            if series.notna().sum() == 0:
                raise QueryError(f"Column '{spec.metric_column}' is not numeric, so it cannot be used with '{spec.agg.value}'.")
        agg_fn = spec.agg.value

    # --- Group keys ---------------------------------------------------------
    keys: list[pd.Series] = []
    key_names: list[str] = []
    if spec.time_grain:
        date_col = _date_column(profile, df)
        dates = pd.to_datetime(work[date_col], errors="coerce")
        freq = {"day": "D", "week": "W", "month": "M"}[spec.time_grain]
        bucket = dates.dt.to_period(freq).astype(str)
        bucket = bucket.where(dates.notna())
        keys.append(bucket.rename(spec.time_grain))
        key_names.append(spec.time_grain)
    for g in spec.group_by:
        keys.append(work[g].astype(str).rename(g))
        key_names.append(g)

    # --- Aggregate ----------------------------------------------------------
    if not keys:
        value = _scalar(series, agg_fn)
        data = [{value_key: value, "rows_matched": matched}]
        chart, x_key = ChartType.METRIC, value_key
    else:
        grouped = series.groupby(keys, dropna=True).agg(agg_fn).reset_index(name=value_key)
        grouped[value_key] = grouped[value_key].astype(float).round(2)

        if spec.time_grain:
            grouped = grouped.sort_values(key_names).head(MAX_TIME_ROWS)
            chart = ChartType.LINE
        else:
            if spec.agg in (Agg.SUM, Agg.COUNT):
                total = grouped[value_key].sum()
                if total:
                    grouped["share_pct"] = (grouped[value_key] / total * 100).round(1)
            grouped = grouped.sort_values(value_key, ascending=(spec.sort == "asc")).head(spec.limit)
            chart = ChartType.BAR
        data = [_clean_row(r) for r in grouped.to_dict(orient="records")]
        x_key = key_names[0]

    return Evidence(
        template_used="query",
        description=_describe(spec, matched, total_rows) + note,
        data=data,
        chart_type=chart,
        x_key=x_key,
        y_key=value_key,
        group_key=key_names[1] if len(key_names) > 1 else None,
        highlight=None,
    )


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _date_column(profile: DataProfile, df: pd.DataFrame) -> str:
    for col in profile.columns:
        if col.semantic_role == SemanticRole.DATE and col.name in df.columns:
            return col.name
    raise QueryError("This dataset has no column with the 'date' role, so time_grain cannot be used.")


def _filter_mask(df: pd.DataFrame, column: str, f: QueryFilter) -> pd.Series:
    col = df[column]
    op, value = f.op, f.value

    if op in (FilterOp.GT, FilterOp.GTE, FilterOp.LT, FilterOp.LTE):
        left = pd.to_numeric(col, errors="coerce")
        right = pd.to_numeric(pd.Series([value]), errors="coerce").iloc[0]
        if left.notna().sum() == 0 or pd.isna(right):
            # Not numeric on one side — compare as dates (ISO strings sort correctly)
            left = pd.to_datetime(col, errors="coerce")
            right = pd.to_datetime(value, errors="coerce")
            if pd.isna(right):
                raise QueryError(f"Cannot compare column '{column}' with value '{value}'.")
        return {
            FilterOp.GT: left > right, FilterOp.GTE: left >= right,
            FilterOp.LT: left < right, FilterOp.LTE: left <= right,
        }[op].fillna(False)

    text = col.astype(str).str.strip().str.lower()
    if op == FilterOp.IN:
        values = value if isinstance(value, list) else [value]
        return text.isin([str(v).strip().lower() for v in values])
    needle = str(value).strip().lower()
    if op == FilterOp.CONTAINS:
        return text.str.contains(needle, regex=False)
    if op == FilterOp.NE:
        return text != needle
    return text == needle


def _scalar(series: pd.Series, agg_fn: str) -> float | int:
    value = getattr(series, agg_fn)()
    if agg_fn == "nunique":
        return int(value)
    value = float(value)
    return int(value) if value.is_integer() else round(value, 2)


def _clean_row(row: dict) -> dict:
    out = {}
    for k, v in row.items():
        if isinstance(v, float) and v.is_integer() and k != "share_pct":
            v = int(v)
        out[k] = v
    return out


def _describe(spec: QuerySpec, matched: int, total: int) -> str:
    what = _AGG_WORDS[spec.agg]
    if spec.metric_column and spec.agg != Agg.COUNT:
        what += f" of {spec.metric_column}"
    by = ([f"{spec.time_grain}"] if spec.time_grain else []) + spec.group_by
    if by:
        what += " by " + " and ".join(by)
    if spec.filters:
        what += ", where " + " and ".join(
            f"{f.column} {_OP_WORDS[f.op]} {f.value}" for f in spec.filters
        )
    return f"{what}. Computed by pandas over {matched:,} of {total:,} rows."
