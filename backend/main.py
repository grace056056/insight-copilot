"""
main.py
-------
Entry point for the Insight Copilot FastAPI backend.

Responsibilities:
  - Create the FastAPI app instance
  - Configure CORS for frontend communication
  - Register API routers
  - Provide a health-check endpoint

Run locally:
  uvicorn main:app --reload --port 8000
"""

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from config import settings
from routers import upload
from routers import insights


# ---------------------------------------------------------------------------
# Lifespan: runs once on startup / shutdown (replaces deprecated @app.on_event)
# ---------------------------------------------------------------------------
@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup and shutdown logic for the application."""
    print("🚀 Insight Copilot backend starting...")
    print(f"   CORS origins: {settings.CORS_ORIGINS}")
    print(f"   Anthropic model: {settings.ANTHROPIC_MODEL}")
    if not settings.ANTHROPIC_API_KEY:
        print("   ⚠️  ANTHROPIC_API_KEY not set — using mock semantic classifier for development")
    yield
    print("👋 Insight Copilot backend shutting down.")


# ---------------------------------------------------------------------------
# App
# ---------------------------------------------------------------------------
app = FastAPI(
    title="Insight Copilot API",
    description="AI-powered e-commerce analytics backend",
    version="0.1.0",
    lifespan=lifespan,
)

# CORS — allow the React frontend to call this API
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------------------------------------------------------------------
# Routers
# ---------------------------------------------------------------------------
app.include_router(upload.router, prefix="/api")
app.include_router(insights.router, prefix="/api")


# ---------------------------------------------------------------------------
# Health check
# ---------------------------------------------------------------------------
@app.get("/api/health")
async def health_check():
    """Simple health check for deployment monitoring."""
    return {
        "status": "healthy",
        "version": "0.1.0",
        "service": "insight-copilot",
    }
