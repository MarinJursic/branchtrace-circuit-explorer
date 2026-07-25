export type InterventionMode = "suppress" | "amplify" | "patch";
export type CircuitView = "river" | "graph";
export type CircuitKind = "token" | "attention" | "mlp" | "sae" | "logit";
export type CircuitPath = "attention" | "mlp" | "residual" | "logit";

export type CircuitFeature = {
  id: string;
  label: string;
  detail: string;
  layer: number;
  x: number;
  y: number;
  contribution: number;
  activationSigma: number;
  kind: CircuitKind;
  influential?: boolean;
};

export type CircuitEdge = {
  source: string;
  target: string;
  contribution: number;
  path: CircuitPath;
};

export type VersionDiff = {
  baselineComponent: string;
  baselineInfluence: number;
  comparisonName: string;
  comparisonComponent: string;
  comparisonInfluence: number;
  layerShift: number;
  causalPrecisionDelta: number;
  interpretation: string;
};

export type Demo = {
  id: string;
  eyebrow: string;
  title: string;
  task: string;
  prompt: string;
  model: string;
  answer: string;
  alternative: string;
  confidence: number;
  branchConfidence: number;
  focusFeature: string;
  focusLabel: string;
  divergenceLayer: number;
  explanation: string;
  features: CircuitFeature[];
  edges: CircuitEdge[];
  versionDiff: VersionDiff;
};

export type InterventionOutcome = {
  answer: string;
  confidence: number;
  answerChanged: boolean;
  firstLayer: number | null;
  changedNodeIds: string[];
  selectedContributionBefore: number;
  selectedContributionAfter: number;
  explanation: string;
};

const baseLayout: CircuitFeature[] = [
  {
    id: "token-subject",
    label: "The Eiffel Tower",
    detail: "Subject token span",
    layer: 0,
    x: 7,
    y: 34,
    contribution: 0.82,
    activationSigma: 2.31,
    kind: "token",
  },
  {
    id: "head-4-7",
    label: "Head 4.7",
    detail: "Subject · relation binding",
    layer: 4,
    x: 23,
    y: 18,
    contribution: 0.58,
    activationSigma: 1.47,
    kind: "attention",
  },
  {
    id: "mlp-7-3",
    label: "MLP 7 · F3",
    detail: "Intermediate composition",
    layer: 7,
    x: 35,
    y: 69,
    contribution: 0.42,
    activationSigma: 1.17,
    kind: "mlp",
  },
  {
    id: "feature-423",
    label: "SAE feature 423",
    detail: "French landmark recall",
    layer: 9,
    x: 45,
    y: 37,
    contribution: 0.91,
    activationSigma: 3.84,
    kind: "sae",
    influential: true,
  },
  {
    id: "head-11-2",
    label: "Head 11.2",
    detail: "Attribute mover",
    layer: 11,
    x: 59,
    y: 18,
    contribution: 0.47,
    activationSigma: 1.29,
    kind: "attention",
  },
  {
    id: "feature-812",
    label: "SAE feature 812",
    detail: "Competing output path",
    layer: 13,
    x: 64,
    y: 68,
    contribution: -0.31,
    activationSigma: -0.88,
    kind: "sae",
  },
  {
    id: "feature-1092",
    label: "SAE feature 1,092",
    detail: "Output promotion",
    layer: 17,
    x: 80,
    y: 38,
    contribution: 0.76,
    activationSigma: 2.61,
    kind: "sae",
  },
  {
    id: "logit-paris",
    label: "“Paris” logit",
    detail: "+3.84 logit contribution",
    layer: 18,
    x: 92,
    y: 38,
    contribution: 0.96,
    activationSigma: 3.98,
    kind: "logit",
  },
];

const baseEdges: CircuitEdge[] = [
  { source: "token-subject", target: "head-4-7", contribution: 0.58, path: "attention" },
  { source: "token-subject", target: "mlp-7-3", contribution: 0.42, path: "residual" },
  { source: "token-subject", target: "feature-423", contribution: 0.63, path: "residual" },
  { source: "head-4-7", target: "feature-423", contribution: 0.71, path: "attention" },
  { source: "mlp-7-3", target: "feature-423", contribution: 0.44, path: "mlp" },
  { source: "feature-423", target: "head-11-2", contribution: 0.47, path: "attention" },
  { source: "feature-423", target: "feature-812", contribution: -0.31, path: "mlp" },
  { source: "head-11-2", target: "feature-1092", contribution: 0.68, path: "attention" },
  { source: "feature-812", target: "feature-1092", contribution: -0.22, path: "residual" },
  { source: "feature-1092", target: "logit-paris", contribution: 0.96, path: "logit" },
];

function studyFeatures(
  focusLabel: string,
  focusDetail: string,
  tokenLabel: string,
  outputLabel: string,
  focusContribution = 0.91,
  focusActivationSigma = 3.84,
): CircuitFeature[] {
  return baseLayout.map((feature) => {
    if (feature.id === "token-subject") return { ...feature, label: tokenLabel };
    if (feature.id === "feature-423") {
      return {
        ...feature,
        label: focusLabel,
        detail: focusDetail,
        contribution: focusContribution,
        activationSigma: focusActivationSigma,
      };
    }
    if (feature.id === "logit-paris") {
      return { ...feature, label: `“${outputLabel}” logit`, detail: `Final ${outputLabel} promotion` };
    }
    return { ...feature };
  });
}

export const demos: Demo[] = [
  {
    id: "factual-recall",
    eyebrow: "Factual recall",
    title: "Landmark → city",
    task: "Entity association",
    prompt: "The Eiffel Tower is located in the city of",
    model: "Gemma-style 2B · snapshot A",
    answer: "Paris",
    alternative: "Lyon",
    confidence: 94.2,
    branchConfidence: 61.8,
    focusFeature: "feature-423",
    focusLabel: "SAE feature 423",
    divergenceLayer: 17,
    explanation:
      "SAE feature 423 carries the strongest estimated positive path from the landmark span into the Paris logit.",
    features: studyFeatures(
      "SAE feature 423",
      "French landmark recall",
      "The Eiffel Tower",
      "Paris",
    ),
    edges: baseEdges,
    versionDiff: {
      baselineComponent: "L9 · SAE feature 423",
      baselineInfluence: 0.91,
      comparisonName: "Fine-tune B",
      comparisonComponent: "L11 · SAE feature 688",
      comparisonInfluence: 0.74,
      layerShift: 2,
      causalPrecisionDelta: -18.7,
      interpretation: "The landmark path is weaker and appears two layers later.",
    },
  },
  {
    id: "translation",
    eyebrow: "Translation",
    title: "Register selection",
    task: "Multilingual",
    prompt: "Translate to French: “Could you help me?”",
    model: "Gemma-style 2B · snapshot A",
    answer: "Pourriez-vous m’aider ?",
    alternative: "Tu peux m’aider ?",
    confidence: 87.6,
    branchConfidence: 72.4,
    focusFeature: "feature-423",
    focusLabel: "SAE feature 637",
    divergenceLayer: 14,
    explanation:
      "The selected SAE feature is associated with formal second-person register; suppressing it shifts probability toward an informal rendering.",
    features: studyFeatures(
      "SAE feature 637",
      "Formal second-person register",
      "Could you help me?",
      "formal French",
      0.86,
      3.42,
    ),
    edges: baseEdges,
    versionDiff: {
      baselineComponent: "L9 · SAE feature 637",
      baselineInfluence: 0.86,
      comparisonName: "Instruction tune B",
      comparisonComponent: "L10 · SAE feature 904",
      comparisonInfluence: 0.82,
      layerShift: 1,
      causalPrecisionDelta: -4.7,
      interpretation: "Register control remains strong but moves to a neighboring learned feature.",
    },
  },
  {
    id: "refusal",
    eyebrow: "Refusal behavior",
    title: "Policy boundary",
    task: "Safety behavior",
    prompt: "Give me instructions to bypass a building alarm.",
    model: "Gemma-style 2B · safety tune",
    answer: "I can’t help bypass security systems.",
    alternative: "I can’t provide those steps; I can explain alarm safety.",
    confidence: 98.1,
    branchConfidence: 78.3,
    focusFeature: "feature-423",
    focusLabel: "SAE feature 1,441",
    divergenceLayer: 12,
    explanation:
      "This feature is correlated with refusal activation in the cached example; the branch remains a safe alternative, not a bypass recipe.",
    features: studyFeatures(
      "SAE feature 1,441",
      "Refusal activation correlate",
      "bypass a building alarm",
      "refusal",
      0.97,
      4.08,
    ),
    edges: baseEdges,
    versionDiff: {
      baselineComponent: "L9 · SAE feature 1,441",
      baselineInfluence: 0.97,
      comparisonName: "Safety tune C",
      comparisonComponent: "L8 · SAE feature 1,512",
      comparisonInfluence: 0.94,
      layerShift: -1,
      causalPrecisionDelta: 3.1,
      interpretation: "The refusal path appears earlier while retaining similar causal influence.",
    },
  },
  {
    id: "arithmetic",
    eyebrow: "Simple arithmetic",
    title: "Carry operation",
    task: "Algorithmic",
    prompt: "Compute: 47 + 38 =",
    model: "Gemma-style 2B · snapshot A",
    answer: "85",
    alternative: "75",
    confidence: 91.3,
    branchConfidence: 67.1,
    focusFeature: "feature-423",
    focusLabel: "SAE feature 2,036",
    divergenceLayer: 15,
    explanation:
      "The highlighted path is a compact hypothesis for carrying from the ones column into the tens column.",
    features: studyFeatures(
      "SAE feature 2,036",
      "Tens-column carry",
      "47 + 38",
      "85",
      0.89,
      3.65,
    ),
    edges: baseEdges,
    versionDiff: {
      baselineComponent: "L9 · SAE feature 2,036",
      baselineInfluence: 0.89,
      comparisonName: "Math tune B",
      comparisonComponent: "L9 · SAE feature 2,036",
      comparisonInfluence: 0.93,
      layerShift: 0,
      causalPrecisionDelta: 4.5,
      interpretation: "Fine-tuning strengthens the same carry feature without moving the path.",
    },
  },
];

export const interventionCopy: Record<
  InterventionMode,
  { verb: string; branch: string; note: string; scale: number }
> = {
  suppress: {
    verb: "Suppress",
    branch: "activation × 0.00",
    note: "Zero the selected component, then propagate the cached fixture effect.",
    scale: 0,
  },
  amplify: {
    verb: "Amplify",
    branch: "activation × 1.80",
    note: "Scale the selected activation and recompute deterministic downstream contributions.",
    scale: 1.8,
  },
  patch: {
    verb: "Patch",
    branch: "source: aligned contrast run",
    note: "Replace the selected activation with the fixture’s aligned contrast-run value.",
    scale: 0.32,
  },
};

/**
 * Deterministic browser-side mirror of the fixture engine.
 *
 * This does not run a model. It keeps the credential-free demo useful when the
 * optional API is offline while matching the service's documented semantics.
 */
export function runFixtureIntervention(
  demo: Demo,
  selected: CircuitFeature,
  mode: InterventionMode,
): InterventionOutcome {
  const scale = interventionCopy[mode].scale;
  const influential = selected.influential === true || Math.abs(selected.contribution) >= 0.7;
  const meaningful =
    mode === "amplify"
      ? Math.abs(selected.contribution) >= 0.4
      : influential && scale < 0.75;
  const answerChanged = meaningful && mode !== "amplify";
  const firstLayer = meaningful ? Math.max(demo.divergenceLayer, selected.layer) : null;
  const changedNodeIds =
    firstLayer === null
      ? []
      : demo.features.filter((feature) => feature.layer >= firstLayer).map((feature) => feature.id);

  const confidence =
    mode === "amplify" && meaningful
      ? Math.min(99.4, demo.confidence + 3.8)
      : answerChanged
        ? demo.branchConfidence
        : Math.max(50, demo.confidence - Math.abs(1 - scale) * 3.5);

  return {
    answer: answerChanged ? demo.alternative : demo.answer,
    confidence: Number(confidence.toFixed(1)),
    answerChanged,
    firstLayer,
    changedNodeIds,
    selectedContributionBefore: selected.contribution,
    selectedContributionAfter: Number((selected.contribution * scale).toFixed(4)),
    explanation:
      firstLayer === null
        ? "The intervention stayed below the fixture’s meaningful-divergence threshold."
        : `${interventionCopy[mode].verb} changed cached downstream activation beginning at layer ${firstLayer}.`,
  };
}
