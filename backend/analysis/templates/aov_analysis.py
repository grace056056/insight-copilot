"""
analysis/templates/aov_analysis.py
----------------------------------
Analyzes Average Order Value (AOV) trends over time and distribution.

What it answers:
  "What's the average order value? Is it trending up or down?
  What does the distribution of order sizes look like?"

Why AOV matters:
  AOV is one of the three levers of e-commerce revenue
  (Revenue = Traffic × Conversion Rate × AOV). Tracking whether AOV
  is growing or shrinking tells you about pricing power, upselling
  effectiveness, and product mix shifts.

This template computes AOV at the order level (not line-item level),
which requires grouping by order_id first — a subtlety that shows
you understand data granularity.
"""

import pandas as pd
import numpy as np

from analysis.base import AnalysisTemplate
from models.schemas import ChartType, DataProfile, Evidence, SemanticRole


class AOVAnalysisTemplate(AnalysisTemplate):
    name = "aov_analysis"
    display_name = "Average Order Value"
    description = "AOV trends over time and order size distribution"
    required_roles = [SemanticRole.REVENUE, SemanticRole.ORDER_ID]
    optional_roles = [SemanticRole.DATE]
    output_chart = ChartType.LINE

    def execute(self, df: pd.DataFrame, profile: DataProfile) -> Evidence:
        rev_col = self.get_column(profile, SemanticRole.REVENUE)
        order_col = self.get_column(profile, SemanticRole.ORDER_ID)
        date_col = self.get_column(profile, SemanticRole.DATE)

        # --- Step 1: Aggregate to order level ---
        # Each order may have multiple line items. Sum revenue per order
        # to get the true order total before computing AOV.
        order_totals = df.groupby(order_col).agg(
            order_revenue=(rev_col, "sum"),
        ).reset_index()

        # Overall AOV stats
        overall_aov = round(float(order_totals["order_revenue"].mean()), 2)
        median_aov = round(float(order_totals["order_revenue"].median()), 2)
        total_orders = len(order_totals)

        # --- Step 2: AOV distribution (bucketed) ---
        # Create sensible buckets based on the data range
        max_val = order_totals["order_revenue"].max()
        if max_val <= 50:
            bins = [0, 10, 20, 30, 40, 50, float("inf")]
            labels = ["$0-10", "$10-20", "$20-30", "$30-40", "$40-50", "$50+"]
        elif max_val <= 200:
            bins = [0, 25, 50, 75, 100, 150, 200, float("inf")]
            labels = ["$0-25", "$25-50", "$50-75", "$75-100", "$100-150", "$150-200", "$200+"]
        else:
            bins = [0, 50, 100, 150, 200, 300, 500, float("inf")]
            labels = ["$0-50", "$50-100", "$100-150", "$150-200", "$200-300", "$300-500", "$500+"]

        order_totals["bucket"] = pd.cut(
            order_totals["order_revenue"], bins=bins, labels=labels, right=False
        )
        distribution = order_totals["bucket"].value_counts().sort_index()

        # --- Step 3: Monthly AOV trend (if date column exists) ---
        monthly_data = []
        if date_col:
            # Get the first date per order (in case of multi-line orders)
            order_dates = df.groupby(order_col)[date_col].first().reset_index()
            order_dates[date_col] = pd.to_datetime(order_dates[date_col], errors="coerce")

            orders_with_dates = order_totals.merge(order_dates, on=order_col)
            orders_with_dates["month"] = orders_with_dates[date_col].dt.to_period("M")

            monthly_aov = (
                orders_with_dates.groupby("month")["order_revenue"]
                .mean()
                .reset_index()
            )
            monthly_aov["month_str"] = monthly_aov["month"].astype(str)
            monthly_aov["order_revenue"] = monthly_aov["order_revenue"].round(2)

            for _, row in monthly_aov.iterrows():
                monthly_data.append({
                    "month": row["month_str"],
                    "aov": float(row["order_revenue"]),
                })

        # --- Build evidence data ---
        data = []

        # Summary entry
        data.append({
            "type": "summary",
            "overall_aov": overall_aov,
            "median_aov": median_aov,
            "total_orders": total_orders,
        })

        # Distribution entries
        for bucket, count in distribution.items():
            data.append({
                "type": "distribution",
                "bucket": str(bucket),
                "order_count": int(count),
                "percentage": round(count / total_orders * 100, 1),
            })

        # Monthly trend entries
        for entry in monthly_data:
            data.append({
                "type": "trend",
                **entry,
            })

        # Determine chart type based on what's available
        chart_type = ChartType.LINE if monthly_data else ChartType.BAR

        return Evidence(
            template_used=self.name,
            description=(
                f"Average order value analysis across {total_orders:,} orders. "
                f"Overall AOV: ${overall_aov}, Median: ${median_aov}. "
                f"Orders aggregated from line items using {order_col} before computing AOV"
            ),
            data=data,
            chart_type=chart_type,
            x_key="month" if monthly_data else "bucket",
            y_key="aov" if monthly_data else "order_count",
            highlight=None,
        )
