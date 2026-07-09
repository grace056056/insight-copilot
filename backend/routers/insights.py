"""
routers/insights.py
-------------------
Endpoints for the analysis and insight pipeline.

  GET  /api/templates  — list which templates can run for the current dataset
  POST /api/evidence   — run analysis templates, return raw evidence objects
  POST /api/insights   — full pipeline: evidence → narrative → Insight[]

These endpoints exist separately from the upload router because they
represent a different concern: upload handles data ingestion, insights
handles data analysis.
"""

from __future__ import annotations

from fastapi import APIRouter, HTTPException

from analysis.registry import get_all_templates, get_runnable_templates, run_all
from models.schemas import Evidence, Insight
from routers.upload import get_current_data
from services.narrator import generate_insights

router = APIRouter(tags=["insights"])


@router.get("/templates")
async def list_templates():
    """
    List all analysis templates and whether each can run on the current dataset.

    This endpoint is useful for:
      - Debugging: verify semantic roles map to the right templates
      - Frontend: show which analyses are available before running them
      - Demo: recruiters can see the registry pattern in action

    Returns:
        List of templates with name, description, required roles, and run status.
    """
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
    """
    Run all applicable analysis templates on the current dataset.

    This is the deterministic computation layer. Each template:
      1. Checks if the dataset has the required semantic roles
      2. Runs pandas computations on the actual data
      3. Returns a structured Evidence object with the results

    No LLM is involved. Every number in the output is computed by pandas
    and is guaranteed to be correct.

    Returns:
        List of evidence objects, one per runnable template.
    """
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
    """
    Full insight generation pipeline: evidence → narrative → Insight[].

    This is the primary endpoint for the Insight Copilot product.
    It orchestrates the complete pipeline:
      1. Run all applicable analysis templates (deterministic, pandas)
      2. Pass evidence objects to the narrator (Claude or mock)
      3. Return structured Insight objects, each linked to its evidence

    Every numerical claim in the insights is traceable back to a specific
    pandas computation. The LLM writes narratives; it does not compute.

    Returns:
        List of Insight objects sorted by priority (high → medium → low),
        each containing the finding, recommendation, and linked evidence.
    """
    current = get_current_data()
    profile = current.get("profile")
    df = current.get("dataframe")

    if profile is None or df is None:
        raise HTTPException(
            status_code=400,
            detail="No dataset loaded. Upload a CSV or load the sample dataset first.",
        )

    # Stage 1: Run deterministic analysis templates
    evidence_results = run_all(df, profile)

    if not evidence_results:
        raise HTTPException(
            status_code=422,
            detail="No analysis templates could run on this dataset. "
                   "Check that semantic roles are properly assigned.",
        )

    # Stage 2: Generate narrative insights from evidence
    insights = await generate_insights(evidence_results)

    return {
        "insight_count": len(insights),
        "insights": [ins.model_dump() for ins in insights],
    }
