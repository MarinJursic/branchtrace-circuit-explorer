from __future__ import annotations

from copy import deepcopy
from hashlib import sha256

from .fixtures import DEMOS
from .models import (
    ArtifactManifest,
    CircuitEdge,
    CircuitGraph,
    CircuitNode,
    DemoSummary,
    Divergence,
    InterventionMode,
    InterventionRequest,
    InterventionResult,
    ModelRun,
)


class UnknownDemoError(KeyError):
    """Raised when a requested fixture does not exist."""


class UnknownFeatureError(KeyError):
    """Raised when a feature does not exist in the requested fixture."""


class CircuitEngine:
    """Pure replay engine for explicitly labeled, locally authored artifacts."""

    fixture_version = "branchtrace-fixture-v2"

    def list_demos(self) -> list[DemoSummary]:
        return [
            DemoSummary(
                id=demo_id,
                task=demo["task"],
                title=demo["title"],
                prompt=demo["prompt"],
                answer=demo["answer"],
            )
            for demo_id, demo in DEMOS.items()
        ]

    def get_circuit(self, demo_id: str) -> CircuitGraph:
        demo = self._demo(demo_id)
        return CircuitGraph(
            demo_id=demo_id,
            task=demo["task"],
            baseline=self._run(
                demo,
                demo["answer"],
                demo["completion_probability"],
                demo["baseline_logit"],
            ),
            nodes=[CircuitNode(**item) for item in deepcopy(demo["nodes"])],
            edges=[CircuitEdge(**item) for item in deepcopy(demo["edges"])],
            focus_feature_id=demo["focus_feature_id"],
            manifest=ArtifactManifest(artifact_id=demo["artifact_id"]),
            fixture_version=self.fixture_version,
        )

    def intervene(self, request: InterventionRequest) -> InterventionResult:
        demo = self._demo(request.demo_id)
        circuit = self.get_circuit(request.demo_id)
        selected = next((node for node in circuit.nodes if node.id == request.feature_id), None)
        if selected is None:
            raise UnknownFeatureError(request.feature_id)

        if request.mode == InterventionMode.SUPPRESS:
            scale = 0.0 if request.strength is None else request.strength
        elif request.mode == InterventionMode.AMPLIFY:
            scale = 1.8 if request.strength is None else request.strength
        else:
            scale = 0.32 if request.strength is None else request.strength

        is_stored_focus = request.feature_id == demo["focus_feature_id"]
        if is_stored_focus:
            stored = demo["measurements"][request.mode.value]
        else:
            stored = {
                "baseline_logit": demo["baseline_logit"],
                "result_logit": demo["baseline_logit"] - 0.03,
                "predicted_delta": -0.02,
                "result": demo["answer"],
                "completion_probability": demo["completion_probability"] - 0.004,
                "first_layer": None,
                "changed_node_ids": [],
            }

        baseline_logit = round(stored["baseline_logit"], 4)
        result_logit = round(stored["result_logit"], 4)
        observed_delta = round(result_logit - baseline_logit, 4)
        predicted_delta = round(stored["predicted_delta"], 4)
        residual = round(observed_delta - predicted_delta, 4)
        answer_changed = stored["result"] != demo["answer"]
        replay_payload = (
            f"{self.fixture_version}:{request.demo_id}:{request.feature_id}:"
            f"{request.mode.value}:{scale:.4f}:{request.patch_source or '-'}"
        )

        return InterventionResult(
            request=request,
            original=circuit.baseline,
            branched=self._run(
                demo,
                stored["result"],
                stored["completion_probability"],
                result_logit,
            ),
            divergence=Divergence(
                first_layer=stored["first_layer"],
                changed_node_ids=stored["changed_node_ids"],
                answer_changed=answer_changed,
                explanation=(
                    f"Stored {request.mode.value} replay begins at layer {stored['first_layer']}."
                    if stored["first_layer"] is not None
                    else "Stored negative control has no downstream fixture changes."
                ),
            ),
            selected_contribution_before=selected.contribution,
            selected_contribution_after=round(selected.contribution * scale, 4),
            deterministic_replay_id=sha256(replay_payload.encode()).hexdigest()[:16],
            baseline_logit=baseline_logit,
            result_logit=result_logit,
            observed_logit_delta=observed_delta,
            predicted_logit_delta=predicted_delta,
            unexplained_residual=residual,
        )

    @staticmethod
    def _run(demo: dict, answer: str, completion_probability: float, logit: float) -> ModelRun:
        return ModelRun(
            model=demo["model"],
            prompt=demo["prompt"],
            answer=answer,
            completion_probability=round(completion_probability, 4),
            logit=round(logit, 4),
        )

    @staticmethod
    def _demo(demo_id: str) -> dict:
        try:
            return DEMOS[demo_id]
        except KeyError as exc:
            raise UnknownDemoError(demo_id) from exc
