from __future__ import annotations

from fastapi.testclient import TestClient

from branchtrace.main import app

client = TestClient(app)


def test_health_contract() -> None:
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {
        "status": "ok",
        "engine": "deterministic-fixture",
        "fixture_version": "branchtrace-fixture-v1",
    }


def test_end_to_end_api_flow() -> None:
    demos = client.get("/v1/demos")
    assert demos.status_code == 200
    assert len(demos.json()) == 4

    circuit = client.get("/v1/circuits/factual-recall")
    assert circuit.status_code == 200
    assert circuit.json()["baseline"]["answer"] == "Paris"

    branch = client.post(
        "/v1/interventions",
        json={
            "demo_id": "factual-recall",
            "feature_id": "feature-423",
            "mode": "suppress",
        },
    )
    assert branch.status_code == 200
    payload = branch.json()
    assert payload["branched"]["answer"] == "Lyon"
    assert payload["divergence"]["first_layer"] == 17
    assert payload["divergence"]["answer_changed"] is True


def test_demo_circuits_do_not_leak_factual_recall_labels() -> None:
    arithmetic = client.get("/v1/circuits/arithmetic")
    assert arithmetic.status_code == 200
    nodes = arithmetic.json()["nodes"]
    assert nodes[0]["label"] == "47 + 38"
    assert nodes[3]["label"] == "SAE feature 2,036"
    assert nodes[-1]["label"] == "“85” logit"


def test_refusal_intervention_preserves_safe_output() -> None:
    response = client.post(
        "/v1/interventions",
        json={
            "demo_id": "refusal",
            "feature_id": "feature-423",
            "mode": "suppress",
        },
    )
    assert response.status_code == 200
    assert response.json()["branched"]["answer"] == (
        "I can’t provide those steps; I can explain alarm safety."
    )


def test_unknown_demo_is_404() -> None:
    response = client.get("/v1/circuits/missing")
    assert response.status_code == 404
    assert response.json()["detail"] == "Unknown demo: missing"


def test_unknown_feature_is_404() -> None:
    response = client.post(
        "/v1/interventions",
        json={
            "demo_id": "factual-recall",
            "feature_id": "missing",
            "mode": "suppress",
        },
    )
    assert response.status_code == 404
    assert response.json()["detail"] == "Unknown feature: missing"


def test_validation_rejects_invalid_mode_strength_and_patch_metadata() -> None:
    invalid_payloads = [
        {
            "demo_id": "factual-recall",
            "feature_id": "feature-423",
            "mode": "delete",
        },
        {
            "demo_id": "factual-recall",
            "feature_id": "feature-423",
            "mode": "amplify",
            "strength": 4.1,
        },
        {
            "demo_id": "factual-recall",
            "feature_id": "feature-423",
            "mode": "suppress",
            "patch_source": "contrast",
        },
        {
            "demo_id": "factual-recall",
            "feature_id": "feature-423",
            "mode": "patch",
            "patch_source": "",
        },
    ]
    for payload in invalid_payloads:
        response = client.post("/v1/interventions", json=payload)
        assert response.status_code == 422
