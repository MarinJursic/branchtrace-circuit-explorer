import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import ts from "typescript";

const source = await readFile(
  new URL("../app/circuit-data.ts", import.meta.url),
  "utf8",
);
const compiled = ts.transpileModule(source, {
  compilerOptions: {
    module: ts.ModuleKind.ESNext,
    target: ts.ScriptTarget.ES2022,
  },
}).outputText;
const circuitData = await import(
  `data:text/javascript;base64,${Buffer.from(compiled).toString("base64")}`
);

const { demos, runFixtureIntervention } = circuitData;

test("all studies include typed layer-river and circuit-graph data", () => {
  assert.equal(demos.length, 4);
  for (const demo of demos) {
    assert.equal(demo.features.length, 8);
    assert.equal(demo.edges.length, 10);
    assert.ok(demo.features.some((feature) => feature.kind === "attention"));
    assert.ok(demo.features.some((feature) => feature.kind === "mlp"));
    assert.ok(demo.features.some((feature) => feature.kind === "sae"));
    assert.ok(demo.features.every((feature) => Number.isFinite(feature.activationSigma)));
    assert.ok(demo.edges.some((edge) => edge.path === "residual"));
    assert.ok(demo.edges.some((edge) => edge.contribution < 0));
    assert.equal(
      demo.features.find((feature) => feature.id === "feature-812")?.detail,
      "Competing output path",
    );
  }
});

test("high-score suppress and patch change the factual answer downstream", () => {
  const demo = demos[0];
  const focus = demo.features.find((feature) => feature.id === demo.focusFeature);
  assert.ok(focus);

  const suppressed = runFixtureIntervention(demo, focus, "suppress");
  const patched = runFixtureIntervention(demo, focus, "patch");

  for (const outcome of [suppressed, patched]) {
    assert.equal(outcome.answer, "Lyon");
    assert.equal(outcome.answerChanged, true);
    assert.equal(outcome.firstLayer, 17);
    assert.deepEqual(outcome.changedNodeIds, ["feature-1092", "logit-paris"]);
  }
  assert.equal(suppressed.selectedContributionAfter, 0);
  assert.equal(patched.selectedContributionAfter, 0.2912);
});

test("amplification preserves the answer but changes meaningful downstream nodes", () => {
  const demo = demos[3];
  const focus = demo.features.find((feature) => feature.id === demo.focusFeature);
  assert.ok(focus);
  const result = runFixtureIntervention(demo, focus, "amplify");

  assert.equal(result.answer, "85");
  assert.equal(result.answerChanged, false);
  assert.equal(result.firstLayer, 15);
  assert.ok(result.confidence > demo.confidence);
});

test("low-score suppression is a negative control with no invented divergence", () => {
  const demo = demos[1];
  const lowScore = demo.features.find((feature) => feature.id === "feature-812");
  assert.ok(lowScore);
  const result = runFixtureIntervention(demo, lowScore, "suppress");

  assert.equal(result.answer, demo.answer);
  assert.equal(result.answerChanged, false);
  assert.equal(result.firstLayer, null);
  assert.deepEqual(result.changedNodeIds, []);
});

test("an output-logit intervention cannot diverge before its selected layer", () => {
  const demo = demos[0];
  const logit = demo.features.find((feature) => feature.id === "logit-paris");
  assert.ok(logit);
  const result = runFixtureIntervention(demo, logit, "suppress");

  assert.equal(result.firstLayer, 18);
  assert.deepEqual(result.changedNodeIds, ["logit-paris"]);
});
