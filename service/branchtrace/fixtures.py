from __future__ import annotations

from typing import Any


def node(
    id_: str,
    label: str,
    detail: str,
    layer: int,
    kind: str,
    contribution: float,
    sigma: float,
    *,
    influential: bool = False,
) -> dict[str, Any]:
    return {
        "id": id_,
        "label": label,
        "detail": detail,
        "layer": layer,
        "kind": kind,
        "contribution": contribution,
        "activation_sigma": sigma,
        "influential": influential,
    }


def edge(source: str, target: str, contribution: float, path: str) -> dict[str, Any]:
    return {
        "source": source,
        "target": target,
        "contribution": contribution,
        "path": path,
    }


JORDAN_NODES = [
    node("tok-michael", "Michael", "Given-name token", 0, "token", 0.18, 0.7),
    node("tok-jordan", "Jordan", "Ambiguous surname token", 0, "token", 0.63, 2.2),
    node("attn-name", "Name binder", "Binds adjacent person tokens", 4, "attention", 0.66, 2.3),
    node("sae-athlete", "Professional athlete", "Person to athlete concept", 8, "sae", 0.78, 3.0),
    node("sae-country", "Country-name competitor", "Jordan as country", 8, "sae", -0.36, -1.2),
    node(
        "mlp-basketball",
        "Basketball association",
        "Athlete to sport relation",
        12,
        "mlp",
        0.94,
        4.3,
        influential=True,
    ),
    node("error-jordan", "Unexplained residual", "Unextracted flow", 12, "error", -0.14, -0.4),
    node("sae-sport", "Sport answer feature", "Promotes sport noun", 16, "sae", 0.81, 3.4),
    node("logit-basketball", "“basketball” logit", "Target completion", 18, "logit", 0.97, 4.6),
]
JORDAN_EDGES = [
    edge("tok-michael", "attn-name", 0.27, "attention"),
    edge("tok-jordan", "attn-name", 0.69, "attention"),
    edge("attn-name", "sae-athlete", 0.77, "residual"),
    edge("tok-jordan", "sae-country", -0.36, "residual"),
    edge("sae-athlete", "mlp-basketball", 0.92, "mlp"),
    edge("sae-country", "mlp-basketball", -0.22, "mlp"),
    edge("mlp-basketball", "sae-sport", 0.86, "residual"),
    edge("error-jordan", "sae-sport", -0.14, "error"),
    edge("sae-sport", "logit-basketball", 0.96, "logit"),
]

CURRENCY_NODES = [
    node("tok-mexico", "Mexico", "Source country", 0, "token", 0.51, 1.9),
    node("tok-peso", "peso", "Source currency", 0, "token", 0.42, 1.5),
    node("tok-thailand", "Thailand", "Target country", 0, "token", 0.69, 2.5),
    node("attn-analogy", "Analogy binder", "Binds source and target", 5, "attention", 0.77, 2.9),
    node("mlp-currency", "Currency relation", "Country to currency schema", 9, "mlp", 0.82, 3.1),
    node("sae-thailand", "Thailand geography", "Target country feature", 10, "sae", 0.58, 2.1),
    node("sae-baht", "Thai baht", "Target currency recall", 13, "sae", 0.93, 4.0, influential=True),
    node("sae-ringgit", "Ringgit competitor", "Nearby currency competitor", 13, "sae", -0.29, -1.0),
    node("error-currency", "Unexplained residual", "Pruned flow", 15, "error", -0.12, -0.3),
    node(
        "attn-final", "Final-position writer", "Writes target currency", 17, "attention", 0.71, 2.6
    ),
    node("logit-baht", "“baht” logit", "Target completion", 18, "logit", 0.96, 4.4),
]
CURRENCY_EDGES = [
    edge("tok-mexico", "attn-analogy", 0.43, "attention"),
    edge("tok-peso", "attn-analogy", 0.38, "attention"),
    edge("tok-thailand", "attn-analogy", 0.63, "attention"),
    edge("attn-analogy", "mlp-currency", 0.75, "mlp"),
    edge("tok-thailand", "sae-thailand", 0.68, "residual"),
    edge("mlp-currency", "sae-baht", 0.84, "mlp"),
    edge("sae-thailand", "sae-baht", 0.59, "residual"),
    edge("sae-thailand", "sae-ringgit", -0.29, "residual"),
    edge("sae-baht", "attn-final", 0.88, "attention"),
    edge("sae-ringgit", "attn-final", -0.19, "residual"),
    edge("error-currency", "attn-final", -0.12, "error"),
    edge("attn-final", "logit-baht", 0.95, "logit"),
]

ACRONYM_NODES = [
    node("tok-national", "National", "First expansion token", 0, "token", 0.31, 1.2),
    node("tok-space", "Space", "Diagnostic expansion token", 0, "token", 0.49, 1.8),
    node("attn-initials", "Initial-letter mover", "Copies initials", 5, "attention", 0.73, 2.7),
    node("mlp-acronym", "Acronym schema", "Expansion to abbreviation", 9, "mlp", 0.86, 3.3),
    node("sae-nasa", "NASA feature", "Agency abbreviation", 12, "sae", 0.91, 4.1, influential=True),
    node("error-acronym", "Unexplained residual", "Unextracted flow", 12, "error", -0.17, -0.5),
    node(
        "attn-output", "Answer-position writer", "Writes abbreviation", 16, "attention", 0.67, 2.4
    ),
    node("logit-nasa", "“NASA” logit", "Target completion", 18, "logit", 0.95, 4.4),
]
ACRONYM_EDGES = [
    edge("tok-national", "attn-initials", 0.38, "attention"),
    edge("tok-space", "attn-initials", 0.61, "attention"),
    edge("tok-national", "mlp-acronym", 0.22, "residual"),
    edge("attn-initials", "mlp-acronym", 0.74, "attention"),
    edge("mlp-acronym", "sae-nasa", 0.88, "mlp"),
    edge("mlp-acronym", "error-acronym", -0.17, "error"),
    edge("sae-nasa", "attn-output", 0.71, "residual"),
    edge("error-acronym", "attn-output", -0.11, "error"),
    edge("attn-output", "logit-nasa", 0.93, "logit"),
]

MATH_NODES = [
    node("tok-36", "36", "First addend", 0, "token", 0.42, 1.5),
    node("tok-plus", "+", "Addition operator", 0, "token", 0.37, 1.3),
    node("tok-59", "59", "Second addend", 0, "token", 0.46, 1.7),
    node("attn-digits", "Digit-position binder", "Aligns columns", 3, "attention", 0.64, 2.4),
    node("mlp-ones", "6 + 9 → 15", "Ones-column sum", 7, "mlp", 0.79, 3.0),
    node("sae-carry", "Carry-one feature", "Carries one", 9, "sae", 0.92, 4.2, influential=True),
    node("mlp-tens", "3 + 5 + 1 → 9", "Tens composition", 12, "mlp", 0.87, 3.5),
    node("sae-no-carry", "No-carry competitor", "Alternative path", 10, "sae", -0.33, -1.1),
    node("error-math", "Unexplained residual", "Pruned flow", 13, "error", -0.16, -0.5),
    node("attn-format", "Answer formatter", "Orders output", 15, "attention", 0.66, 2.4),
    node("sae-95", "Ninety-five feature", "Combined answer", 17, "sae", 0.83, 3.6),
    node("logit-95", "“95” logit", "Target completion", 18, "logit", 0.95, 4.3),
]
MATH_EDGES = [
    edge("tok-36", "attn-digits", 0.53, "attention"),
    edge("tok-plus", "attn-digits", 0.31, "attention"),
    edge("tok-59", "attn-digits", 0.56, "attention"),
    edge("attn-digits", "mlp-ones", 0.72, "mlp"),
    edge("mlp-ones", "sae-carry", 0.89, "mlp"),
    edge("sae-carry", "mlp-tens", 0.91, "residual"),
    edge("attn-digits", "sae-no-carry", -0.33, "residual"),
    edge("mlp-tens", "attn-format", 0.84, "attention"),
    edge("sae-no-carry", "attn-format", -0.21, "residual"),
    edge("error-math", "attn-format", -0.16, "error"),
    edge("attn-format", "sae-95", 0.79, "residual"),
    edge("sae-95", "logit-95", 0.94, "logit"),
]

# Retained for adapter examples that import the original names.
BASE_NODES = JORDAN_NODES
BASE_EDGES = JORDAN_EDGES


def measurement(
    baseline_logit: float,
    answer: str,
    alternative: str,
    first_layer: int,
    changed_node_ids: list[str],
) -> dict[str, dict[str, Any]]:
    return {
        "suppress": {
            "baseline_logit": baseline_logit,
            "result_logit": baseline_logit - 2.46,
            "predicted_delta": -2.18,
            "result": alternative,
            "completion_probability": 0.618,
            "first_layer": first_layer,
            "changed_node_ids": changed_node_ids,
        },
        "amplify": {
            "baseline_logit": baseline_logit,
            "result_logit": baseline_logit + 0.72,
            "predicted_delta": 0.66,
            "result": answer,
            "completion_probability": 0.979,
            "first_layer": first_layer,
            "changed_node_ids": changed_node_ids,
        },
        "patch": {
            "baseline_logit": baseline_logit,
            "result_logit": baseline_logit - 1.84,
            "predicted_delta": -1.63,
            "result": alternative,
            "completion_probability": 0.684,
            "first_layer": first_layer,
            "changed_node_ids": changed_node_ids,
        },
    }


def demo(
    *,
    title: str,
    task: str,
    prompt: str,
    answer: str,
    alternative: str,
    baseline_logit: float,
    focus_feature_id: str,
    nodes: list[dict[str, Any]],
    edges: list[dict[str, Any]],
    first_layer: int,
    changed_node_ids: list[str],
    artifact_id: str,
) -> dict[str, Any]:
    return {
        "title": title,
        "task": task,
        "model": "google/gemma-2-2b · reference target",
        "prompt": prompt,
        "answer": answer,
        "alternative": alternative,
        "completion_probability": 0.942,
        "baseline_logit": baseline_logit,
        "focus_feature_id": focus_feature_id,
        "nodes": nodes,
        "edges": edges,
        "artifact_id": artifact_id,
        "measurements": measurement(
            baseline_logit, answer, alternative, first_layer, changed_node_ids
        ),
    }


DEMOS: dict[str, dict[str, Any]] = {
    "factual-recall": demo(
        title="Jordan → basketball",
        task="Factual recall",
        prompt="Michael Jordan is best known for playing the sport of",
        answer="basketball",
        alternative="baseball",
        baseline_logit=4.21,
        focus_feature_id="mlp-basketball",
        nodes=JORDAN_NODES,
        edges=JORDAN_EDGES,
        first_layer=12,
        changed_node_ids=["mlp-basketball", "sae-sport", "logit-basketball"],
        artifact_id="jordan-basketball-v2",
    ),
    "translation": demo(
        title="Peso → baht",
        task="Currency analogy",
        prompt="Mexico uses the peso; Thailand uses the",
        answer="baht",
        alternative="ringgit",
        baseline_logit=3.82,
        focus_feature_id="sae-baht",
        nodes=CURRENCY_NODES,
        edges=CURRENCY_EDGES,
        first_layer=13,
        changed_node_ids=["sae-baht", "attn-final", "logit-baht"],
        artifact_id="peso-baht-v2",
    ),
    "refusal": demo(
        title="Expansion → NASA",
        task="Acronym completion",
        prompt="National Aeronautics and Space Administration is abbreviated",
        answer="NASA",
        alternative="NATO",
        baseline_logit=4.64,
        focus_feature_id="sae-nasa",
        nodes=ACRONYM_NODES,
        edges=ACRONYM_EDGES,
        first_layer=12,
        changed_node_ids=["sae-nasa", "attn-output", "logit-nasa"],
        artifact_id="acronym-nasa-v2",
    ),
    "arithmetic": demo(
        title="Two-digit carry",
        task="Addition",
        prompt="Compute: 36 + 59 =",
        answer="95",
        alternative="85",
        baseline_logit=3.57,
        focus_feature_id="sae-carry",
        nodes=MATH_NODES,
        edges=MATH_EDGES,
        first_layer=9,
        changed_node_ids=["sae-carry", "mlp-tens", "attn-format", "sae-95", "logit-95"],
        artifact_id="addition-carry-v2",
    ),
}
