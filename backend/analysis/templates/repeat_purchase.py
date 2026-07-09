"""
analysis/templates/repeat_purchase.py
-------------------------------------
Analyzes customer repeat purchase behavior and retention.

What it answers:
  "What percentage of customers buy more than once? How does repeat
  buyer revenue compare to one-time buyers? What's the purchase
  frequency distribution?"

Why this matters for e-commerce:
  Customer acquisition cost (CAC) is typically 5-7x higher than retention
  cost. If 70% of customers never return, that's a retention problem.
  If repeat buyers generate 40% of revenue from 15% of customers, that's
  a concentration risk AND an opportunity to invest in loyalty.

  This is the kind of analysis that separates a data-literate analyst from
  someone who just makes charts. Recruiters at companies like Palantir
  and Databricks notice this level of business context in your work.
"""

import pandas as pd

from analysis.base import AnalysisTemplate
from models.schemas import ChartType, DataProfile, Evidence, SemanticRole


class RepeatPurchaseTemplate(AnalysisTemplate):
    name = "repeat_purchase"
    display_name = "Repeat Purchase Analysis"
    description = "Customer retention metrics and repeat buying behavior"
    required_roles = [SemanticRole.CUSTOMER_ID, SemanticRole.DATE, SemanticRole.REVENUE]
    optional_roles = [SemanticRole.ORDER_ID]
    output_chart = ChartType.BAR

    def execute(self, df: pd.DataFrame, profile: DataProfile) -> Evidence:
        cust_col = self.get_column(profile, SemanticRole.CUSTOMER_ID)
        date_col = self.get_column(profile, SemanticRole.DATE)
        rev_col = self.get_column(profile, SemanticRole.REVENUE)
        order_col = self.get_column(profile, SemanticRole.ORDER_ID)

        work = df[[cust_col, date_col, rev_col]].copy()
        if order_col:
            work[order_col] = df[order_col]
        work[date_col] = pd.to_datetime(work[date_col], errors="coerce")
        work = work.dropna(subset=[date_col])

        # --- Step 1: Customer-level aggregation ---
        if order_col:
            # Count distinct orders per customer (more accurate than row count)
            cust_stats = work.groupby(cust_col).agg(
                purchase_count=(order_col, "nunique"),
                total_spent=(rev_col, "sum"),
                first_purchase=(date_col, "min"),
                last_purchase=(date_col, "max"),
            ).reset_index()
        else:
            # Fallback: use row count as proxy for purchase count
            cust_stats = work.groupby(cust_col).agg(
                purchase_count=(rev_col, "count"),
                total_spent=(rev_col, "sum"),
                first_purchase=(date_col, "min"),
                last_purchase=(date_col, "max"),
            ).reset_index()

        total_customers = len(cust_stats)

        # --- Step 2: Segment into one-time vs repeat ---
        one_time = cust_stats[cust_stats["purchase_count"] == 1]
        repeat = cust_stats[cust_stats["purchase_count"] > 1]

        one_time_count = len(one_time)
        repeat_count = len(repeat)
        repeat_rate = round(repeat_count / total_customers * 100, 1) if total_customers > 0 else 0

        one_time_revenue = round(float(one_time["total_spent"].sum()), 2)
        repeat_revenue = round(float(repeat["total_spent"].sum()), 2)
        total_revenue = one_time_revenue + repeat_revenue

        repeat_revenue_share = (
            round(repeat_revenue / total_revenue * 100, 1) if total_revenue > 0 else 0
        )

        # Average spend per segment
        avg_spend_one_time = round(float(one_time["total_spent"].mean()), 2) if one_time_count > 0 else 0
        avg_spend_repeat = round(float(repeat["total_spent"].mean()), 2) if repeat_count > 0 else 0

        # --- Step 3: Purchase frequency distribution ---
        freq_dist = (
            cust_stats["purchase_count"]
            .value_counts()
            .sort_index()
            .head(8)  # Cap at 8 buckets
        )

        # --- Build evidence data ---
        data = []

        # Summary metrics
        data.append({
            "type": "summary",
            "total_customers": total_customers,
            "one_time_customers": one_time_count,
            "repeat_customers": repeat_count,
            "repeat_rate_pct": repeat_rate,
            "one_time_revenue": one_time_revenue,
            "repeat_revenue": repeat_revenue,
            "repeat_revenue_share_pct": repeat_revenue_share,
            "avg_spend_one_time": avg_spend_one_time,
            "avg_spend_repeat": avg_spend_repeat,
            "spend_multiplier": round(avg_spend_repeat / avg_spend_one_time, 1) if avg_spend_one_time > 0 else 0,
        })

        # Segment comparison (for bar chart)
        data.append({
            "type": "segment",
            "segment": "One-time buyers",
            "customers": one_time_count,
            "revenue": one_time_revenue,
            "avg_spend": avg_spend_one_time,
        })
        data.append({
            "type": "segment",
            "segment": "Repeat buyers",
            "customers": repeat_count,
            "revenue": repeat_revenue,
            "avg_spend": avg_spend_repeat,
        })

        # Frequency distribution
        for purchase_count, customer_count in freq_dist.items():
            label = f"{purchase_count}x" if purchase_count < 8 else "8x+"
            data.append({
                "type": "frequency",
                "purchases": label,
                "customer_count": int(customer_count),
            })

        return Evidence(
            template_used=self.name,
            description=(
                f"Repeat purchase analysis across {total_customers:,} customers. "
                f"{repeat_rate}% are repeat buyers, generating "
                f"{repeat_revenue_share}% of total revenue. "
                f"Repeat buyers spend {round(avg_spend_repeat / avg_spend_one_time, 1) if avg_spend_one_time > 0 else 'N/A'}x "
                f"more than one-time buyers on average"
            ),
            data=data,
            chart_type=self.output_chart,
            x_key="segment",
            y_key="revenue",
            highlight="Repeat buyers" if repeat_revenue_share > 30 else "One-time buyers",
        )
