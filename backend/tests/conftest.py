"""Shared fixtures. Tests always run in mock mode (no Claude API calls)."""

import asyncio
import os
import sys

import pytest

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from config import settings  # noqa: E402
from routers.upload import get_current_data  # noqa: E402
from services.profiler import profile_csv  # noqa: E402
from services.semantic import classify_columns  # noqa: E402

SAMPLE_PATH = os.path.join(
    os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "data", "sample_ecommerce.csv"
)


@pytest.fixture(autouse=True)
def mock_mode(monkeypatch):
    """Force the mock classifier/narrator even if a local .env has an API key."""
    monkeypatch.setattr(settings, "ANTHROPIC_API_KEY", "")
    state = get_current_data()
    state["profile"] = None
    state["dataframe"] = None
    yield


@pytest.fixture
def sample_bytes():
    with open(SAMPLE_PATH, "rb") as f:
        return f.read()


@pytest.fixture
def sample_profiled(sample_bytes):
    """(DataProfile with semantic roles, DataFrame) for the bundled sample dataset."""
    profile, df = profile_csv(sample_bytes, "sample_ecommerce.csv")
    profile = asyncio.run(classify_columns(profile))
    return profile, df


@pytest.fixture
def client():
    from fastapi.testclient import TestClient
    from main import app

    with TestClient(app) as c:
        yield c
