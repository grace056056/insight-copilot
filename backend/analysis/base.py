"""
analysis/base.py
----------------
Abstract base class for analysis templates.

This implements the Strategy Pattern: each template is a self-contained
analysis unit that declares what data it needs and produces a standardized
Evidence object. The registry (registry.py) selects which templates to run
based on the dataset's semantic profile.

Why templates instead of letting the LLM compute everything?

  1. NUMERICAL ACCURACY — Templates use pandas. The numbers are exact.
     An LLM might say "revenue grew 23%" when it actually grew 18%.
     Templates guarantee the 18% is correct.

  2. REPRODUCIBILITY — Run the same template on the same data twice,
     you get the same result. LLMs are non-deterministic by nature.

  3. AUDITABILITY — Each Evidence object traces back to a specific
     template + computation. Users can verify the claim.

  4. EXTENSIBILITY — Adding a new analysis type means adding one file.
     No existing code changes. No prompt modifications.

Interview talking point:
  "I used the Strategy Pattern for analysis templates. Each template
  declares its required semantic roles and produces a standardized
  Evidence object. The registry auto-selects which templates can run
  based on the dataset's column classifications. Adding a new analysis
  is a single file — no existing code needs to change."
"""

from __future__ import annotations

from abc import ABC, abstractmethod

import pandas as pd

from models.schemas import ChartType, DataProfile, Evidence, SemanticRole


class AnalysisTemplate(ABC):
    """
    Base class for all analysis templates.

    Subclasses must define:
      - name:           unique identifier (e.g. "revenue_trend")
      - display_name:   human-readable label (e.g. "Revenue Trend Analysis")
      - description:    what this template computes
      - required_roles: semantic roles the dataset MUST have
      - optional_roles: semantic roles that enhance the analysis if present
      - output_chart:   default chart type for the evidence visualization

    Subclasses must implement:
      - execute(df, profile) → Evidence
    """

    # --- Subclasses must set these ---
    name: str = ""
    display_name: str = ""
    description: str = ""
    required_roles: list[SemanticRole] = []
    optional_roles: list[SemanticRole] = []
    output_chart: ChartType = ChartType.BAR

    def can_run(self, profile: DataProfile) -> bool:
        """
        Check if this template can run against the given dataset.

        Returns True only if every required semantic role exists in the
        dataset's column profiles. This is how the registry filters
        templates — a dataset without a "date" column won't trigger
        time-series templates.
        """
        available_roles = {col.semantic_role for col in profile.columns}
        return all(role in available_roles for role in self.required_roles)

    def get_column(self, profile: DataProfile, role: SemanticRole) -> str | None:
        """
        Find the column name for a given semantic role.

        This is the bridge between semantic classification and pandas
        computation. The template says "I need the revenue column" and
        this method returns "total_amount" (or whatever the column is
        actually named in this dataset).
        """
        for col in profile.columns:
            if col.semantic_role == role:
                return col.name
        return None

    @abstractmethod
    def execute(self, df: pd.DataFrame, profile: DataProfile) -> Evidence:
        """
        Run the analysis and return an Evidence object.

        This is where the actual pandas computation happens. Each template
        implements this differently, but they all return the same Evidence
        structure — that's what makes the system composable.

        Args:
            df: The full dataset as a pandas DataFrame.
            profile: The DataProfile with semantic column classifications.

        Returns:
            Evidence object with computed data, chart metadata, and description.
        """
        ...
