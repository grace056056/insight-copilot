"""
agent/tools.py
--------------
The Coach's tools: what it is allowed to do, and nothing more.

  run_template — one of the registered analysis templates
  query_data   — a constrained aggregation (see models/coach.QuerySpec)

Both return an Evidence object computed by pandas. A tool call that cannot
run returns a readable error instead of raising, so the agent can correct
its own request on the next step.
"""

from __future__ import annotations

from dataclasses import dataclass

import pandas as pd
from pydantic import ValidationError

from agent.query import QueryError, run_query
from analysis.registry import get_runnable_templates
from analysis.revenue_basis import net_basis
from models.coach import QuerySpec
from models.schemas import DataProfile, DType, Evidence, SemanticRole

MAX_ROWS_TO_MODEL = 40
MAX_LABEL_CARDINALITY = 60
_ID_ROLES = {SemanticRole.ORDER_ID, SemanticRole.CUSTOMER_ID}


@dataclass
class ToolResult:
    ok: bool
    label: str                      # shown to the user in the step trace
    title: str = ""                 # evidence card title
    evidence: Evidence | None = None
    error: str | None = None        # shown to the model so it can retry


def runnable_template_names(profile: DataProfile) -> list[str]:
    return [t.name for t in get_runnable_templates(profile)]


def execute_tool(name: str, tool_input: dict, df: pd.DataFrame, profile: DataProfile) -> ToolResult:
    if name == "run_template":
        return _run_template(str(tool_input.get("name", "")), df, profile)
    if name == "query_data":
        return _query_data(tool_input, df, profile)
    return ToolResult(ok=False, label=f"Unknown tool {name}", error=f"Unknown tool '{name}'.")


def _run_template(template_name: str, df: pd.DataFrame, profile: DataProfile) -> ToolResult:
    templates = {t.name: t for t in get_runnable_templates(profile)}
    template = templates.get(template_name)
    if template is None:
        return ToolResult(
            ok=False,
            label=f"Template {template_name or '?'} unavailable",
            error=f"Template '{template_name}' cannot run on this dataset. Available: {', '.join(templates) or 'none'}.",
        )
    try:
        basis = net_basis(df, profile)
        evidence = template.execute(basis.df, profile)
        evidence.description = basis.append_to(evidence.description)
    except Exception as e:  # a template bug must not take the conversation down
        return ToolResult(ok=False, label=f"{template.display_name} failed", error=f"Template failed: {str(e)[:200]}")
    return ToolResult(
        ok=True,
        label=f"Ran the {template.display_name} analysis",
        title=template.display_name,
        evidence=evidence,
    )


def _query_data(tool_input: dict, df: pd.DataFrame, profile: DataProfile) -> ToolResult:
    try:
        spec = QuerySpec.model_validate(tool_input)
    except ValidationError as e:
        problems = "; ".join(f"{'.'.join(str(p) for p in err['loc'])}: {err['msg']}" for err in e.errors())
        return ToolResult(ok=False, label="Query rejected", error=f"Invalid query: {problems}")
    try:
        evidence = run_query(df, profile, spec)
    except QueryError as e:
        return ToolResult(ok=False, label="Query could not run", error=str(e))

    title = evidence.description.split(". Computed")[0]
    return ToolResult(ok=True, label=f"Computed: {title}", title=title, evidence=evidence)


def evidence_for_model(evidence: Evidence) -> dict:
    """The slice of an Evidence object the model gets to read."""
    rows = evidence.data[:MAX_ROWS_TO_MODEL]
    payload: dict = {"description": evidence.description, "rows": rows}
    if len(evidence.data) > len(rows):
        payload["note"] = f"Showing the first {len(rows)} of {len(evidence.data)} rows."
    return payload


def dataset_context(profile: DataProfile, df: pd.DataFrame | None = None) -> str:
    """Column profile as text. Statistics only — never raw rows."""
    lines = [f"File: {profile.filename} ({profile.row_count:,} rows)"]
    if df is not None:
        basis = net_basis(df, profile)
        if basis.applied:
            lines.append(
                f"Revenue basis: every tool reports NET figures.{basis.note()} "
                f"To look at those orders, filter or group by {basis.status_column}; "
                f"that switches the exclusion off for that query. Say 'net revenue' "
                f"when you quote revenue, and mention the excluded amount when the "
                f"user asks about totals."
            )
    if profile.date_range:
        lines.append(f"Date range: {profile.date_range.start} to {profile.date_range.end}")
    if profile.grain:
        lines.append(f"Grain: {profile.grain}")
    lines.append("Columns:")
    for col in profile.columns:
        line = f"- {col.name} (type {col.dtype.value}, role {col.semantic_role.value})"
        s = col.stats
        if s.min is not None and s.max is not None:
            line += f", range {s.min} to {s.max}"
        # Category labels help the model write filters. Identifiers (order ids,
        # customer ids) are row-level data, so their values are never sent.
        is_identifier = col.dtype == DType.IDENTIFIER or col.semantic_role in _ID_ROLES
        if s.top_values and not is_identifier and s.unique_count <= MAX_LABEL_CARDINALITY:
            line += ", values include: " + ", ".join(v.value for v in s.top_values[:6])
        lines.append(line)
    return "\n".join(lines)
