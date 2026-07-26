export type InterventionMode = "suppress" | "amplify" | "patch";
export type CircuitView = "river" | "graph";
export type CircuitKind =
  | "token"
  | "attention"
  | "mlp"
  | "sae"
  | "error"
  | "logit";
export type CircuitPath = "attention" | "mlp" | "residual" | "error" | "logit";
export type EvidenceClass = "deterministic-fixture";

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
  examples?: string[];
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

export type StoredMeasurement = {
  baselineLogit: number;
  resultLogit: number;
  predictedDelta: number;
  changedNodeIds: string[];
  firstLayer: number | null;
  result: string;
  completionProbability: number;
  note: string;
};

export type ArtifactManifest = {
  artifactId: string;
  schemaVersion: string;
  evidenceClass: EvidenceClass;
  modelTarget: string;
  modelRevision: string;
  transcoderTarget: string;
  generator: string;
  sourceTitle: string;
  sourceUrl: string;
  license: string;
  promptHash: string;
  artifactHash: string;
  generatedAt: string;
  caveat: string;
};

export type Demo = {
  id: string;
  eyebrow: string;
  title: string;
  task: string;
  prompt: string;
  contrastPrompt: string;
  model: string;
  answer: string;
  alternative: string;
  completionProbability: number;
  baselineLogit: number;
  focusFeature: string;
  focusLabel: string;
  divergenceLayer: number;
  explanation: string;
  features: CircuitFeature[];
  edges: CircuitEdge[];
  measurements: Record<InterventionMode, StoredMeasurement>;
  manifest: ArtifactManifest;
  versionDiff: VersionDiff;
};

export type InterventionOutcome = {
  answer: string;
  completionProbability: number;
  answerChanged: boolean;
  firstLayer: number | null;
  changedNodeIds: string[];
  selectedContributionBefore: number;
  selectedContributionAfter: number;
  baselineLogit: number;
  resultLogit: number;
  observedLogitDelta: number;
  predictedLogitDelta: number;
  unexplainedResidual: number;
  evidenceClass: EvidenceClass;
  explanation: string;
};

const node = (
  id: string,
  label: string,
  detail: string,
  layer: number,
  x: number,
  y: number,
  contribution: number,
  activationSigma: number,
  kind: CircuitKind,
  options: Partial<CircuitFeature> = {},
): CircuitFeature => ({
  id,
  label,
  detail,
  layer,
  x,
  y,
  contribution,
  activationSigma,
  kind,
  ...options,
});

const edge = (
  source: string,
  target: string,
  contribution: number,
  path: CircuitPath,
): CircuitEdge => ({ source, target, contribution, path });

const manifest = (
  artifactId: string,
  promptHash: string,
  artifactHash: string,
): ArtifactManifest => ({
  artifactId,
  schemaVersion: "branchtrace-artifact-v2",
  evidenceClass: "deterministic-fixture",
  modelTarget: "google/gemma-2-2b",
  modelRevision: "reference-target-not-bundled",
  transcoderTarget: "Gemma Scope / circuit-tracer compatible schema",
  generator: "BranchTrace deterministic fixture generator v2",
  sourceTitle: "circuit-tracer — open circuit tracing tools and examples",
  sourceUrl: "https://github.com/decoderesearch/circuit-tracer",
  license: "Application code MIT; fixture values authored for this repository",
  promptHash,
  artifactHash,
  generatedAt: "2026-07-26T00:00:00Z",
  caveat:
    "This artifact exercises a public-model circuit schema but was generated locally without model weights. Values are test fixtures, not empirical claims about Gemma.",
});

const acronymFeatures = [
  node("tok-national", "National", "First expansion token", 0, 6, 26, 0.31, 1.2, "token"),
  node("tok-space", "Space", "Diagnostic expansion token", 0, 6, 68, 0.49, 1.8, "token"),
  node("attn-initials", "Initial-letter mover", "Copies word initials", 5, 27, 22, 0.73, 2.7, "attention", {
    examples: ["National Aeronautics and Space Administration", "North Atlantic Treaty Organization"],
  }),
  node("mlp-acronym", "Acronym schema", "Expansion → abbreviation pattern", 9, 43, 54, 0.86, 3.3, "mlp", {
    influential: true,
    examples: ["… is commonly abbreviated as", "known by the acronym"],
  }),
  node("sae-nasa", "NASA feature", "Space-agency abbreviation", 12, 60, 29, 0.91, 4.1, "sae", {
    influential: true,
    examples: ["NASA", "space agency", "Apollo program"],
  }),
  node("error-acronym", "Unexplained residual", "Contribution outside extracted graph", 12, 60, 75, -0.17, -0.5, "error"),
  node("attn-output", "Answer-position writer", "Writes abbreviation at final token", 16, 77, 45, 0.67, 2.4, "attention"),
  node("logit-nasa", "“NASA” logit", "Target completion", 18, 93, 45, 0.95, 4.4, "logit"),
];

const acronymEdges = [
  edge("tok-national", "attn-initials", 0.38, "attention"),
  edge("tok-space", "attn-initials", 0.61, "attention"),
  edge("tok-national", "mlp-acronym", 0.22, "residual"),
  edge("attn-initials", "mlp-acronym", 0.74, "attention"),
  edge("mlp-acronym", "sae-nasa", 0.88, "mlp"),
  edge("mlp-acronym", "error-acronym", -0.17, "error"),
  edge("sae-nasa", "attn-output", 0.71, "residual"),
  edge("error-acronym", "attn-output", -0.11, "error"),
  edge("attn-output", "logit-nasa", 0.93, "logit"),
];

const jordanFeatures = [
  node("tok-michael", "Michael", "Given-name token", 0, 5, 23, 0.18, 0.7, "token"),
  node("tok-jordan", "Jordan", "Ambiguous surname token", 0, 5, 70, 0.63, 2.2, "token"),
  node("attn-name", "Name binder", "Binds adjacent person tokens", 4, 23, 35, 0.66, 2.3, "attention"),
  node("sae-athlete", "Professional athlete", "Person → athlete concept", 8, 40, 21, 0.78, 3.0, "sae", {
    examples: ["Michael Jordan", "Serena Williams", "Lionel Messi"],
  }),
  node("sae-country", "Country-name competitor", "Jordan as geographic entity", 8, 40, 74, -0.36, -1.2, "sae"),
  node("mlp-basketball", "Basketball association", "Athlete → sport relation", 12, 59, 32, 0.94, 4.3, "mlp", {
    influential: true,
    examples: ["Chicago Bulls", "NBA finals", "basketball player"],
  }),
  node("error-jordan", "Unexplained residual", "Pruned and dictionary-error flow", 12, 59, 76, -0.14, -0.4, "error"),
  node("sae-sport", "Sport answer feature", "Promotes sport noun", 16, 78, 45, 0.81, 3.4, "sae"),
  node("logit-basketball", "“basketball” logit", "Target completion", 18, 94, 45, 0.97, 4.6, "logit"),
];

const jordanEdges = [
  edge("tok-michael", "attn-name", 0.27, "attention"),
  edge("tok-jordan", "attn-name", 0.69, "attention"),
  edge("attn-name", "sae-athlete", 0.77, "residual"),
  edge("tok-jordan", "sae-country", -0.36, "residual"),
  edge("sae-athlete", "mlp-basketball", 0.92, "mlp"),
  edge("sae-country", "mlp-basketball", -0.22, "mlp"),
  edge("mlp-basketball", "sae-sport", 0.86, "residual"),
  edge("error-jordan", "sae-sport", -0.14, "error"),
  edge("sae-sport", "logit-basketball", 0.96, "logit"),
];

const currencyFeatures = [
  node("tok-mexico", "Mexico", "Source country", 0, 4, 20, 0.51, 1.9, "token"),
  node("tok-peso", "peso", "Source currency", 0, 4, 50, 0.42, 1.5, "token"),
  node("tok-thailand", "Thailand", "Target country", 0, 4, 80, 0.69, 2.5, "token"),
  node("attn-analogy", "Analogy binder", "Connects source and target relation", 5, 23, 45, 0.77, 2.9, "attention"),
  node("mlp-currency", "Currency relation", "Country → legal tender schema", 9, 40, 28, 0.82, 3.1, "mlp"),
  node("sae-thailand", "Thailand geography", "Target-country feature", 10, 42, 76, 0.58, 2.1, "sae"),
  node("sae-baht", "Thai baht", "Target currency recall", 13, 61, 38, 0.93, 4.0, "sae", {
    influential: true,
    examples: ["Thai baht", "฿", "currency of Thailand"],
  }),
  node("sae-ringgit", "Ringgit competitor", "Nearby currency competitor", 13, 61, 75, -0.29, -1.0, "sae"),
  node("error-currency", "Unexplained residual", "Pruned contribution", 15, 75, 82, -0.12, -0.3, "error"),
  node("attn-final", "Final-position writer", "Copies target currency", 17, 82, 43, 0.71, 2.6, "attention"),
  node("logit-baht", "“baht” logit", "Target completion", 18, 95, 43, 0.96, 4.4, "logit"),
];

const currencyEdges = [
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
];

const additionFeatures = [
  node("tok-36", "36", "First addend", 0, 4, 18, 0.42, 1.5, "token"),
  node("tok-plus", "+", "Addition operator", 0, 4, 48, 0.37, 1.3, "token"),
  node("tok-59", "59", "Second addend", 0, 4, 78, 0.46, 1.7, "token"),
  node("attn-digits", "Digit-position binder", "Aligns ones and tens columns", 3, 20, 32, 0.64, 2.4, "attention"),
  node("mlp-ones", "6 + 9 → 15", "Ones-column sum", 7, 36, 20, 0.79, 3.0, "mlp"),
  node("sae-carry", "Carry-one feature", "Carries one into tens column", 9, 48, 48, 0.92, 4.2, "sae", {
    influential: true,
    examples: ["36 + 59", "47 + 38", "68 + 27"],
  }),
  node("mlp-tens", "3 + 5 + 1 → 9", "Tens-column composition", 12, 62, 24, 0.87, 3.5, "mlp"),
  node("sae-no-carry", "No-carry competitor", "Alternative arithmetic path", 10, 50, 80, -0.33, -1.1, "sae"),
  node("error-math", "Unexplained residual", "Pruned contribution", 13, 67, 79, -0.16, -0.5, "error"),
  node("attn-format", "Answer formatter", "Orders tens and ones output", 15, 78, 43, 0.66, 2.4, "attention"),
  node("sae-95", "Ninety-five feature", "Combined answer feature", 17, 87, 43, 0.83, 3.6, "sae"),
  node("logit-95", "“95” logit", "Target completion", 18, 97, 43, 0.95, 4.3, "logit"),
];

const additionEdges = [
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
];

function measurements(
  baselineLogit: number,
  alternative: string,
  answer: string,
  firstLayer: number,
  changedNodeIds: string[],
): Record<InterventionMode, StoredMeasurement> {
  return {
    suppress: {
      baselineLogit,
      resultLogit: baselineLogit - 2.46,
      predictedDelta: -2.18,
      changedNodeIds,
      firstLayer,
      result: alternative,
      completionProbability: 61.8,
      note: "Stored high-score ablation fixture.",
    },
    amplify: {
      baselineLogit,
      resultLogit: baselineLogit + 0.72,
      predictedDelta: 0.66,
      changedNodeIds,
      firstLayer,
      result: answer,
      completionProbability: 97.9,
      note: "Stored 1.8× activation fixture.",
    },
    patch: {
      baselineLogit,
      resultLogit: baselineLogit - 1.84,
      predictedDelta: -1.63,
      changedNodeIds,
      firstLayer,
      result: alternative,
      completionProbability: 68.4,
      note: "Stored aligned-contrast patch fixture.",
    },
  };
}

export const demos: Demo[] = [
  {
    id: "factual-recall",
    eyebrow: "Entity association",
    title: "Jordan → basketball",
    task: "Factual recall",
    prompt: "Michael Jordan is best known for playing the sport of",
    contrastPrompt: "The country of Jordan is located in",
    model: "Gemma 2 2B · reference target",
    answer: "basketball",
    alternative: "baseball",
    completionProbability: 94.2,
    baselineLogit: 4.21,
    focusFeature: "mlp-basketball",
    focusLabel: "Basketball association",
    divergenceLayer: 12,
    explanation:
      "A locally authored, deterministic circuit fixture shaped after public circuit-tracer examples. It is a hypothesis contract, not a downloaded model trace.",
    features: jordanFeatures,
    edges: jordanEdges,
    measurements: measurements(4.21, "baseball", "basketball", 12, [
      "mlp-basketball",
      "sae-sport",
      "logit-basketball",
    ]),
    manifest: manifest(
      "jordan-basketball-v2",
      "sha256:64b65da1e63b8107f990fc2240134874c1c494191d05c5561fcd767d9f754e7c",
      "sha256:ed3a427054aa5ef1c1be62ceef8a023a3a0ce9724c67e09be732b9ac228bc7c2",
    ),
    versionDiff: {
      baselineComponent: "L12 · Basketball association",
      baselineInfluence: 0.94,
      comparisonName: "contrast fixture",
      comparisonComponent: "L8 · Country-name competitor",
      comparisonInfluence: -0.36,
      layerShift: -4,
      causalPrecisionDelta: -8.2,
      interpretation: "The aligned contrast follows a different geographic branch.",
    },
  },
  {
    id: "translation",
    eyebrow: "Relational analogy",
    title: "Peso → baht",
    task: "Currency analogy",
    prompt: "Mexico uses the peso; Thailand uses the",
    contrastPrompt: "Mexico uses the peso; Malaysia uses the",
    model: "Gemma 2 2B · reference target",
    answer: "baht",
    alternative: "ringgit",
    completionProbability: 92.7,
    baselineLogit: 3.82,
    focusFeature: "sae-baht",
    focusLabel: "Thai baht",
    divergenceLayer: 13,
    explanation:
      "Distinct analogy topology with country, relation, currency, competitor, and dictionary-error paths.",
    features: currencyFeatures,
    edges: currencyEdges,
    measurements: measurements(3.82, "ringgit", "baht", 13, [
      "sae-baht",
      "attn-final",
      "logit-baht",
    ]),
    manifest: manifest(
      "peso-baht-v2",
      "sha256:682f99152d147b46c7278f02165bdea37d6939816dca1c249d4d1ed85a9b4446",
      "sha256:4a8a8c2920c1c31801d0084675ad619e5358fa48e1dd785c48db84879c484f6e",
    ),
    versionDiff: {
      baselineComponent: "L13 · Thai baht",
      baselineInfluence: 0.93,
      comparisonName: "Malaysia contrast",
      comparisonComponent: "L13 · Ringgit competitor",
      comparisonInfluence: 0.81,
      layerShift: 0,
      causalPrecisionDelta: -5.4,
      interpretation: "The contrast keeps the relation path and swaps the target-currency feature.",
    },
  },
  {
    id: "refusal",
    eyebrow: "Abbreviation",
    title: "Expansion → NASA",
    task: "Acronym completion",
    prompt: "National Aeronautics and Space Administration is abbreviated",
    contrastPrompt: "North Atlantic Treaty Organization is abbreviated",
    model: "Gemma 2 2B · reference target",
    answer: "NASA",
    alternative: "NATO",
    completionProbability: 96.1,
    baselineLogit: 4.64,
    focusFeature: "sae-nasa",
    focusLabel: "NASA feature",
    divergenceLayer: 12,
    explanation:
      "Distinct multi-token abbreviation path with an explicit unexplained residual node.",
    features: acronymFeatures,
    edges: acronymEdges,
    measurements: measurements(4.64, "NATO", "NASA", 12, [
      "sae-nasa",
      "attn-output",
      "logit-nasa",
    ]),
    manifest: manifest(
      "acronym-nasa-v2",
      "sha256:0de4b106d8a2be14ef7450e358b22ad94b8abf8c790b6bd38e6809227cb40c60",
      "sha256:f17ed73e509f6270b54f76f36020771ddd0b379438eee551666f8fa0ee1034dd",
    ),
    versionDiff: {
      baselineComponent: "L12 · NASA feature",
      baselineInfluence: 0.91,
      comparisonName: "NATO contrast",
      comparisonComponent: "L9 · Acronym schema",
      comparisonInfluence: 0.86,
      layerShift: -3,
      causalPrecisionDelta: -3.7,
      interpretation: "Shared acronym composition precedes the organization-specific branch.",
    },
  },
  {
    id: "arithmetic",
    eyebrow: "Algorithmic",
    title: "Two-digit carry",
    task: "Addition",
    prompt: "Compute: 36 + 59 =",
    contrastPrompt: "Compute: 31 + 58 =",
    model: "Gemma 2 2B · reference target",
    answer: "95",
    alternative: "85",
    completionProbability: 91.3,
    baselineLogit: 3.57,
    focusFeature: "sae-carry",
    focusLabel: "Carry-one feature",
    divergenceLayer: 9,
    explanation:
      "Distinct arithmetic topology separates digit binding, ones-column sum, carry, tens composition, formatting, and error flow.",
    features: additionFeatures,
    edges: additionEdges,
    measurements: measurements(3.57, "85", "95", 9, [
      "sae-carry",
      "mlp-tens",
      "attn-format",
      "sae-95",
      "logit-95",
    ]),
    manifest: manifest(
      "addition-carry-v2",
      "sha256:266c40e0d8ebfb5afca5bf1e652cf56fbfcaa40e042f2a5d781156e41ab0b8bd",
      "sha256:a514b27ede8782fbb6d1b0a067993d4037f5a1fca83c02a5e326eae2680e9023",
    ),
    versionDiff: {
      baselineComponent: "L9 · Carry-one feature",
      baselineInfluence: 0.92,
      comparisonName: "no-carry contrast",
      comparisonComponent: "L10 · No-carry competitor",
      comparisonInfluence: -0.33,
      layerShift: 1,
      causalPrecisionDelta: -6.1,
      interpretation: "The contrast bypasses carry and preserves the answer-formatting path.",
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
    note: "Replay the stored zero-ablation result for this fixture.",
    scale: 0,
  },
  amplify: {
    verb: "Amplify",
    branch: "activation × 1.80",
    note: "Replay the stored 1.8× activation result for this fixture.",
    scale: 1.8,
  },
  patch: {
    verb: "Patch",
    branch: "source: aligned contrast",
    note: "Replay the stored aligned-contrast activation patch.",
    scale: 0.32,
  },
};

/**
 * Replays a stored result from a deterministic local artifact.
 *
 * No model executes in the browser. The returned observed/predicted deltas are
 * fields in the authored fixture and are always presented with evidenceClass.
 */
export function runFixtureIntervention(
  demo: Demo,
  selected: CircuitFeature,
  mode: InterventionMode,
): InterventionOutcome {
  const stored = demo.measurements[mode];
  const isFocus = selected.id === demo.focusFeature;
  const scale = interventionCopy[mode].scale;
  const result = isFocus
    ? stored
    : {
        baselineLogit: demo.baselineLogit,
        resultLogit: demo.baselineLogit - 0.03,
        predictedDelta: -0.02,
        changedNodeIds: [],
        firstLayer: null,
        result: demo.answer,
        completionProbability: demo.completionProbability - 0.4,
        note: "Stored negative-control fixture.",
      };
  const observedLogitDelta = Number(
    (result.resultLogit - result.baselineLogit).toFixed(2),
  );
  const predictedLogitDelta = Number(result.predictedDelta.toFixed(2));

  return {
    answer: result.result,
    completionProbability: result.completionProbability,
    answerChanged: result.result !== demo.answer,
    firstLayer: result.firstLayer,
    changedNodeIds: result.changedNodeIds,
    selectedContributionBefore: selected.contribution,
    selectedContributionAfter: Number((selected.contribution * scale).toFixed(4)),
    baselineLogit: result.baselineLogit,
    resultLogit: result.resultLogit,
    observedLogitDelta,
    predictedLogitDelta,
    unexplainedResidual: Number(
      (observedLogitDelta - predictedLogitDelta).toFixed(2),
    ),
    evidenceClass: "deterministic-fixture",
    explanation:
      result.firstLayer === null
        ? "Stored negative control: no downstream fixture nodes changed."
        : `${interventionCopy[mode].verb} replay begins at layer ${result.firstLayer}. ${result.note}`,
  };
}
