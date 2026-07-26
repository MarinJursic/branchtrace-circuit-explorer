"use client";

import { useEffect, useMemo, useState } from "react";
import {
  demos,
  interventionCopy,
  runFixtureIntervention,
  type CircuitEdge,
  type CircuitFeature,
  type CircuitView,
  type Demo,
  type InterventionMode,
} from "./circuit-data";
import {
  layoutGraphPoints,
  layoutRiverPoints,
  validationBarPercent,
} from "./workbench-utils";

type Theme = "light" | "dark";
type TraceView = CircuitView | "table";

function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>("light");
  const nextTheme = theme === "light" ? "dark" : "light";

  useEffect(() => {
    setTheme(
      document.documentElement.dataset.theme === "dark" ? "dark" : "light",
    );
  }, []);

  function toggleTheme() {
    document.documentElement.dataset.theme = nextTheme;
    document.documentElement.style.colorScheme = nextTheme;
    try {
      window.localStorage.setItem("branchtrace-theme", nextTheme);
    } catch {
      // The visual preference still applies when storage is unavailable.
    }
    setTheme(nextTheme);
  }

  return (
    <button
      className="text-action"
      type="button"
      onClick={toggleTheme}
      aria-label={`Switch to ${nextTheme} theme`}
      aria-pressed={theme === "dark"}
      data-testid="theme-toggle"
      suppressHydrationWarning
    >
      <span aria-hidden="true">{theme === "light" ? "Dark" : "Light"}</span>
      <i aria-hidden="true" />
    </button>
  );
}

function StudyIndex({
  active,
  onOpen,
}: {
  active: Demo;
  onOpen: (demo: Demo) => void;
}) {
  return (
    <nav className="study-index" aria-label="Fixture studies">
      <p>Choose a stored study</p>
      <div>
        {demos.map((demo, index) => (
          <button
            type="button"
            key={demo.id}
            className={demo.id === active.id ? "active" : ""}
            onClick={() => onOpen(demo)}
            aria-pressed={demo.id === active.id}
            data-testid={`demo-${demo.id}`}
          >
            <span>{String(index + 1).padStart(2, "0")}</span>
            <strong>{demo.title}</strong>
            <small>{demo.task}</small>
          </button>
        ))}
      </div>
    </nav>
  );
}

function GraphCanvas({
  demo,
  selectedId,
  onSelect,
  view,
  changedIds,
  firstLayer,
  query,
}: {
  demo: Demo;
  selectedId: string;
  onSelect: (id: string) => void;
  view: CircuitView;
  changedIds: string[];
  firstLayer: number | null;
  query: string;
}) {
  const featureById = useMemo(
    () => new Map(demo.features.map((feature) => [feature.id, feature])),
    [demo.features],
  );
  const positions = useMemo(() => {
    if (view === "river") return layoutRiverPoints(demo.features);
    return layoutGraphPoints(demo.features);
  }, [demo.features, view]);
  const loweredQuery = query.trim().toLowerCase();
  const relatedIds = useMemo(() => {
    const ids = new Set([selectedId]);
    for (const edge of demo.edges) {
      if (edge.source === selectedId) ids.add(edge.target);
      if (edge.target === selectedId) ids.add(edge.source);
    }
    return ids;
  }, [demo.edges, selectedId]);

  const matchesQuery = (feature: CircuitFeature) =>
    !loweredQuery ||
    `${feature.label} ${feature.detail} ${feature.kind} ${feature.layer}`
      .toLowerCase()
      .includes(loweredQuery);
  const compactFeatures = [...demo.features].sort((a, b) => {
    if (view === "river") {
      return (
        a.layer - b.layer ||
        Number(a.kind === "error") - Number(b.kind === "error") ||
        b.contribution - a.contribution
      );
    }
    const aPoint = positions.get(a.id);
    const bPoint = positions.get(b.id);
    return (
      (aPoint?.x ?? 0) - (bPoint?.x ?? 0) ||
      (aPoint?.y ?? 0) - (bPoint?.y ?? 0)
    );
  });

  return (
    <div
      className={`graph-surface view-${view}`}
      data-testid={view === "graph" ? "circuit-graph" : "layer-river"}
      role="group"
      aria-label={
        view === "graph"
          ? "Circuit graph. Select a node to inspect its evidence."
          : "Layer River. Nodes are arranged from input to output by fixture depth."
      }
    >
      <p className="sr-only">
        {demo.features.length} nodes and {demo.edges.length} directed edges.
        Positive and negative paths use both labels and different line patterns.
      </p>
      <div className="graph-plane">
        <svg viewBox="0 0 1000 520" preserveAspectRatio="none" aria-hidden="true">
          <defs>
            <marker
              id="flow-arrow"
              markerWidth="8"
              markerHeight="8"
              refX="7"
              refY="3"
              orient="auto"
            >
              <path d="M0,0 L0,6 L8,3 z" />
            </marker>
          </defs>

          {view === "river" &&
            [...new Set(demo.features.map((feature) => feature.layer))].map(
              (layer) => {
                const x = (8 + (layer / 18) * 84) * 10;
                return (
                  <g className="layer-guide" key={layer}>
                    <line x1={x} y1="48" x2={x} y2="485" />
                    <text x={x} y="29">
                      L{layer}
                    </text>
                  </g>
                );
              },
            )}

          {demo.edges.map((edge: CircuitEdge) => {
            const source = featureById.get(edge.source);
            const target = featureById.get(edge.target);
            const sourcePosition = positions.get(edge.source);
            const targetPosition = positions.get(edge.target);
            if (!source || !target || !sourcePosition || !targetPosition)
              return null;
            const x1 = sourcePosition.x * 10;
            const y1 = sourcePosition.y * 5.2;
            const x2 = targetPosition.x * 10;
            const y2 = targetPosition.y * 5.2;
            const bend = Math.max(42, Math.abs(x2 - x1) * 0.38);
            const connected =
              edge.source === selectedId || edge.target === selectedId;
            const changed =
              changedIds.includes(edge.source) ||
              changedIds.includes(edge.target);
            const searched =
              matchesQuery(source) || matchesQuery(target);
            const path = `M ${x1} ${y1} C ${x1 + bend} ${y1}, ${
              x2 - bend
            } ${y2}, ${x2} ${y2}`;

            return (
              <g key={`${edge.source}-${edge.target}`}>
                <path
                  d={path}
                  className={[
                    "graph-edge",
                    edge.contribution < 0 ? "negative" : "positive",
                    edge.path === "error" ? "error" : "",
                    connected ? "connected" : "",
                    changed ? "changed" : "",
                    loweredQuery && !searched ? "search-dimmed" : "",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                  style={{
                    strokeWidth: connected
                      ? 2.2 + Math.abs(edge.contribution) * 3
                      : 1 + Math.abs(edge.contribution) * 2,
                  }}
                  markerEnd="url(#flow-arrow)"
                />
                {connected && (
                  <text
                    className="edge-label"
                    x={(x1 + x2) / 2}
                    y={(y1 + y2) / 2 - 9}
                  >
                    {edge.path} · {edge.contribution > 0 ? "+" : ""}
                    {edge.contribution.toFixed(2)}
                  </text>
                )}
              </g>
            );
          })}
        </svg>

        {demo.features.map((feature: CircuitFeature) => {
          const position = positions.get(feature.id);
          if (!position) return null;
          const selected = feature.id === selectedId;
          const matched = matchesQuery(feature);
          return (
            <button
              type="button"
              key={feature.id}
              className={[
                "trace-node",
                `kind-${feature.kind}`,
                selected ? "selected" : "",
                relatedIds.has(feature.id) ? "related" : "",
                changedIds.includes(feature.id) ? "changed" : "",
                !matched ? "search-dimmed" : "",
              ]
                .filter(Boolean)
                .join(" ")}
              style={{ left: `${position.x}%`, top: `${position.y}%` }}
              onClick={() => onSelect(feature.id)}
              aria-pressed={selected}
              aria-label={`${feature.label}, ${feature.kind}, layer ${feature.layer}, attribution ${feature.contribution.toFixed(2)}`}
              data-testid={
                view === "river"
                  ? `node-${feature.id}`
                  : `graph-node-${feature.id}`
              }
            >
              <span>
                L{feature.layer} / {feature.kind}
              </span>
              <strong>{feature.label}</strong>
              <small>
                {feature.contribution > 0 ? "+" : ""}
                {feature.contribution.toFixed(2)}
              </small>
            </button>
          );
        })}

        {firstLayer !== null && (
          <div
            className="divergence-marker"
            style={{ left: `${8 + (firstLayer / 18) * 84}%` }}
            data-testid="divergence-marker"
          >
            <span>First stored change · L{firstLayer}</span>
          </div>
        )}
      </div>
      <div
        className="mobile-trace-overview"
        role="group"
        aria-label={`Compact ${view} overview`}
      >
        <header>
          <strong>
            {view === "graph" ? "Topology overview" : "Layer overview"}
          </strong>
          <span>Use Table to select a component</span>
        </header>
        <ol aria-label={`Compact ${view} nodes`}>
          {compactFeatures.map((feature) => (
            <li
              key={feature.id}
              className={[
                feature.id === selectedId ? "selected" : "",
                changedIds.includes(feature.id) ? "changed" : "",
                !matchesQuery(feature) ? "search-dimmed" : "",
              ]
                .filter(Boolean)
                .join(" ")}
              aria-current={feature.id === selectedId ? "true" : undefined}
            >
              <span>
                L{feature.layer} · {feature.kind}
              </span>
              <strong>{feature.label}</strong>
              <small>
                {feature.contribution > 0 ? "+" : ""}
                {feature.contribution.toFixed(2)}
              </small>
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}

function AccessibleNodeTable({
  demo,
  selected,
  onSelect,
  query,
}: {
  demo: Demo;
  selected: string;
  onSelect: (id: string) => void;
  query: string;
}) {
  const loweredQuery = query.trim().toLowerCase();
  const visibleFeatures = demo.features.filter((feature) =>
    `${feature.label} ${feature.detail} ${feature.kind} ${feature.layer}`
      .toLowerCase()
      .includes(loweredQuery),
  );

  return (
    <div className="node-table-wrap">
      <table aria-label="Accessible circuit node table">
        <thead>
          <tr>
            <th scope="col">Layer</th>
            <th scope="col">Component</th>
            <th scope="col">Interpretation</th>
            <th scope="col">Attribution</th>
            <th scope="col">Activation</th>
          </tr>
        </thead>
        <tbody>
          {visibleFeatures.map((feature) => (
            <tr
              key={feature.id}
              className={feature.id === selected ? "selected" : ""}
            >
              <td>L{feature.layer}</td>
              <td>{feature.kind}</td>
              <td>
                <button type="button" onClick={() => onSelect(feature.id)}>
                  {feature.label}
                </button>
              </td>
              <td>
                {feature.contribution > 0 ? "+" : ""}
                {feature.contribution.toFixed(2)}
              </td>
              <td>{feature.activationSigma.toFixed(2)}σ</td>
            </tr>
          ))}
          {visibleFeatures.length === 0 && (
            <tr>
              <td colSpan={5}>No nodes match “{query}”.</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

function FeatureEvidence({
  feature,
  manifestId,
}: {
  feature: CircuitFeature;
  manifestId: string;
}) {
  return (
    <aside className="feature-evidence" aria-label="Selected node evidence">
      <p className="section-kicker">Selected component</p>
      <div className="feature-heading">
        <span>{feature.kind}</span>
        <h3>{feature.label}</h3>
        <p>{feature.detail}</p>
      </div>
      <dl>
        <div>
          <dt>Fixture depth</dt>
          <dd>
            L{feature.layer} <small>of L18</small>
          </dd>
        </div>
        <div>
          <dt>Attribution</dt>
          <dd>
            {feature.contribution > 0 ? "+" : ""}
            {feature.contribution.toFixed(3)}
          </dd>
        </div>
        <div>
          <dt>Activation</dt>
          <dd>{feature.activationSigma.toFixed(2)}σ</dd>
        </div>
      </dl>
      <div className="stored-examples">
        <h4>Stored activation examples</h4>
        {feature.examples?.length ? (
          <ul>
            {feature.examples.map((example) => (
              <li key={example}>{example}</li>
            ))}
          </ul>
        ) : (
          <p>No token examples are stored for this fixture node.</p>
        )}
      </div>
      <p className="artifact-reference">
        Artifact <strong>{manifestId}</strong>
      </p>
    </aside>
  );
}

function StepHeading({
  number,
  title,
  description,
}: {
  number: string;
  title: string;
  description: string;
}) {
  return (
    <header className="step-heading">
      <span>{number}</span>
      <div>
        <p>Research step</p>
        <h2>{title}</h2>
      </div>
      <p>{description}</p>
    </header>
  );
}

export function BranchTraceApp() {
  const [demoId, setDemoId] = useState(demos[0].id);
  const [selectedFeature, setSelectedFeature] = useState(demos[0].focusFeature);
  const [mode, setMode] = useState<InterventionMode>("suppress");
  const [branched, setBranched] = useState(false);
  const [view, setView] = useState<TraceView>("graph");
  const [query, setQuery] = useState("");

  const demo = useMemo(
    () => demos.find((item) => item.id === demoId) ?? demos[0],
    [demoId],
  );
  const selected =
    demo.features.find((feature) => feature.id === selectedFeature) ??
    demo.features.find((feature) => feature.id === demo.focusFeature) ??
    demo.features[0];
  const outcome = useMemo(
    () => runFixtureIntervention(demo, selected, mode),
    [demo, mode, selected],
  );
  const validationMetrics = [
    { label: "Attributed effect", value: outcome.predictedLogitDelta },
    { label: "Stored intervention", value: outcome.observedLogitDelta },
    { label: "Unexplained residual", value: outcome.unexplainedResidual },
  ];
  const validationMaximum = Math.max(
    0.01,
    ...validationMetrics.map((metric) => Math.abs(metric.value)),
  );

  function openDemo(next: Demo) {
    setDemoId(next.id);
    setSelectedFeature(next.focusFeature);
    setMode("suppress");
    setBranched(false);
    setQuery("");
    setView("graph");
  }

  function selectFeature(id: string) {
    setSelectedFeature(id);
    setBranched(false);
  }

  return (
    <main className="branchtrace-shell">
      <header className="masthead">
        <a className="brand" href="#top" aria-label="BranchTrace home">
          <span aria-hidden="true">BT</span>
          <strong>BranchTrace</strong>
        </a>
        <p>
          Circuit hypotheses,
          <br />
          tested by intervention.
        </p>
        <div className="masthead-actions">
          <span>Authored fixtures · no model running</span>
          <ThemeToggle />
        </div>
      </header>

      <div id="top" />
      <StudyIndex active={demo} onOpen={openDemo} />

      <header className="study-lede">
        <div>
          <p>{demo.eyebrow}</p>
          <h1>{demo.title}</h1>
        </div>
        <blockquote>
          <span>Prompt</span>
          <p>{demo.prompt}</p>
        </blockquote>
        <div className="completion">
          <span>Stored completion</span>
          <strong>{demo.answer}</strong>
          <small>{demo.model}</small>
        </div>
      </header>

      <nav className="story-rail" aria-label="Study workflow">
        <a href="#trace">
          <span>01</span> Trace
        </a>
        <i aria-hidden="true" />
        <a href="#intervene">
          <span>02</span> Intervene
        </a>
        <i aria-hidden="true" />
        <a href="#validate">
          <span>03</span> Validate
        </a>
      </nav>

      <section className="notebook-step" id="trace">
        <StepHeading
          number="01"
          title="Trace the candidate circuit"
          description="Read the topology, then select a component. Width encodes the magnitude of its authored fixture contribution; dashed paths are negative or unexplained flow."
        />

        <div className="trace-toolbar">
          <label>
            <span>Find a component</span>
            <input
              id="feature-search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Name, kind, or layer"
              aria-label="Search circuit features"
            />
          </label>
          <div className="view-switcher" role="group" aria-label="Trace view">
            {(
              [
                ["graph", "Graph"],
                ["river", "River"],
                ["table", "Table"],
              ] as Array<[TraceView, string]>
            ).map(([id, label]) => (
              <button
                type="button"
                key={id}
                className={view === id ? "active" : ""}
                aria-pressed={view === id}
                onClick={() => setView(id)}
                data-testid={`view-${id}`}
              >
                {label}
              </button>
            ))}
          </div>
          <div className="trace-legend" aria-label="Path legend">
            <span>
              <i className="positive" /> Positive
            </span>
            <span>
              <i className="negative" /> Negative / residual
            </span>
            <span>
              <i className="branch" /> Changed after branch
            </span>
          </div>
        </div>

        <div className="trace-workspace">
          <section className="trace-visual" aria-label="Circuit trace">
            {view === "table" ? (
              <AccessibleNodeTable
                demo={demo}
                selected={selected.id}
                query={query}
                onSelect={selectFeature}
              />
            ) : (
              <GraphCanvas
                demo={demo}
                selectedId={selected.id}
                onSelect={selectFeature}
                view={view}
                changedIds={branched ? outcome.changedNodeIds : []}
                firstLayer={branched ? outcome.firstLayer : null}
                query={query}
              />
            )}
          </section>
          <FeatureEvidence
            feature={selected}
            manifestId={demo.manifest.artifactId}
          />
        </div>
      </section>

      <section className="notebook-step" id="intervene">
        <StepHeading
          number="02"
          title="Make one causal change"
          description="Choose an operation on the selected component and replay its stored counterfactual. This tests one fixture hypothesis; it does not expose a private reasoning trace."
        />

        <div className="intervention-layout">
          <section className="prompt-pair" aria-label="Intervention prompts">
            <div>
              <span>Clean prompt</span>
              <p>{demo.prompt}</p>
            </div>
            <div>
              <span>Aligned contrast</span>
              <p>{demo.contrastPrompt}</p>
            </div>
          </section>

          <section className="branch-controls" aria-label="Branch controls">
            <p>
              Target <strong>{selected.label}</strong> at L{selected.layer}
            </p>
            <fieldset>
              <legend>Intervention</legend>
              {(["suppress", "amplify", "patch"] as InterventionMode[]).map(
                (item) => (
                  <label key={item}>
                    <input
                      type="radio"
                      name="intervention-mode"
                      value={item}
                      checked={mode === item}
                      onChange={() => {
                        setMode(item);
                        setBranched(false);
                      }}
                      data-testid={`mode-${item}`}
                    />
                    <span>
                      <strong>{interventionCopy[item].verb}</strong>
                      <small>{interventionCopy[item].note}</small>
                    </span>
                  </label>
                ),
              )}
            </fieldset>
            <button
              type="button"
              className="run-branch"
              onClick={() => setBranched(true)}
              data-testid="run-intervention"
            >
              Run stored branch
              <span aria-hidden="true">→</span>
            </button>
          </section>

          <section
            className={`branch-result ${branched ? "ready" : ""}`}
            data-testid="branch-result"
            aria-live="polite"
          >
            {branched ? (
              <>
                <div className="result-callout">
                  <span>Stored branch output</span>
                  <strong>{outcome.answer}</strong>
                  <small>
                    {outcome.answerChanged
                      ? "Output changed"
                      : "Output preserved"}
                  </small>
                </div>
                <dl>
                  <div>
                    <dt>Baseline logit</dt>
                    <dd>{outcome.baselineLogit.toFixed(2)}</dd>
                  </div>
                  <div>
                    <dt>Result logit</dt>
                    <dd>{outcome.resultLogit.toFixed(2)}</dd>
                  </div>
                  <div>
                    <dt>Observed fixture Δ</dt>
                    <dd>{outcome.observedLogitDelta.toFixed(2)}</dd>
                  </div>
                  <div>
                    <dt>First stored change</dt>
                    <dd>
                      {outcome.firstLayer === null
                        ? "None detected"
                        : `Layer ${outcome.firstLayer}`}
                    </dd>
                  </div>
                </dl>
                <div
                  className="changed-components"
                  data-testid="changed-components"
                >
                  <span>Downstream changes</span>
                  <strong>
                    {outcome.changedNodeIds.length
                      ? outcome.changedNodeIds
                          .map(
                            (id) =>
                              demo.features.find((feature) => feature.id === id)
                                ?.label,
                          )
                          .filter(Boolean)
                          .join(" → ")
                      : "No nodes crossed the stored threshold"}
                  </strong>
                </div>
                <button
                  type="button"
                  className="reset-branch"
                  onClick={() => setBranched(false)}
                >
                  Reset branch
                </button>
              </>
            ) : (
              <div className="awaiting-result">
                <span>Awaiting intervention</span>
                <p>
                  The result, changed path, and first stored divergence will
                  appear here.
                </p>
              </div>
            )}
          </section>
        </div>
      </section>

      <section className="notebook-step" id="validate">
        <StepHeading
          number="03"
          title="Compare attribution with outcome"
          description="A useful circuit hypothesis should survive intervention. The residual makes disagreement visible instead of turning an attribution score into confidence."
        />

        <div className={`validation-layout ${branched ? "ready" : ""}`}>
          <section className="validation-summary">
            <p className="section-kicker">Validation contract</p>
            <h3>
              {branched
                ? outcome.answerChanged
                  ? "The stored branch changes the output."
                  : "The stored branch preserves the output."
                : "Run the branch before interpreting the trace."}
            </h3>
            <p>
              For <strong>{selected.label}</strong>, the {mode} branch compares
              an authored attribution delta with an authored intervention delta.
              These values validate product behavior only.
            </p>
            {!branched && <a href="#intervene">Return to intervention ↑</a>}
          </section>

          <section className="validation-bars" aria-label="Validation values">
            {validationMetrics.map((metric) => (
              <div key={metric.label}>
                <span>{metric.label}</span>
                <i>
                  <b
                    style={{
                      width: `${
                        branched
                          ? validationBarPercent(
                              metric.value,
                              validationMaximum,
                            )
                          : 0
                      }%`,
                    }}
                  />
                </i>
                <strong>{branched ? metric.value.toFixed(2) : "—"}</strong>
              </div>
            ))}
          </section>

          <section className="version-contrast">
            <p className="section-kicker">
              Stored fixture contrast · not a live benchmark
            </p>
            <dl>
              <div>
                <dt>Baseline component</dt>
                <dd>
                  {demo.versionDiff.baselineComponent} ·{" "}
                  {demo.versionDiff.baselineInfluence.toFixed(2)}
                </dd>
              </div>
              <div>
                <dt>{demo.versionDiff.comparisonName}</dt>
                <dd>
                  {demo.versionDiff.comparisonComponent} ·{" "}
                  {demo.versionDiff.comparisonInfluence.toFixed(2)}
                </dd>
              </div>
              <div>
                <dt>Layer shift</dt>
                <dd>{demo.versionDiff.layerShift}</dd>
              </div>
              <div>
                <dt>Stored precision Δ</dt>
                <dd>{demo.versionDiff.causalPrecisionDelta.toFixed(1)} pp</dd>
              </div>
            </dl>
            <p>{demo.versionDiff.interpretation}</p>
          </section>
        </div>

        <details className="provenance" id="provenance">
          <summary>Inspect artifact provenance and limitations</summary>
          <div>
            <dl>
              <div>
                <dt>Artifact</dt>
                <dd>{demo.manifest.artifactId}</dd>
              </div>
              <div>
                <dt>Schema</dt>
                <dd>{demo.manifest.schemaVersion}</dd>
              </div>
              <div>
                <dt>Evidence</dt>
                <dd>{demo.manifest.evidenceClass}</dd>
              </div>
              <div>
                <dt>Model target</dt>
                <dd>{demo.manifest.modelTarget}</dd>
              </div>
              <div>
                <dt>Prompt hash</dt>
                <dd>{demo.manifest.promptHash}</dd>
              </div>
              <div>
                <dt>Artifact hash</dt>
                <dd>{demo.manifest.artifactHash}</dd>
              </div>
            </dl>
            <section>
              <p>{demo.manifest.caveat}</p>
              <a
                href={demo.manifest.sourceUrl}
                target="_blank"
                rel="noreferrer"
              >
                Read the public circuit-tracer source ↗
              </a>
            </section>
          </div>
        </details>
      </section>

      <footer className="page-footer">
        <strong>BranchTrace</strong>
        <p>
          Deterministic-fixture interface for testing circuit-analysis software.
        </p>
        <a href="#top">Back to top ↑</a>
      </footer>
    </main>
  );
}
