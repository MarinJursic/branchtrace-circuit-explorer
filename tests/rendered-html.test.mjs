import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

async function render(path = "/") {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);
  return worker.fetch(
    new Request(`http://localhost${path}`, { headers: { accept: "text/html" } }),
    { ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) } },
    { waitUntil() {}, passThroughOnException() {} },
  );
}

test("server-renders the finished BranchTrace product shell", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);

  const html = await response.text();
  assert.match(html, /<title>BranchTrace — Model Circuit Explorer<\/title>/i);
  assert.match(html, /BranchTrace/);
  assert.match(html, /Model circuit explorer/i);
  assert.match(html, /Precomputed studies/i);
  assert.match(html, /Run branched execution/i);
  assert.match(html, /MODEL VERSION DIFF/i);
  assert.match(html, /Interpretation boundary/i);
  assert.match(html, /Switch to dark theme/i);
  assert.match(html, /model completion/i);
  assert.match(html, /8-node subgraph/i);
  assert.doesNotMatch(html, /codex-preview|Your site is taking shape|react-loading-skeleton/i);
});

test("ships interaction hooks and removes starter-only metadata", async () => {
  const [page, app, layout, packageJson] = await Promise.all([
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/branchtrace-app.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/layout.tsx", import.meta.url), "utf8"),
    readFile(new URL("../package.json", import.meta.url), "utf8"),
  ]);

  assert.match(page, /<BranchTraceApp \/>/);
  assert.match(app, /data-testid="run-intervention"/);
  assert.match(app, /data-testid="divergence-marker"/);
  assert.match(app, /data-testid="view-graph"/);
  assert.match(app, /data-testid="changed-components"/);
  assert.match(app, /data-testid="theme-toggle"/);
  assert.match(app, /runFixtureIntervention/);
  assert.match(app, /setBranched\(true\)/);
  assert.match(layout, /BranchTrace — Model Circuit Explorer/);
  assert.match(layout, /\/og\.png/);
  assert.match(layout, /branchtrace-theme/);
  assert.doesNotMatch(layout, /Starter Project|codex-preview/);
  assert.doesNotMatch(packageJson, /react-loading-skeleton/);
});
