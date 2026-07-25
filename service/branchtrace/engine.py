from __future__ import annotations

from copy import deepcopy
from hashlib import sha256

from .fixtures import BASE_EDGES, BASE_NODES, DEMOS
from .models import (
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
    """Pure, deterministic fixture engine with an adapter-friendly API boundary."""

    fixture_version = "branchtrace-fixture-v1"

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
        nodes = deepcopy(BASE_NODES)
        nodes[0]["label"] = demo["token_label"]
        focus_node = next(node for node in nodes if node["id"] == "feature-423")
        focus_node["label"] = demo["feature_display_name"]
        focus_node["detail"] = demo["feature_label"]
        focus_node["activation_sigma"] = demo["feature_activation_sigma"]
        nodes[-1]["label"] = f"“{demo['answer']}” logit"
        nodes[-1]["detail"] = f"+{demo['confidence'] * 4.08:.2f} logit contribution"

        return CircuitGraph(
            demo_id=demo_id,
            task=demo["task"],
            baseline=self._run(demo, demo["answer"], demo["confidence"]),
            nodes=[CircuitNode(**node) for node in nodes],
            edges=[CircuitEdge(**edge) for edge in BASE_EDGES],
            focus_feature_id="feature-423",
            fixture_version=self.fixture_version,
        )

    def intervene(self, request: InterventionRequest) -> InterventionResult:
        demo = self._demo(request.demo_id)
        circuit = self.get_circuit(request.demo_id)
        selected = next((node for node in circuit.nodes if node.id == request.feature_id), None)
        if selected is None:
            raise UnknownFeatureError(request.feature_id)

        strength = request.strength
        if request.mode == InterventionMode.SUPPRESS:
            scale = 0.0 if strength is None else strength
        elif request.mode == InterventionMode.AMPLIFY:
            scale = 1.8 if strength is None else strength
        else:
            scale = 0.32 if strength is None else strength

        influential = selected.influential or abs(selected.contribution) >= 0.7
        meaningful = (
            abs(selected.contribution) >= 0.4
            if request.mode == InterventionMode.AMPLIFY
            else influential and scale < 0.75
        )
        changed = meaningful and request.mode != InterventionMode.AMPLIFY

        if request.mode == InterventionMode.AMPLIFY and meaningful:
            confidence = min(0.994, demo["confidence"] + (0.038 * min(scale, 2.0) / 1.8))
            answer = demo["answer"]
        elif changed:
            confidence = demo["branch_confidence"]
            answer = demo["alternative"]
        else:
            confidence = max(0.5, demo["confidence"] - abs(1.0 - scale) * 0.035)
            answer = demo["answer"]

        after = round(selected.contribution * scale, 4)
        first_layer = max(demo["divergence_layer"], selected.layer) if meaningful else None
        changed_nodes = (
            [node.id for node in circuit.nodes if node.layer >= first_layer]
            if first_layer is not None
            else []
        )
        explanation = (
            f"{request.mode.value.title()} changed downstream activation beginning at layer {first_layer}."
            if first_layer is not None
            else "The intervention stayed below the fixture’s meaningful-divergence threshold."
        )
        replay_payload = (
            f"{self.fixture_version}:{request.demo_id}:{request.feature_id}:"
            f"{request.mode.value}:{scale:.4f}:{request.patch_source or '-'}"
        )

        return InterventionResult(
            request=request,
            original=circuit.baseline,
            branched=self._run(demo, answer, confidence),
            divergence=Divergence(
                first_layer=first_layer,
                changed_node_ids=changed_nodes,
                answer_changed=answer != demo["answer"],
                explanation=explanation,
            ),
            selected_contribution_before=selected.contribution,
            selected_contribution_after=after,
            deterministic_replay_id=sha256(replay_payload.encode()).hexdigest()[:16],
        )

    @staticmethod
    def _run(demo: dict, answer: str, confidence: float) -> ModelRun:
        return ModelRun(
            model=demo["model"],
            prompt=demo["prompt"],
            answer=answer,
            confidence=round(confidence, 4),
        )

    @staticmethod
    def _demo(demo_id: str) -> dict:
        try:
            return DEMOS[demo_id]
        except KeyError as exc:
            raise UnknownDemoError(demo_id) from exc
