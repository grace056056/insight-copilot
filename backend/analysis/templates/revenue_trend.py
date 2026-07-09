"""
analysis/templates/revenue_trend.py
-----------------------------------
Computes monthly revenue over time with month-over-month growth rates.

What it answers:
  "How is revenue changing over time? Is the business growing or declining?"

What the user sees:
  A line chart showing monthly revenue, with the best and worst months
  highlighted. The evidence data includes growth rates so the narrative
  synthesizer (Day 4) can say things like "Revenue peaked in March at
  $28,400 (+12% MoM) before declining 8% in April."

Why this is computed in pandas, not by the LLM:
  Growth rate calculation requires exact division across adjacent time
  periods. An LLM might round incorrectly, confuse MoM with YoY, or
  simply hallucinate a percentage. Pandas guarantees the math is right.
"""

import pandas as pd

from analysis.base import AnalysisTemplate
from models.schemas import ChartType, DataProfile, Evidence, SemanticRole


class RevenueTrendTemplate(AnalysisTemplate):
    name = "revenue_trend"
    display_name = "Revenue Trend"
    description = "Monthly revenue over time with growth rates"
    required_roles = [SemanticRole.REVENUE, SemanticRole.DATE]
    optional_roles = []
    output_chart = ChartType.LINE

    def execute(self, df: pd.DataFrame, profile: DataProfile) -> Evidence:
        rev_col = self.get_column(profile, SemanticRole.REVENUE)
        date_col = self.get_column(profile, SemanticRole.DATE)

        # Parse dates and aggregate to monthly
        work = df[[date_col, rev_col]].copy()
        work[date_col] = pd.to_datetime(work[date_col], errors="coerce")
        work = work.dropna(subset=[date_col])
        work["month"] = work[date_col].dt.to_period("M")

        monthly = (
            work.groupby("month")[rev_col]
            .sum()
            .reset_index()
        )
        monthly["month_str"] = monthly["month"].astype(str)
        monthly[rev_col] = monthly[rev_col].round(2)

        # Compute month-over-month growth rate
        monthly["prev_revenue"] = monthly[rev_col].shift(1)
        monthly["growth_pct"] = (
            ((monthly[rev_col] - monthly["prev_revenue"]) / monthly["prev_revenue"] * 100)
            .round(1)
        )

        # Find the best and worst months for highlighting
        if len(monthly) > 1:
            best_idx = monthly[rev_col].idxmax()
            best_month = monthly.loc[best_idx, "month_str"]
        else:
            best_month = None

        # Build the evidence data
        data = []
        for _, row in monthly.iterrows():
            data.append({
                "month": row["month_str"],
                "revenue": float(row[rev_col]),
                "growth_pct": float(row["growth_pct"]) if pd.notna(row["growth_pct"]) else None,
            })

        return Evidence(
            template_used=self.name,
            description=(
                f"Monthly revenue aggregation from {date_col}, "
                f"summing {rev_col} per calendar month with MoM growth rates"
            ),
            data=data,
            chart_type=self.output_chart,
            x_key="month",
            y_key="revenue",
            highlight=best_month,
        )
