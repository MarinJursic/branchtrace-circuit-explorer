"use client";

import { useMemo, useState } from "react";
import {
  demos,
  interventionCopy,
  runFixtureIntervention,
  type CircuitEdge,
  type CircuitFeature,
  type CircuitView,
  type InterventionMode,
} from "./circuit-data";

type IconName =
  | "branch"
  | "layers"
  | "spark"
  | "compare"
  | "moon"
  | "sun"
  | "play"
  | "check"
  | "arrow"
  | "command"
  | "info";

function Icon({ name, size = 16 }: { name: IconName; size?: number }) {
  const glyphs: Record<IconName, string> = {
    branch: "⑂",
    layers: "▱",
    spark: "✦",
    compare: "⇄",
    moon: "◐",
    sun: "☼",
    play: "▶",
    check: "✓",
    arrow: "→",
    command: "⌘",
    info: "i",
  };
  return (
    <span className={`icon icon-${name}`} style={{ fontSize: size }} aria-hidden="true">
      {glyphs[name]}
    </span>
  );
}

type Theme = "light" | "dark";

function initialTheme(): Theme {
  if (typeof document === "undefined") return "light";
  return document.documentElement.dataset.theme === "dark" ? "dark" : "light";
}

function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>(initialTheme);
  const nextTheme = theme === "light" ? "dark" : "light";

  function toggleTheme() {
    document.documentElement.dataset.theme = nextTheme;
    document.documentElement.style.colorScheme = nextTheme;
    try {
      window.localStorage.setItem("branchtrace-theme", nextTheme);
    } catch {
      // The visual toggle still works when storage is unavailable.
    }
    setTheme(nextTheme);
  }

  return (
    <button
      className="theme-toggle"
      type="button"
      onClick={toggleTheme}
      aria-label={`Switch to ${nextTheme} theme`}
      aria-pressed={theme === "dark"}
      title={`Switch to ${nextTheme} theme`}
      data-testid="theme-toggle"
      suppressHydrationWarning
    >
      <Icon name={theme === "light" ? "sun" : "moon"} />
      <span suppressHydrationWarning>{theme === "light" ? "Light" : "Dark"}</span>
    </button>
  );
}

function LayerRiver({
  features,
  edges,
  selected,
  onSelect,
  changedNodeIds,
  firstLayer,
}: {
  features: CircuitFeature[];
  edges: CircuitEdge[];
  selected: string;
  onSelect: (id: string) => void;
  changedNodeIds: string[];
  firstLayer: number | null;
}) {
  const featureById = new Map(features.map((feature) => [feature.id, feature]));

  return (
    <div
      className="river-wrap"
      data-testid="layer-river"
      role="group"
      aria-label="Layer River contribution visualization"
    >
      <div className="layer-scale">
        {[0, 4, 9, 13, 17, 18].map((layer) => (
          <span key={layer} style={{ left: `${5 + (layer / 18) * 90}%` }}>
            L{layer}
          </span>
        ))}
      </div>
      <svg className="river-lines" viewBox="0 0 1000 430" preserveAspectRatio="none" aria-hidden="true">
        <defs>
          <linearGradient id="flow" x1="0" x2="1">
            <stop offset="0%" stopColor="#66d6bd" stopOpacity=".32" />
            <stop offset="60%" stopColor="#66d6bd" stopOpacity=".88" />
            <stop offset="100%" stopColor="#f2b267" stopOpacity=".86" />
          </linearGradient>
          <linearGradient id="negative" x1="0" x2="1">
            <stop offset="0%" stopColor="#90a1a1" stopOpacity=".18" />
            <stop offset="100%" stopColor="#d98175" stopOpacity=".72" />
          </linearGradient>
        </defs>
        {edges.map((edge) => {
          const from = featureById.get(edge.source);
          const to = featureById.get(edge.target);
          if (!from || !to) return null;
          const negative = edge.contribution < 0;
          const width = 3 + Math.abs(edge.contribution) * 9;
          return (
            <path
              key={`${from.id}-${to.id}`}
              d={`M ${from.x * 10} ${from.y * 4.3} C ${(from.x + 8) * 10} ${from.y * 4.3}, ${(to.x - 8) * 10} ${to.y * 4.3}, ${to.x * 10} ${to.y * 4.3}`}
              fill="none"
              stroke={negative ? "url(#negative)" : "url(#flow)"}
              strokeWidth={width}
              strokeLinecap="round"
              className={changedNodeIds.includes(to.id) ? "diverged-path" : ""}
            />
          );
        })}
        <path d="M 60 350 C 290 350, 335 285, 500 290 S 785 325, 940 318" className="residual-line" />
      </svg>
      <div className="river-label residual-label">residual stream</div>
      {features.map((feature, index) => {
        const isSelected = selected === feature.id;
        const diverged = changedNodeIds.includes(feature.id);
        return (
          <button
            key={feature.id}
            className={`circuit-node kind-${feature.kind} ${isSelected ? "selected" : ""} ${diverged ? "diverged" : ""}`}
            style={{ left: `${feature.x}%`, top: `${feature.y}%` }}
            onClick={() => onSelect(feature.id)}
            aria-pressed={isSelected}
            aria-label={`${feature.label}, ${feature.kind}, layer ${feature.layer}, contribution ${feature.contribution > 0 ? "positive " : "negative "}${Math.abs(feature.contribution).toFixed(2)}`}
            data-testid={`node-${feature.id}`}
          >
            <span className="node-index">{String(index + 1).padStart(2, "0")}</span>
            <span className="node-copy">
              <strong>{feature.label}</strong>
              <small>{feature.detail}</small>
            </span>
            <span className={feature.contribution >= 0 ? "node-score positive" : "node-score negative"}>
              {feature.contribution > 0 ? "+" : ""}
              {feature.contribution.toFixed(2)}
            </span>
          </button>
        );
      })}
      {firstLayer !== null && (
        <div
          className="divergence-pin"
          style={{ left: `${5 + (firstLayer / 18) * 90}%`, top: "10%" }}
          data-testid="divergence-marker"
        >
          <span>first divergence</span>
          <strong>L{firstLayer}</strong>
        </div>
      )}
    </div>
  );
}

function CircuitGraph({
  features,
  edges,
  selected,
  onSelect,
  changedNodeIds,
}: {
  features: CircuitFeature[];
  edges: CircuitEdge[];
  selected: string;
  onSelect: (id: string) => void;
  changedNodeIds: string[];
}) {
  const graphPositions = [
    { x: 8, y: 50 },
    { x: 27, y: 20 },
    { x: 27, y: 77 },
    { x: 47, y: 48 },
    { x: 66, y: 17 },
    { x: 66, y: 78 },
    { x: 82, y: 48 },
    { x: 92, y: 48 },
  ];
  const positions = new Map(
    features.map((feature, index) => [feature.id, graphPositions[index] ?? { x: 50, y: 50 }]),
  );

  return (
    <div
      className="network-wrap"
      data-testid="circuit-graph"
      role="group"
      aria-label="Node-link circuit graph"
    >
      <svg className="network-lines" viewBox="0 0 1000 430" preserveAspectRatio="none" aria-hidden="true">
        {edges.map((edge) => {
          const from = positions.get(edge.source);
          const to = positions.get(edge.target);
          if (!from || !to) return null;
          return (
            <g key={`${edge.source}-${edge.target}`}>
              <path
                d={`M ${from.x * 10} ${from.y * 4.3} L ${to.x * 10} ${to.y * 4.3}`}
                className={`${edge.contribution < 0 ? "negative" : "positive"} ${changedNodeIds.includes(edge.target) ? "changed" : ""}`}
                style={{ strokeWidth: 1.5 + Math.abs(edge.contribution) * 6 }}
              />
              <text
                x={((from.x + to.x) / 2) * 10}
                y={((from.y + to.y) / 2) * 4.3 - 6}
              >
                {edge.path}
              </text>
            </g>
          );
        })}
      </svg>
      {features.map((feature, index) => {
        const position = positions.get(feature.id) ?? { x: 50, y: 50 };
        const isSelected = selected === feature.id;
        return (
          <button
            key={feature.id}
            className={`graph-node kind-${feature.kind} ${isSelected ? "selected" : ""} ${changedNodeIds.includes(feature.id) ? "diverged" : ""}`}
            style={{ left: `${position.x}%`, top: `${position.y}%` }}
            onClick={() => onSelect(feature.id)}
            aria-pressed={isSelected}
            aria-label={`${feature.label}, ${feature.kind}, layer ${feature.layer}`}
            data-testid={`graph-node-${feature.id}`}
          >
            <span className="graph-node-kind">{feature.kind}</span>
            <strong>{feature.label}</strong>
            <small>L{feature.layer} · {feature.contribution > 0 ? "+" : ""}{feature.contribution.toFixed(2)}</small>
            <span className="sr-only">Node {index + 1} of {features.length}</span>
          </button>
        );
      })}
      <div className="graph-key" aria-hidden="true">
        <span>edge label = path type</span>
        <span>edge width = estimated contribution</span>
      </div>
    </div>
  );
}

function ConfidenceBar({ value, tone = "teal" }: { value: number; tone?: "teal" | "amber" }) {
  return (
    <div className="confidence-track" aria-label={`${value}% confidence`}>
      <span className={tone} style={{ width: `${value}%` }} />
    </div>
  );
}

export function BranchTraceApp() {
  const [demoId, setDemoId] = useState(demos[0].id);
  const [selectedFeature, setSelectedFeature] = useState(demos[0].focusFeature);
  const [mode, setMode] = useState<InterventionMode>("suppress");
  const [branched, setBranched] = useState(false);
  const [compareVersion, setCompareVersion] = useState(false);
  const [view, setView] = useState<CircuitView>("river");

  const demo = useMemo(() => demos.find((item) => item.id === demoId) ?? demos[0], [demoId]);
  const selected =
    demo.features.find((feature) => feature.id === selectedFeature) ??
    demo.features.find((feature) => feature.id === demo.focusFeature) ??
    demo.features[2];
  const outcome = useMemo(
    () => runFixtureIntervention(demo, selected, mode),
    [demo, selected, mode],
  );

  function selectDemo(id: string) {
    const next = demos.find((item) => item.id === id) ?? demos[0];
    setDemoId(next.id);
    setSelectedFeature(next.focusFeature);
    setBranched(false);
    setCompareVersion(false);
    setMode("suppress");
  }

  function selectFeature(id: string) {
    setSelectedFeature(id);
    setBranched(false);
  }

  return (
    <main className="app-shell">
      <header className="topbar">
        <div className="brand-lockup">
          <div className="brand-mark"><Icon name="branch" size={23} /></div>
          <div>
            <div className="brand-name">BranchTrace</div>
            <div className="brand-subtitle">Model circuit explorer</div>
          </div>
        </div>
        <nav className="topnav" aria-label="Primary navigation">
          <a className="active" href="#explorer">Explorer</a>
          <a href="#comparison">Comparisons</a>
          <a href="#method">Method notes</a>
        </nav>
        <div className="header-actions">
          <span className="status-pill"><span /> Cached model run</span>
          <ThemeToggle />
          <a className="docs-button" href="http://localhost:8000/docs" target="_blank" rel="noreferrer">
            API docs <Icon name="arrow" />
          </a>
        </div>
      </header>

      <section className="workspace" id="explorer">
        <aside className="demo-sidebar">
          <div className="sidebar-heading">
            <span>Precomputed studies</span>
          </div>
          <div className="demo-list">
            {demos.map((item, index) => (
              <button
                key={item.id}
                className={`demo-card ${demo.id === item.id ? "active" : ""}`}
                onClick={() => selectDemo(item.id)}
                aria-pressed={demo.id === item.id}
                data-testid={`demo-${item.id}`}
              >
                <span className="demo-number">0{index + 1}</span>
                <span>
                  <small>{item.eyebrow}</small>
                  <strong>{item.title}</strong>
                  <em>{item.task}</em>
                </span>
                <Icon name="arrow" />
              </button>
            ))}
          </div>
          <div className="sidebar-note" id="method">
            <Icon name="info" />
            <p>
              <strong>Interpretation boundary</strong>
              Graphs are compact, testable hypotheses from cached activation summaries—not a transcript of hidden reasoning.
            </p>
          </div>
        </aside>

        <section className="main-column">
          <div className="run-header">
            <div>
              <div className="eyebrow"><span /> ACTIVE RUN · {demo.eyebrow.toUpperCase()}</div>
              <h1>{demo.prompt}<span className="cursor" /></h1>
              <div className="run-meta">
                <span>{demo.model}</span>
                <span>fixture depth L0–L18</span>
                <span>fixture dictionary · 2,048 SAE features</span>
                <span>cached · deterministic</span>
              </div>
            </div>
            <div className="answer-chip">
              <span>model completion</span>
              <strong>{demo.answer}</strong>
              <small>{demo.confidence}%</small>
            </div>
          </div>

          <section className="graph-card">
            <div className="card-toolbar">
              <div className="view-tabs">
                <div role="tablist" aria-label="Circuit visualization">
                  <button
                    role="tab"
                    aria-selected={view === "river"}
                    aria-controls="circuit-view"
                    className={view === "river" ? "active" : ""}
                    onClick={() => setView("river")}
                    data-testid="view-river"
                  >
                    <Icon name="layers" /> Layer river
                  </button>
                  <button
                    role="tab"
                    aria-selected={view === "graph"}
                    aria-controls="circuit-view"
                    className={view === "graph" ? "active" : ""}
                    onClick={() => setView("graph")}
                    data-testid="view-graph"
                  >
                    <Icon name="spark" /> Circuit graph
                  </button>
                </div>
              </div>
              <div className="legend">
                <span><i className="dot positive" /> Positive</span>
                <span><i className="dot negative" /> Negative</span>
                <span><i className="line" /> Contribution width</span>
              </div>
            </div>
            <div id="circuit-view" role="tabpanel">
              {view === "river" ? (
                <LayerRiver
                  features={demo.features}
                  edges={demo.edges}
                  selected={selected.id}
                  onSelect={selectFeature}
                  changedNodeIds={branched ? outcome.changedNodeIds : []}
                  firstLayer={branched ? outcome.firstLayer : null}
                />
              ) : (
                <CircuitGraph
                  features={demo.features}
                  edges={demo.edges}
                  selected={selected.id}
                  onSelect={selectFeature}
                  changedNodeIds={branched ? outcome.changedNodeIds : []}
                />
              )}
            </div>
            <div className="graph-caption">
              <span><Icon name="spark" /> Attribution hypothesis</span>
              <p>{demo.explanation}</p>
              <strong>
                {`${demo.features.length}-node subgraph · ${
                  demo.features.filter((feature) => feature.kind === "sae").length
                } SAE features`}
              </strong>
            </div>
          </section>

          <section className="comparison-section" id="comparison">
            <div className="section-title">
              <div>
                <span className="eyebrow">COUNTERFACTUAL BRANCH VIEW</span>
                <h2>Where the execution changes</h2>
              </div>
              <div className="branch-status">
                <span className={branched ? "complete" : ""} aria-live="polite">
                  {branched ? "Branch complete" : "Awaiting intervention"}
                </span>
              </div>
            </div>
            <div className="execution-grid">
              <article className="execution-card original">
                <div className="execution-label"><span>A</span> Original execution <small>baseline</small></div>
                <div className="answer-row">
                  <div>
                    <small>MODEL ANSWER</small>
                    <strong>{demo.answer}</strong>
                  </div>
                  <em>{demo.confidence}%</em>
                </div>
                <ConfidenceBar value={demo.confidence} />
                <div className="execution-path">
                  <span>L0</span><i /><span>L9</span><i /><span>{demo.focusLabel}</span><i /><span>L18</span>
                </div>
              </article>
              <div className="branch-junction"><Icon name="branch" size={28} /></div>
              <article className={`execution-card branch ${branched ? "revealed" : ""}`} data-testid="branch-result">
                <div className="execution-label"><span>B</span> Branched execution <small>{branched ? interventionCopy[mode].branch : "not run"}</small></div>
                {branched ? (
                  <>
                    <div className={`answer-row ${outcome.answerChanged ? "changed" : ""}`}>
                      <div>
                        <small>{outcome.answerChanged ? "CHANGED ANSWER" : "ANSWER PRESERVED"}</small>
                        <strong>{outcome.answer}</strong>
                      </div>
                      <em>{outcome.confidence.toFixed(1)}%</em>
                    </div>
                    <ConfidenceBar value={outcome.confidence} tone="amber" />
                    <div className="divergence-row">
                      <span>First meaningful divergence</span>
                      <strong>{outcome.firstLayer === null ? "None detected" : `Layer ${outcome.firstLayer}`}</strong>
                    </div>
                    <div className="changed-components" data-testid="changed-components">
                      <span>Downstream changes</span>
                      <strong>
                        {outcome.changedNodeIds.length === 0
                          ? "No nodes crossed threshold"
                          : outcome.changedNodeIds
                              .map((id) => demo.features.find((feature) => feature.id === id)?.label)
                              .filter(Boolean)
                              .join(" → ")}
                      </strong>
                    </div>
                  </>
                ) : (
                  <div className="empty-branch"><Icon name="branch" /><span>Run an intervention to materialize this branch</span></div>
                )}
              </article>
            </div>
          </section>

          <section className="version-diff">
            <div>
              <span className="eyebrow">MODEL VERSION DIFF</span>
              <h2>Did the circuit move after fine-tuning?</h2>
            </div>
            <button
              className={`toggle ${compareVersion ? "on" : ""}`}
              onClick={() => setCompareVersion((value) => !value)}
              aria-pressed={compareVersion}
              aria-label="Toggle model version comparison"
              data-testid="version-diff-toggle"
            >
              <span />
            </button>
            <div className={`diff-summary ${compareVersion ? "visible" : ""}`}>
              <div><small>Snapshot A</small><strong>{demo.versionDiff.baselineComponent}</strong><em>{demo.versionDiff.baselineInfluence.toFixed(2)} influence</em></div>
              <Icon name="compare" size={25} />
              <div><small>{demo.versionDiff.comparisonName}</small><strong>{demo.versionDiff.comparisonComponent}</strong><em>{demo.versionDiff.comparisonInfluence.toFixed(2)} influence</em></div>
              <p>
                <span>{demo.versionDiff.causalPrecisionDelta > 0 ? "+" : ""}{demo.versionDiff.causalPrecisionDelta.toFixed(1)}%</span>
                {" "}fixture causal-precision delta · layer shift {demo.versionDiff.layerShift > 0 ? "+" : ""}{demo.versionDiff.layerShift}. {demo.versionDiff.interpretation}
              </p>
            </div>
          </section>
        </section>

        <aside className="intervention-panel">
          <div className="panel-heading">
            <span>Intervention lab</span>
            <small>BRANCH #{branched ? "02" : "01"}</small>
          </div>
          <div className="selected-feature">
            <div className="feature-orbit"><span>{selected.layer}</span></div>
            <div>
              <small>SELECTED COMPONENT</small>
              <strong>{selected.label}</strong>
              <p>{selected.detail}</p>
            </div>
          </div>
          <dl className="feature-stats">
            <div><dt>Layer</dt><dd>{selected.layer} / 18</dd></div>
            <div><dt>Activation</dt><dd>{selected.activationSigma > 0 ? "+" : ""}{selected.activationSigma.toFixed(2)}σ</dd></div>
            <div><dt>Attribution</dt><dd className={selected.contribution >= 0 ? "teal" : "red"}>{selected.contribution > 0 ? "+" : ""}{selected.contribution.toFixed(2)}</dd></div>
          </dl>

          <div className="mode-label">INTERVENTION</div>
          <div className="mode-control" role="group" aria-label="Intervention type">
            {(["suppress", "amplify", "patch"] as InterventionMode[]).map((item) => (
              <button
                key={item}
                className={mode === item ? "active" : ""}
                aria-pressed={mode === item}
                onClick={() => { setMode(item); setBranched(false); }}
                data-testid={`mode-${item}`}
              >
                {interventionCopy[item].verb}
              </button>
            ))}
          </div>
          <div className="intervention-detail">
            <div><span>{mode === "suppress" ? "0.00×" : mode === "amplify" ? "1.80×" : "↳ A′"}</span><strong>{interventionCopy[mode].branch}</strong></div>
            <p>{interventionCopy[mode].note}</p>
          </div>

          <button className="run-button" onClick={() => setBranched(true)} data-testid="run-intervention">
            <Icon name="play" /> Run branched execution
          </button>
          <div className="runtime-estimate"><Icon name="check" /> Deterministic local fixture replay</div>

          <div className="panel-divider" />
          <div className="evidence-title">FIXTURE EXPECTATIONS</div>
          <ul className="checks">
            <li><Icon name="check" /><span>High-score ablation</span><strong>answer change</strong></li>
            <li><Icon name="check" /><span>Low-score control</span><strong>no change</strong></li>
            <li><Icon name="check" /><span>Replay stability</span><strong>deterministic</strong></li>
          </ul>
          <p className="panel-footnote">These are fixture assertions covered by tests, not empirical model-evaluation scores. No proprietary model activations are included.</p>
        </aside>
      </section>
    </main>
  );
}
