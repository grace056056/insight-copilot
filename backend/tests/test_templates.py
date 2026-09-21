"""Analysis templates and registry: numbers must match an independent pandas computation."""

import pandas as pd
import pytest

from analysis.registry import get_all_templates, get_runnable_templates, run_all
from models.schemas import SemanticRole


def test_five_templates_registered():
    names = {t.name for t in get_all_templates()}
    assert names == {
        "revenue_trend", "category_comparison", "top_products", "aov_analysis", "repeat_purchase",
    }


def test_all_templates_run_on_sample(sample_profiled):
    profile, df = sample_profiled
    results = run_all(df, profile)
    assert {r["template"] for r in results} == {t.name for t in get_all_templates()}
    for r in results:
        assert r["evidence"].template_used == r["template"]
        assert len(r["evidence"].data) > 0


def test_registry_skips_templates_missing_required_roles(sample_profiled):
    profile, _ = sample_profiled
    no_date = profile.model_copy(deep=True)
    for col in no_date.columns:
        if col.semantic_role == SemanticRole.DATE:
            col.semantic_role = SemanticRole.OTHER
    runnable = {t.name for t in get_runnable_templates(no_date)}
    assert "revenue_trend" not in runnable


def test_revenue_trend_matches_pandas(sample_profiled):
    profile, df = sample_profiled
    (result,) = [r for r in run_all(df, profile) if r["template"] == "revenue_trend"]
    data = result["evidence"].data

    expected = (
        df.assign(month=pd.to_datetime(df["order_date"]).dt.to_period("M").astype(str))
        .groupby("month")["total_amount"].sum().round(2)
    )
    assert [d["month"] for d in data] == list(expected.index)
    for d in data:
        assert d["revenue"] == pytest.approx(expected[d["month"]], abs=0.01)

    # Month-over-month growth is computed from adjacent months
    assert data[0]["growth_pct"] is None
    prev, cur = data[0]["revenue"], data[1]["revenue"]
    assert data[1]["growth_pct"] == pytest.approx(round((cur - prev) / prev * 100, 1), abs=0.1)


def test_one_failing_template_does_not_break_the_rest(sample_profiled, monkeypatch):
    profile, df = sample_profiled
    from analysis.templates.top_products import TopProductsTemplate

    def boom(self, df, profile):
        raise RuntimeError("simulated failure")

    monkeypatch.setattr(TopProductsTemplate, "execute", boom)
    names = {r["template"] for r in run_all(df, profile)}
    assert "top_products" not in names
    assert "revenue_trend" in names
