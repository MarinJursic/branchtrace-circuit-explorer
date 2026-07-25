from __future__ import annotations

from enum import StrEnum
from typing import Literal

from pydantic import BaseModel, Field, model_validator


class NodeKind(StrEnum):
    TOKEN = "token"
    ATTENTION = "attention"
    MLP = "mlp"
    SAE = "sae"
    LOGIT = "logit"


class InterventionMode(StrEnum):
    SUPPRESS = "suppress"
    AMPLIFY = "amplify"
    PATCH = "patch"


class CircuitNode(BaseModel):
    id: str
    label: str
    detail: str
    layer: int = Field(ge=0, le=96)
    kind: NodeKind
    contribution: float = Field(ge=-1.0, le=1.0)
    activation_sigma: float
    influential: bool = False


class CircuitEdge(BaseModel):
    source: str
    target: str
    contribution: float = Field(ge=-1.0, le=1.0)
    path: Literal["attention", "mlp", "residual", "logit"]


class ModelRun(BaseModel):
    model: str
    prompt: str
    answer: str
    confidence: float = Field(ge=0.0, le=1.0)


class CircuitGraph(BaseModel):
    demo_id: str
    task: str
    baseline: ModelRun
    nodes: list[CircuitNode]
    edges: list[CircuitEdge]
    focus_feature_id: str
    fixture_version: str = "branchtrace-fixture-v1"


class DemoSummary(BaseModel):
    id: str
    task: str
    title: str
    prompt: str
    answer: str


class InterventionRequest(BaseModel):
    demo_id: str
    feature_id: str
    mode: InterventionMode
    strength: float | None = Field(default=None, ge=0.0, le=4.0)
    patch_source: str | None = Field(default=None, min_length=1, max_length=128)

    @model_validator(mode="after")
    def validate_mode_specific_fields(self) -> InterventionRequest:
        if self.patch_source is not None and self.mode != InterventionMode.PATCH:
            raise ValueError("patch_source is only valid when mode is 'patch'")
        return self


class Divergence(BaseModel):
    first_layer: int | None
    changed_node_ids: list[str]
    answer_changed: bool
    explanation: str


class InterventionResult(BaseModel):
    request: InterventionRequest
    original: ModelRun
    branched: ModelRun
    divergence: Divergence
    selected_contribution_before: float
    selected_contribution_after: float
    deterministic_replay_id: str
    caveat: str = (
        "This result is generated from a deterministic public-model-style fixture. "
        "It demonstrates an intervention contract, not a claim about a deployed model."
    )


class HealthResponse(BaseModel):
    status: Literal["ok"]
    engine: str
    fixture_version: str
