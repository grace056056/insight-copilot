"""
analysis/templates/category_comparison.py
-----------------------------------------
Compares revenue, order count, and average order value across product categories.

What it answers:
  "Which categories drive the most revenue? Which are underperforming?"

What makes this useful for e-commerce:
  Category mix is one of the most actionable levers for an e-commerce business.
  If Electronics is declining while Home & Kitchen is growing, that's a signal
  to shift marketing spend. The evidence includes both totals and share
  percentages so the narrative can identify concentration risk.
"""

import pandas as pd

from analysis.base import AnalysisTemplate
from models.schemas import ChartType, DataProfile, Evidence, SemanticRole


class CategoryComparisonTemplate(AnalysisTemplate):
    name = "category_comparison"
    display_name = "Category Comparison"
    description = "Revenue and order breakdown by product category"
    required_roles = [SemanticRole.REVENUE, SemanticRole.CATEGORY]
    optional_roles = [SemanticRole.QUANTITY]
    output_chart = ChartType.BAR

    def execute(self, df: pd.DataFrame, profile: DataProfile) -> Evidence:
        rev_col = self.get_column(profile, SemanticRole.REVENUE)
        cat_col = self.get_column(profile, SemanticRole.CATEGORY)
        qty_col = self.get_column(profile, SemanticRole.QUANTITY)

        # Aggregate by category — use named aggregation for clean column names
        grouped = df.groupby(cat_col).agg(
            total_revenue=(rev_col, "sum"),
            avg_order_value=(rev_col, "mean"),
            order_count=(rev_col, "count"),
        ).reset_index()

        if qty_col:
            qty_agg = df.groupby(cat_col)[qty_col].sum().reset_index()
            qty_agg.columns = [cat_col, "total_quantity"]
            grouped = grouped.merge(qty_agg, on=cat_col)
        else:
            grouped["total_quantity"] = None

        # Calculate revenue share
        total_rev = grouped["total_revenue"].sum()
        grouped["revenue_share_pct"] = (
            (grouped["total_revenue"] / total_rev * 100).round(1)
        )

        # Sort by revenue descending
        grouped = grouped.sort_values("total_revenue", ascending=False)

        # Round for clean output
        grouped["total_revenue"] = grouped["total_revenue"].round(2)
        grouped["avg_order_value"] = grouped["avg_order_value"].round(2)

        # Find the lowest-performing category for highlighting
        worst_category = grouped.iloc[-1][cat_col] if len(grouped) > 1 else None

        data = []
        for _, row in grouped.iterrows():
            entry = {
                "category": row[cat_col],
                "total_revenue": float(row["total_revenue"]),
                "order_count": int(row["order_count"]),
                "avg_order_value": float(row["avg_order_value"]),
                "revenue_share_pct": float(row["revenue_share_pct"]),
            }
            if row["total_quantity"] is not None:
                entry["total_quantity"] = int(row["total_quantity"])
            data.append(entry)

        return Evidence(
            template_used=self.name,
            description=(
                f"Revenue, order count, and average order value grouped by {cat_col}, "
                f"with revenue share percentages"
            ),
            data=data,
            chart_type=self.output_chart,
            x_key="category",
            y_key="total_revenue",
            highlight=worst_category,
        )
