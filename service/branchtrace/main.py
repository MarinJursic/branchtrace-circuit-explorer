from __future__ import annotations

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from .engine import CircuitEngine, UnknownDemoError, UnknownFeatureError
from .models import (
    CircuitGraph,
    DemoSummary,
    HealthResponse,
    InterventionRequest,
    InterventionResult,
)

app = FastAPI(
    title="BranchTrace API",
    version="0.2.0",
    description=(
        "Typed deterministic circuit artifacts with stored intervention/logit "
        "measurements and explicit provenance. No endpoint runs a model."
    ),
)
app.add_middleware(
    CORSMiddleware,
    allow_origin_regex=r"^http://(localhost|127\.0\.0\.1):\d+$",
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)
engine = CircuitEngine()


@app.get("/health", response_model=HealthResponse, tags=["system"])
def health() -> HealthResponse:
    return HealthResponse(
        status="ok",
        engine="deterministic-fixture",
        fixture_version=engine.fixture_version,
    )


@app.get("/v1/demos", response_model=list[DemoSummary], tags=["circuits"])
def list_demos() -> list[DemoSummary]:
    return engine.list_demos()


@app.get("/v1/circuits/{demo_id}", response_model=CircuitGraph, tags=["circuits"])
def get_circuit(demo_id: str) -> CircuitGraph:
    try:
        return engine.get_circuit(demo_id)
    except UnknownDemoError as exc:
        raise HTTPException(status_code=404, detail=f"Unknown demo: {demo_id}") from exc


@app.post("/v1/interventions", response_model=InterventionResult, tags=["interventions"])
def intervene(request: InterventionRequest) -> InterventionResult:
    try:
        return engine.intervene(request)
    except UnknownDemoError as exc:
        raise HTTPException(status_code=404, detail=f"Unknown demo: {request.demo_id}") from exc
    except UnknownFeatureError as exc:
        raise HTTPException(
            status_code=404, detail=f"Unknown feature: {request.feature_id}"
        ) from exc
