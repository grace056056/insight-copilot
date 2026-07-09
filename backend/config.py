"""
config.py
---------
Central configuration for the Insight Copilot backend.
Loads environment variables and defines app-wide constants.

Usage:
    from config import settings
    print(settings.ANTHROPIC_API_KEY)
"""

import os
from dotenv import load_dotenv

load_dotenv()


class Settings:
    """App settings loaded from environment variables with sensible defaults."""

    # --- API Keys ---
    ANTHROPIC_API_KEY: str = os.getenv("ANTHROPIC_API_KEY", "")
    ANTHROPIC_MODEL: str = "claude-sonnet-4-6"

    # --- Server ---
    CORS_ORIGINS: list[str] = [
        "http://localhost:5173",   # Vite dev server default
        "http://localhost:3000",   # Common React dev port
    ]

    # --- Upload Limits ---
    MAX_FILE_SIZE_MB: int = 50
    MAX_ROWS_FOR_PROFILING: int = 100_000  # Profile first N rows for performance
    SAMPLE_ROWS_FOR_LLM: int = 30          # Rows sent to Claude for semantic profiling

    # --- Analysis ---
    MAX_INSIGHTS: int = 7                  # Number of insights to generate per run


settings = Settings()
