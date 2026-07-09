"""
routers/insights.py
-------------------
Endpoints for the analysis and insight pipeline.

  GET  /api/templates    — list which templates can run for the current dataset
  POST /api/evidence     — run analysis templates, return raw evidence objects
  POST /api/insights     — full pipeline: evidence → narrative → Insight[]
  POST /api/update-roles — apply manual semantic role overrides to the stored profile
"""

from __future__ import annotations

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from analysis.registry import get_all_templates, get_runnable_templates, run_all
from models.schemas import Evidence, Insight, SemanticRole, UploadResponse
from routers.upload import get_current_data
from services.narrator import generate_insights

router = APIRouter(tags=["insights"])


# ---------------------------------------------------------------------------
# Role override schema
# ---------------------------------------------------------------------------

class RoleOverride(BaseModel):
    name: str
    semantic_role: str


class UpdateRolesRequest(BaseModel):
    overrides: list[RoleOverride]


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------

@router.post("/update-roles", response_model=UploadResponse)
async def update_roles(body: UpdateRolesRequest):
    """
    Apply manual semantic role overrides to the stored DataProfile.

    This enables a human-in-the-loop workflow: the system auto-detects roles,
    the user corrects any mistakes, then re-runs insights with the fixed roles.

    The override updates the stored profile in-place and also adjusts
    is_dimension / is_measure flags based on the new role.
    """
    current = get_current_data()
    profile = current.get("profile")

    if profile is None:
        raise HTTPException(
            status_code=400,
            detail="No dataset loaded. Upload a CSV or load the sample dataset first.",
        )

    # Build lookup from overrides
    override_map = {o.name: o.semantic_role for o in body.overrides}

    measure_roles = {"revenue", "quantity", "discount"}
    dimension_roles = {"customer_id", "order_id", "product", "category",
                       "date", "region", "channel", "status"}

    for col in profile.columns:
        if col.name in override_map:
            role_str = override_map[col.name]
            try:
                col.semantic_role = SemanticRole(role_str)
            except ValueError:
                col.semantic_role = SemanticRole.OTHER

            if col.semantic_role.value in measure_roles:
                col.is_measure = True
                col.is_dimension = False
            elif col.semantic_role.value in dimension_roles:
                col.is_dimension = True
                col.is_measure = False
            else:
                col.is_dimension = False
                col.is_measure = False

    # Store updated profile
    current["profile"] = profile

    return UploadResponse(profile=profile)


@router.get("/templates")
async def list_templates():
    """List all analysis templates and whether each can run on the current dataset."""
    current = get_current_data()
    profile = current.get("profile")

    all_templates = get_all_templates()
    runnable_names = set()

    if profile:
        runnable = get_runnable_templates(profile)
        runnable_names = {t.name for t in runnable}

    return {
        "total_templates": len(all_templates),
        "runnable_count": len(runnable_names),
        "has_data": profile is not None,
        "templates": [
            {
                "name": t.name,
                "display_name": t.display_name,
                "description": t.description,
                "required_roles": [r.value for r in t.required_roles],
                "optional_roles": [r.value for r in t.optional_roles],
                "output_chart": t.output_chart.value,
                "can_run": t.name in runnable_names,
            }
            for t in all_templates
        ],
    }


@router.post("/evidence")
async def compute_evidence():
    """Run all applicable analysis templates on the current dataset."""
    current = get_current_data()
    profile = current.get("profile")
    df = current.get("dataframe")

    if profile is None or df is None:
        raise HTTPException(
            status_code=400,
            detail="No dataset loaded. Upload a CSV or load the sample dataset first.",
        )

    results = run_all(df, profile)

    return {
        "template_count": len(results),
        "results": [
            {
                "template": r["template"],
                "display_name": r["display_name"],
                "evidence": r["evidence"].model_dump(),
            }
            for r in results
        ],
    }


@router.post("/insights")
async def generate_insight_report():
    """Full insight generation pipeline: evidence → narrative → Insight[]."""
    current = get_current_data()
    profile = current.get("profile")
    df = current.get("dataframe")

    if profile is None or df is None:
        raise HTTPException(
            status_code=400,
            detail="No dataset loaded. Upload a CSV or load the sample dataset first.",
        )

    evidence_results = run_all(df, profile)

    if not evidence_results:
        raise HTTPException(
            status_code=422,
            detail="No analysis templates could run on this dataset. "
                   "Check that semantic roles are properly assigned.",
        )

    insights = await generate_insights(evidence_results)

    return {
        "insight_count": len(insights),
        "insights": [ins.model_dump() for ins in insights],
    }
