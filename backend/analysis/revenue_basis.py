"""
analysis/revenue_basis.py
-------------------------
One definition of "revenue" for the whole app: NET revenue.

An order that was cancelled or refunded is money the store did not keep, so
it must not be counted as revenue. This follows how the industry reports it:

  * Shopify:  net sales = gross sales - discounts - sales reversals
              (reversals include cancellations and refunds)
  * Etsy:     Shop Stats revenue leaves out fully refunded and cancelled orders
  * ASC 606:  revenue is recognised only for goods not expected to be returned

The excluded amount is never hidden. Every piece of evidence says how many
orders were left out and what they were worth, so the gross figure can always
be reconstructed.

If the dataset has no status column, or none of its values look like a
reversal, nothing is excluded and the numbers are simply totals.

Interview talking point:
  "My first version summed every row, which overstated revenue by a third
  because cancelled and refunded orders were included. I moved the definition
  of revenue into one module so every chart, insight and agent answer uses
  the same net basis, and each one states what it excluded."
"""

from __future__ import annotations

from dataclasses import dataclass, field

import pandas as pd

from models.schemas import DataProfile, SemanticRole

# Matched as substrings of the lower-cased status value.
REVERSAL_KEYWORDS = (
    "cancel", "refund", "return", "void", "chargeback", "charged back",
    "failed", "declin", "reject",
    "取消", "退款", "退货", "退回",
)
MAX_STATUS_VALUES = 30  # a real status column has a handful of values


@dataclass
class RevenueBasis:
    df: pd.DataFrame                    # rows that count as revenue
    status_column: str | None = None
    excluded_statuses: list[str] = field(default_factory=list)
    excluded_rows: int = 0
    excluded_revenue: float | None = None

    @property
    def applied(self) -> bool:
        return self.excluded_rows > 0

    def note(self) -> str:
        """Sentence appended to evidence descriptions."""
        if not self.applied:
            return ""
        text = (
            f" Net basis: {self.excluded_rows:,} orders with {self.status_column} "
            f"{' or '.join(self.excluded_statuses)} are excluded"
        )
        if self.excluded_revenue is not None:
            text += f" (${self.excluded_revenue:,.2f} of gross revenue)"
        return text + "."

    def append_to(self, description: str) -> str:
        if not self.applied:
            return description
        description = description.rstrip()
        return description + ("" if description.endswith(".") else ".") + self.note()


def net_basis(df: pd.DataFrame, profile: DataProfile) -> RevenueBasis:
    status_col = next(
        (c.name for c in profile.columns
         if c.semantic_role == SemanticRole.STATUS and c.name in df.columns),
        None,
    )
    if status_col is None or not isinstance(df[status_col], pd.Series):
        return RevenueBasis(df=df)

    values = df[status_col].dropna().astype(str)
    labels = sorted(values.unique())
    if len(labels) > MAX_STATUS_VALUES:
        return RevenueBasis(df=df)

    reversed_labels = [v for v in labels if any(k in v.lower() for k in REVERSAL_KEYWORDS)]
    # If every status looks like a reversal the keyword guess is wrong for
    # this dataset; excluding everything would be worse than excluding nothing.
    if not reversed_labels or len(reversed_labels) == len(labels):
        return RevenueBasis(df=df)

    mask = df[status_col].astype(str).isin(reversed_labels)
    excluded_revenue = None
    revenue_col = next(
        (c.name for c in profile.columns
         if c.semantic_role == SemanticRole.REVENUE and c.name in df.columns),
        None,
    )
    if revenue_col is not None and isinstance(df[revenue_col], pd.Series):
        amounts = pd.to_numeric(df.loc[mask, revenue_col], errors="coerce")
        if amounts.notna().any():
            excluded_revenue = round(float(amounts.sum()), 2)

    return RevenueBasis(
        df=df[~mask],
        status_column=status_col,
        excluded_statuses=reversed_labels,
        excluded_rows=int(mask.sum()),
        excluded_revenue=excluded_revenue,
    )
