"""
analysis/templates/top_products.py
----------------------------------
Ranks products by total revenue and identifies the top performers
and the long-tail distribution.

What it answers:
  "Which products generate the most revenue? Is revenue concentrated
  in a few products or spread across many?"

Business context:
  Most e-commerce businesses follow a Pareto-like distribution: ~20% of
  products drive ~80% of revenue. This template quantifies that concentration,
  which is useful for inventory, marketing, and product strategy decisions.
"""

import pandas as pd

from analysis.base import AnalysisTemplate
from models.schemas import ChartType, DataProfile, Evidence, SemanticRole


class TopProductsTemplate(AnalysisTemplate):
    name = "top_products"
    display_name = "Top Products"
    description = "Product ranking by total revenue with concentration analysis"
    required_roles = [SemanticRole.REVENUE, SemanticRole.PRODUCT]
    optional_roles = [SemanticRole.QUANTITY]
    output_chart = ChartType.HORIZONTAL_BAR

    def execute(self, df: pd.DataFrame, profile: DataProfile) -> Evidence:
        rev_col = self.get_column(profile, SemanticRole.REVENUE)
        prod_col = self.get_column(profile, SemanticRole.PRODUCT)
        qty_col = self.get_column(profile, SemanticRole.QUANTITY)

        # Aggregate by product
        grouped = df.groupby(prod_col).agg(
            total_revenue=(rev_col, "sum"),
            order_count=(rev_col, "count"),
            avg_price=(rev_col, "mean"),
        ).reset_index()

        if qty_col:
            qty_agg = df.groupby(prod_col)[qty_col].sum().reset_index()
            qty_agg.columns = [prod_col, "total_quantity"]
            grouped = grouped.merge(qty_agg, on=prod_col)

        # Sort by revenue and calculate cumulative share
        grouped = grouped.sort_values("total_revenue", ascending=False).reset_index(drop=True)
        total_rev = grouped["total_revenue"].sum()
        grouped["revenue_share_pct"] = (grouped["total_revenue"] / total_rev * 100).round(1)
        grouped["cumulative_share_pct"] = grouped["revenue_share_pct"].cumsum().round(1)

        # Round
        grouped["total_revenue"] = grouped["total_revenue"].round(2)
        grouped["avg_price"] = grouped["avg_price"].round(2)

        # How many products make up 80% of revenue?
        products_for_80 = len(grouped[grouped["cumulative_share_pct"] <= 80]) + 1
        total_products = len(grouped)

        # Top 10 for the chart (full list would be too long)
        top_n = min(10, len(grouped))
        top = grouped.head(top_n)

        data = []
        for _, row in top.iterrows():
            entry = {
                "product": row[prod_col],
                "total_revenue": float(row["total_revenue"]),
                "order_count": int(row["order_count"]),
                "avg_price": float(row["avg_price"]),
                "revenue_share_pct": float(row["revenue_share_pct"]),
                "cumulative_share_pct": float(row["cumulative_share_pct"]),
            }
            if qty_col:
                entry["total_quantity"] = int(row["total_quantity"])
            data.append(entry)

        # Append a summary row with concentration metrics
        data.append({
            "product": "_summary",
            "total_products": total_products,
            "products_for_80_pct": products_for_80,
            "concentration_ratio": round(products_for_80 / total_products * 100, 1),
        })

        return Evidence(
            template_used=self.name,
            description=(
                f"Top {top_n} products by revenue out of {total_products} total. "
                f"{products_for_80} products account for 80% of revenue "
                f"({round(products_for_80/total_products*100)}% of catalog)"
            ),
            data=data,
            chart_type=self.output_chart,
            x_key="product",
            y_key="total_revenue",
            highlight=top.iloc[0][prod_col] if len(top) > 0 else None,
        )
