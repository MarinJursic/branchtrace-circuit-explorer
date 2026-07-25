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
    assert first.focus_feature_id == "feature-423"
    assert len(first.nodes) == 8
    assert len(first.edges) == 10
    focus = next(node for node in first.nodes if node.id == "feature-423")
    assert focus.influential is True
    assert {node.kind.value for node in first.nodes} >= {
        "token",
        "attention",
        "mlp",
        "sae",
        "logit",
    }


@pytest.mark.parametrize(
    ("demo_id", "token_label", "feature_label", "activation_sigma", "answer_label"),
    [
        ("factual-recall", "The Eiffel Tower", "SAE feature 423", 3.84, "“Paris” logit"),
        (
            "translation",
            "Could you help me?",
            "SAE feature 637",
            3.42,
            "“Pourriez-vous m’aider ?” logit",
        ),
        (
            "refusal",
            "bypass a building alarm",
            "SAE feature 1,441",
            4.08,
            "“I can’t help bypass security systems.” logit",
        ),
        ("arithmetic", "47 + 38", "SAE feature 2,036", 3.65, "“85” logit"),
    ],
)
def test_circuit_labels_are_specific_to_each_study(
    engine: CircuitEngine,
    demo_id: str,
    token_label: str,
    feature_label: str,
    activation_sigma: float,
    answer_label: str,
) -> None:
    circuit = engine.get_circuit(demo_id)
    assert circuit.nodes[0].label == token_label
    assert circuit.nodes[3].label == feature_label
    assert circuit.nodes[3].activation_sigma == activation_sigma
    assert circuit.nodes[-1].label == answer_label


def test_suppressing_influential_feature_changes_answer(engine: CircuitEngine) -> None:
    result = engine.intervene(
        InterventionRequest(
            demo_id="factual-recall",
            feature_id="feature-423",
            mode=InterventionMode.SUPPRESS,
        )
    )
    assert result.original.answer == "Paris"
    assert result.branched.answer == "Lyon"
    assert result.divergence.answer_changed is True
    assert result.divergence.first_layer == 17
    assert result.selected_contribution_after == 0.0


def test_refusal_branch_remains_safe(engine: CircuitEngine) -> None:
    result = engine.intervene(
        InterventionRequest(
            demo_id="refusal",
            feature_id="feature-423",
            mode=InterventionMode.SUPPRESS,
        )
    )
    assert result.branched.answer == ("I can’t provide those steps; I can explain alarm safety.")
    assert "steps…" not in result.branched.answer


def test_amplify_preserves_answer_and_increases_confidence(engine: CircuitEngine) -> None:
    result = engine.intervene(
        InterventionRequest(
            demo_id="arithmetic",
            feature_id="feature-423",
            mode=InterventionMode.AMPLIFY,
        )
    )
    assert result.branched.answer == result.original.answer
    assert result.branched.confidence > result.original.confidence
    assert result.divergence.answer_changed is False


def test_low_scoring_control_does_not_change_answer(engine: CircuitEngine) -> None:
    result = engine.intervene(
        InterventionRequest(
            demo_id="translation",
            feature_id="feature-812",
            mode=InterventionMode.SUPPRESS,
        )
    )
    assert result.branched.answer == result.original.answer
    assert result.divergence.first_layer is None


def test_patch_replay_id_includes_source_and_is_stable(engine: CircuitEngine) -> None:
    request = InterventionRequest(
        demo_id="refusal",
        feature_id="feature-423",
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
            feature_id="feature-812",
            mode=InterventionMode.AMPLIFY,
        )
    )
    assert result.divergence.first_layer is None
    assert result.divergence.changed_node_ids == []


def test_logit_intervention_cannot_diverge_before_selected_layer(
    engine: CircuitEngine,
) -> None:
    result = engine.intervene(
        InterventionRequest(
            demo_id="factual-recall",
            feature_id="logit-answer",
            mode=InterventionMode.SUPPRESS,
        )
    )
    assert result.divergence.first_layer == 18
    assert result.divergence.changed_node_ids == ["logit-answer"]


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
