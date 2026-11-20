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
    "http://localhost:5173",
    "https://insight-copilot-eta.vercel.app",
]

    # --- Upload Limits ---
    MAX_FILE_SIZE_MB: int = 50
    MAX_ROWS_FOR_PROFILING: int = 100_000  # Profile first N rows for performance
    SAMPLE_ROWS_FOR_LLM: int = 30          # Rows sent to Claude for semantic profiling

    # --- Analysis ---
    MAX_INSIGHTS: int = 7                  # Number of insights to generate per run

    # --- Coach (conversational agent) ---
    COACH_MAX_STEPS: int = 6               # Max model calls per question (tool calls + final answer)
    COACH_MAX_TOKENS: int = 900            # Max tokens per model call
    COACH_MAX_QUESTION_CHARS: int = 500
    COACH_RATE_LIMIT_PER_HOUR: int = int(os.getenv("COACH_RATE_LIMIT_PER_HOUR", "30"))


settings = Settings()
