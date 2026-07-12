"""
routers/upload.py
-----------------
Handles file upload and triggers the two-stage data profiling pipeline.

Endpoint:
  POST /api/upload  — accepts a CSV file, returns a DataProfile
  GET  /api/sample-dataset — loads the built-in demo dataset

Pipeline (two stages):
  Stage 1 — Deterministic profiler (pandas): dtype detection, statistics,
            date range, health flags. Guarantees numerical accuracy.
  Stage 2 — Semantic profiler (Claude): classifies columns into business
            roles (revenue, customer_id, category, etc.) using the statistical
            profile, NOT raw data. Adds grain and dataset summary.

Design decision:
  The router is intentionally thin. It validates the request, calls the
  profiler services, and returns the result. Business logic lives in services/.
  This separation makes the codebase testable and keeps routing concerns
  separate from data processing.
"""

from __future__ import annotations

from fastapi import APIRouter, File, HTTPException, UploadFile

from config import settings
from models.schemas import DataProfile, UploadResponse
from services.profiler import UnparsableTableError, profile_csv
from services.semantic import classify_columns

router = APIRouter(tags=["upload"])

# In-memory storage for the current session's data.
# In production you'd use a database or object store — for a portfolio MVP,
# module-level state is the right tradeoff.
_current_data: dict = {
    "profile": None,    # DataProfile
    "dataframe": None,  # pandas DataFrame (used by analysis templates)
}


def get_current_data() -> dict:
    """Access the current session's data from other modules."""
    return _current_data


@router.post("/upload", response_model=UploadResponse)
async def upload_file(file: UploadFile = File(...)):
    """
    Upload a CSV file and receive a structured data profile.

    The profiling pipeline:
      1. Validate file type and size
      2. Parse CSV with pandas
      3. Run deterministic profiler (dtype detection, stats, health flags)
      4. [Day 2] Run semantic profiler (LLM column classification)
      5. Return the complete DataProfile

    Returns:
        UploadResponse containing the DataProfile.
    """
    # --- Validate file type ---
    if not file.filename:
        raise HTTPException(status_code=400, detail="No filename provided")

    allowed_extensions = (".csv", ".tsv", ".xlsx")
    if not file.filename.lower().endswith(allowed_extensions):
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file type. Accepted formats: {', '.join(allowed_extensions)}",
        )

    # --- Read file content ---
    content = await file.read()

    # --- Validate file size ---
    size_mb = len(content) / (1024 * 1024)
    if size_mb > settings.MAX_FILE_SIZE_MB:
        raise HTTPException(
            status_code=400,
            detail=f"File too large ({size_mb:.1f} MB). Maximum: {settings.MAX_FILE_SIZE_MB} MB",
        )

    if len(content) == 0:
        raise HTTPException(status_code=400, detail="File is empty")

    # --- Run deterministic profiler ---
    try:
        profile, df = profile_csv(content, file.filename)
    except UnparsableTableError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(
            status_code=422,
            detail=f"Failed to parse CSV: {str(e)}",
        )

    # --- Stage 2: Semantic profiling (LLM) ---
    # Sends the statistical profile (not raw data) to Claude for
    # column classification into business roles.
    # If the API key is missing or the LLM fails, columns keep role="other"
    # and the pipeline continues gracefully.
    profile = await classify_columns(profile)

    # --- Store for downstream use ---
    _current_data["profile"] = profile
    _current_data["dataframe"] = df

    return UploadResponse(profile=profile)


@router.get("/sample-dataset")
async def get_sample_dataset():
    """
    Load the built-in sample e-commerce dataset.

    This endpoint lets recruiters demo the app without uploading their own CSV.
    It reads the sample CSV, runs the profiler, and returns the profile
    exactly as if the user had uploaded it.
    """
    import os

    sample_path = os.path.join(
        os.path.dirname(os.path.dirname(__file__)),
        "data",
        "sample_ecommerce.csv",
    )

    if not os.path.exists(sample_path):
        raise HTTPException(status_code=404, detail="Sample dataset not found")

    with open(sample_path, "rb") as f:
        content = f.read()

    profile, df = profile_csv(content, "sample_ecommerce.csv")

    # Stage 2: Semantic profiling
    profile = await classify_columns(profile)

    _current_data["profile"] = profile
    _current_data["dataframe"] = df

    return UploadResponse(profile=profile)
