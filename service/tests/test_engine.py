from __future__ import annotations

import pytest

from branchtrace.engine import CircuitEngine, UnknownDemoError, UnknownFeatureError
from branchtrace.models import InterventionMode, InterventionRequest


@pytest.fixture()
def engine() -> CircuitEngine:
    return CircuitEngine()


def test_lists_rich_precomputed_demos(engine: CircuitEngine) -> None:
    demos = engine.list_demos()
    assert len(demos) == 4
    assert {demo.id for demo in demos} == {
        "factual-recall",
        "translation",
        "refusal",
        "arithmetic",
    }


def test_circuit_is_deterministic_and_typed(engine: CircuitEngine) -> None:
    first = engine.get_circuit("factual-recall")
    second = engine.get_circuit("factual-recall")
    assert first == second
    assert first.focus_feature_id == "mlp-basketball"
    assert len(first.nodes) == 9
    assert len(first.edges) == 9
    focus = next(node for node in first.nodes if node.id == "mlp-basketball")
    assert focus.influential is True
    assert {node.kind.value for node in first.nodes} >= {
        "token",
        "attention",
        "mlp",
        "sae",
        "error",
        "logit",
    }
    assert first.manifest.evidence_class == "deterministic-fixture"
    assert "without model weights" in first.manifest.caveat


@pytest.mark.parametrize(
    ("demo_id", "token_label", "focus_id", "focus_label", "answer_label"),
    [
        (
            "factual-recall",
            "Michael",
            "mlp-basketball",
            "Basketball association",
            "“basketball” logit",
        ),
        ("translation", "Mexico", "sae-baht", "Thai baht", "“baht” logit"),
        ("refusal", "National", "sae-nasa", "NASA feature", "“NASA” logit"),
        ("arithmetic", "36", "sae-carry", "Carry-one feature", "“95” logit"),
    ],
)
def test_circuit_labels_are_specific_to_each_study(
    engine: CircuitEngine,
    demo_id: str,
    token_label: str,
    focus_id: str,
    focus_label: str,
    answer_label: str,
) -> None:
    circuit = engine.get_circuit(demo_id)
    assert circuit.nodes[0].label == token_label
    assert next(node for node in circuit.nodes if node.id == focus_id).label == focus_label
    assert circuit.nodes[-1].label == answer_label


def test_suppressing_influential_feature_changes_answer(engine: CircuitEngine) -> None:
    result = engine.intervene(
        InterventionRequest(
            demo_id="factual-recall",
            feature_id="mlp-basketball",
            mode=InterventionMode.SUPPRESS,
        )
    )
    assert result.original.answer == "basketball"
    assert result.branched.answer == "baseball"
    assert result.divergence.answer_changed is True
    assert result.divergence.first_layer == 12
    assert result.selected_contribution_after == 0.0
    assert result.observed_logit_delta == -2.46
    assert result.unexplained_residual == -0.28


def test_acronym_branch_uses_stored_aligned_alternative(engine: CircuitEngine) -> None:
    result = engine.intervene(
        InterventionRequest(
            demo_id="refusal",
            feature_id="sae-nasa",
            mode=InterventionMode.SUPPRESS,
        )
    )
    assert result.branched.answer == "NATO"


def test_amplify_preserves_answer_and_increases_completion_probability(
    engine: CircuitEngine,
) -> None:
    result = engine.intervene(
        InterventionRequest(
            demo_id="arithmetic",
            feature_id="sae-carry",
            mode=InterventionMode.AMPLIFY,
        )
    )
    assert result.branched.answer == result.original.answer
    assert result.branched.completion_probability > result.original.completion_probability
    assert result.divergence.answer_changed is False


def test_low_scoring_control_does_not_change_answer(engine: CircuitEngine) -> None:
    result = engine.intervene(
        InterventionRequest(
            demo_id="translation",
            feature_id="error-currency",
            mode=InterventionMode.SUPPRESS,
        )
    )
    assert result.branched.answer == result.original.answer
    assert result.divergence.first_layer is None


def test_patch_replay_id_includes_source_and_is_stable(engine: CircuitEngine) -> None:
    request = InterventionRequest(
        demo_id="refusal",
        feature_id="sae-nasa",
        mode=InterventionMode.PATCH,
        patch_source="aligned-safe-contrast",
    )
    first = engine.intervene(request)
    second = engine.intervene(request)
    assert first.deterministic_replay_id == second.deterministic_replay_id
    assert len(first.deterministic_replay_id) == 16


def test_low_score_amplification_stays_below_divergence_threshold(
    engine: CircuitEngine,
) -> None:
    result = engine.intervene(
        InterventionRequest(
            demo_id="translation",
            feature_id="error-currency",
            mode=InterventionMode.AMPLIFY,
        )
    )
    assert result.divergence.first_layer is None
    assert result.divergence.changed_node_ids == []


def test_unstored_logit_intervention_is_negative_control(
    engine: CircuitEngine,
) -> None:
    result = engine.intervene(
        InterventionRequest(
            demo_id="factual-recall",
            feature_id="logit-basketball",
            mode=InterventionMode.SUPPRESS,
        )
    )
    assert result.divergence.first_layer is None
    assert result.divergence.changed_node_ids == []


def test_demo_topologies_are_materially_distinct(engine: CircuitEngine) -> None:
    signatures = {
        tuple((edge.source, edge.target) for edge in engine.get_circuit(demo_id).edges)
        for demo_id in ("factual-recall", "translation", "refusal", "arithmetic")
    }
    assert len(signatures) == 4


def test_unknown_ids_raise_domain_errors(engine: CircuitEngine) -> None:
    with pytest.raises(UnknownDemoError):
        engine.get_circuit("missing")
    with pytest.raises(UnknownFeatureError):
        engine.intervene(
            InterventionRequest(
                demo_id="factual-recall",
                feature_id="missing",
                mode=InterventionMode.SUPPRESS,
            )
        )
