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
  const signatures = new Set();
  for (const demo of demos) {
    assert.ok(demo.features.length >= 8);
    assert.ok(demo.edges.length >= 9);
    assert.ok(demo.features.some((feature) => feature.kind === "attention"));
    assert.ok(demo.features.some((feature) => feature.kind === "mlp"));
    assert.ok(demo.features.some((feature) => feature.kind === "sae"));
    assert.ok(demo.features.some((feature) => feature.kind === "error"));
    assert.ok(demo.features.every((feature) => Number.isFinite(feature.activationSigma)));
    assert.ok(demo.edges.some((edge) => edge.path === "residual"));
    assert.ok(demo.edges.some((edge) => edge.contribution < 0));
    assert.equal(demo.manifest.evidenceClass, "deterministic-fixture");
    assert.match(demo.manifest.caveat, /without model weights/i);
    assert.match(demo.manifest.promptHash, /^sha256:[a-f0-9]{64}$/);
    assert.match(demo.manifest.artifactHash, /^sha256:[a-f0-9]{64}$/);
    assert.ok(demo.versionDiff.interpretation.length > 20);
    signatures.add(demo.edges.map((edge) => `${edge.source}:${edge.target}`).join("|"));
  }
  assert.equal(signatures.size, demos.length);
});

test("stored suppress and patch measurements report logit effects and residuals", () => {
  const demo = demos[0];
  const focus = demo.features.find((feature) => feature.id === demo.focusFeature);
  assert.ok(focus);

  const suppressed = runFixtureIntervention(demo, focus, "suppress");
  const patched = runFixtureIntervention(demo, focus, "patch");

  for (const outcome of [suppressed, patched]) {
    assert.equal(outcome.answer, "baseball");
    assert.equal(outcome.answerChanged, true);
    assert.equal(outcome.firstLayer, 12);
    assert.deepEqual(outcome.changedNodeIds, [
      "mlp-basketball",
      "sae-sport",
      "logit-basketball",
    ]);
    assert.equal(outcome.evidenceClass, "deterministic-fixture");
    assert.equal(
      outcome.unexplainedResidual,
      Number((outcome.observedLogitDelta - outcome.predictedLogitDelta).toFixed(2)),
    );
  }
  assert.equal(suppressed.selectedContributionAfter, 0);
  assert.equal(patched.selectedContributionAfter, 0.3008);
});

test("amplification preserves the answer but changes meaningful downstream nodes", () => {
  const demo = demos[3];
  const focus = demo.features.find((feature) => feature.id === demo.focusFeature);
  assert.ok(focus);
  const result = runFixtureIntervention(demo, focus, "amplify");

  assert.equal(result.answer, "95");
  assert.equal(result.answerChanged, false);
  assert.equal(result.firstLayer, 9);
  assert.ok(result.completionProbability > demo.completionProbability);
});

test("non-focus suppression is an explicit negative-control artifact", () => {
  const demo = demos[0];
  const lowScore = demo.features.find((feature) => feature.id === "error-jordan");
  assert.ok(lowScore);
  const result = runFixtureIntervention(demo, lowScore, "suppress");

  assert.equal(result.answer, demo.answer);
  assert.equal(result.answerChanged, false);
  assert.equal(result.firstLayer, null);
  assert.deepEqual(result.changedNodeIds, []);
});

test("an unstored output-logit intervention remains a negative control", () => {
  const demo = demos[0];
  const logit = demo.features.find((feature) => feature.id === "logit-basketball");
  assert.ok(logit);
  const result = runFixtureIntervention(demo, logit, "suppress");

  assert.equal(result.firstLayer, null);
  assert.deepEqual(result.changedNodeIds, []);
});
