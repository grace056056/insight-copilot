"""
analysis/registry.py
--------------------
Template registry: discovers, stores, and filters analysis templates.

This is the central coordination point for the analysis layer. It:
  1. Registers all available templates at import time
  2. Filters to only templates that can_run() against a given profile
  3. Executes runnable templates and collects Evidence objects

The registry pattern means adding a new analysis template requires:
  1. Create a new file in analysis/templates/
  2. Import and register it here

No changes to routers, services, or prompts needed. This is extensibility
by design — the same pattern used by plugin systems in tools like pytest,
Django, and Flask.

Interview talking point:
  "The template registry auto-selects analyses based on dataset capabilities.
  A dataset without a date column won't trigger time-series templates. A
  dataset without product info won't trigger product ranking. This makes
  the system adaptive to any e-commerce CSV without hardcoded assumptions."
"""

from __future__ import annotations

import logging

import pandas as pd

from analysis.base import AnalysisTemplate
from models.schemas import DataProfile, Evidence

# Import all templates so they register themselves
from analysis.templates.revenue_trend import RevenueTrendTemplate
from analysis.templates.category_comparison import CategoryComparisonTemplate
from analysis.templates.top_products import TopProductsTemplate
from analysis.templates.aov_analysis import AOVAnalysisTemplate
from analysis.templates.repeat_purchase import RepeatPurchaseTemplate

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Registry
# ---------------------------------------------------------------------------

# All available templates, instantiated once
_TEMPLATES: list[AnalysisTemplate] = [
    RevenueTrendTemplate(),
    CategoryComparisonTemplate(),
    TopProductsTemplate(),
    AOVAnalysisTemplate(),
    RepeatPurchaseTemplate(),
]


def get_all_templates() -> list[AnalysisTemplate]:
    """Return all registered templates (regardless of whether they can run)."""
    return list(_TEMPLATES)


def get_runnable_templates(profile: DataProfile) -> list[AnalysisTemplate]:
    """
    Filter templates to only those whose required roles exist in the dataset.

    This is the key adaptive behavior: the system automatically adjusts
    its analysis based on what columns are available, not based on
    hardcoded assumptions about the CSV structure.
    """
    runnable = [t for t in _TEMPLATES if t.can_run(profile)]
    logger.info(
        "Template registry: %d/%d templates can run (%s)",
        len(runnable),
        len(_TEMPLATES),
        ", ".join(t.name for t in runnable),
    )
    return runnable


def run_all(
    df: pd.DataFrame, profile: DataProfile
) -> list[dict]:
    """
    Execute all runnable templates and collect results.

    Returns a list of dicts with template metadata + Evidence for each.
    Templates that raise exceptions are logged and skipped — one failure
    shouldn't block the other analyses.

    Returns:
        List of {"template": str, "display_name": str, "evidence": Evidence}
    """
    runnable = get_runnable_templates(profile)
    results = []

    for template in runnable:
        try:
            evidence = template.execute(df, profile)
            results.append({
                "template": template.name,
                "display_name": template.display_name,
                "evidence": evidence,
            })
            logger.info("  ✓ %s produced %d data points", template.name, len(evidence.data))
        except Exception as e:
            # Don't let one template failure kill the whole pipeline
            logger.error("  ✗ %s failed: %s", template.name, e)

    return results
