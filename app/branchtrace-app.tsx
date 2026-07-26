"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
} from "react";
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
  fitGraphPoint,
  validationBarPercent,
  type GraphPan,
} from "./workbench-utils";

type Theme = "light" | "dark";
type BottomTab = "intervention" | "validation" | "provenance";

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
      // Theme still changes when storage is unavailable.
    }
    setTheme(nextTheme);
  }

  return (
    <button
      className="ide-icon-button theme-toggle"
      type="button"
      onClick={toggleTheme}
      aria-label={`Switch to ${nextTheme} theme`}
      aria-pressed={theme === "dark"}
      data-testid="theme-toggle"
      suppressHydrationWarning
    >
      <span aria-hidden="true">{theme === "light" ? "☼" : "◐"}</span>
    </button>
  );
}

function RunExplorer({
  active,
  onOpen,
}: {
  active: Demo;
  onOpen: (demo: Demo) => void;
}) {
  return (
    <aside className="run-explorer" aria-label="Run explorer">
      <header>
        <span>EXPLORER</span>
      </header>
      <section>
        <h2>
          <span aria-hidden="true">⌄</span> PRECOMPUTED STUDIES
        </h2>
        <div className="run-tree">
          {demos.map((demo) => (
            <button
              type="button"
              key={demo.id}
              className={demo.id === active.id ? "active" : ""}
              onClick={() => onOpen(demo)}
              aria-pressed={demo.id === active.id}
              data-testid={`demo-${demo.id}`}
            >
              <span className="file-dot" data-kind={demo.task} />
              <span>
                <strong>{demo.title}</strong>
                <small>{demo.task}</small>
              </span>
            </button>
          ))}
        </div>
      </section>
      <section>
        <h2>
          <span aria-hidden="true">⌄</span> ARTIFACTS
        </h2>
        <ul className="artifact-tree">
          <li>graph.json</li>
          <li>manifest.json</li>
          <li>interventions.json</li>
        </ul>
      </section>
      <section className="explorer-note" id="method">
        <h2>INTERPRETATION BOUNDARY</h2>
        <p>
          Attribution graphs are hypotheses. Every example here is an explicitly
          labeled deterministic fixture, not hidden reasoning or a live model run.
        </p>
      </section>
    </aside>
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
  zoom,
  onZoom,
  pan,
  onPan,
}: {
  demo: Demo;
  selectedId: string;
  onSelect: (id: string) => void;
  view: CircuitView;
  changedIds: string[];
  firstLayer: number | null;
  query: string;
  zoom: number;
  onZoom: (value: number) => void;
  pan: GraphPan;
  onPan: (value: GraphPan) => void;
}) {
  const featureById = useMemo(
    () => new Map(demo.features.map((feature) => [feature.id, feature])),
    [demo.features],
  );
  const loweredQuery = query.trim().toLowerCase();
  const dragRef = useRef<{
    pointerId: number;
    clientX: number;
    clientY: number;
    pan: GraphPan;
  } | null>(null);
  const matchesQuery = (feature: CircuitFeature) =>
    !loweredQuery ||
    `${feature.label} ${feature.detail} ${feature.kind} ${feature.layer}`
      .toLowerCase()
      .includes(loweredQuery);

  const selectAdjacent = (
    event: ReactKeyboardEvent<HTMLButtonElement>,
    index: number,
  ) => {
    if (!["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(event.key))
      return;
    event.preventDefault();
    const direction =
      event.key === "ArrowRight" || event.key === "ArrowDown" ? 1 : -1;
    const next =
      (index + direction + demo.features.length) % demo.features.length;
    onSelect(demo.features[next].id);
    document
      .querySelector<HTMLButtonElement>(
        `[data-graph-feature="${demo.features[next].id}"]`,
      )
      ?.focus();
  };

  return (
    <div
      className={`graph-surface view-${view}`}
      data-testid={view === "graph" ? "circuit-graph" : "layer-river"}
      role="group"
      aria-label={
        view === "graph"
          ? "Node-link circuit graph. Drag the background to pan."
          : "Layer River contribution visualization"
      }
      onPointerDown={(event) => {
        if ((event.target as HTMLElement).closest("button")) return;
        dragRef.current = {
          pointerId: event.pointerId,
          clientX: event.clientX,
          clientY: event.clientY,
          pan,
        };
        event.currentTarget.setPointerCapture(event.pointerId);
      }}
      onPointerMove={(event) => {
        const drag = dragRef.current;
        if (!drag || drag.pointerId !== event.pointerId) return;
        onPan({
          x: drag.pan.x + event.clientX - drag.clientX,
          y: drag.pan.y + event.clientY - drag.clientY,
        });
      }}
      onPointerUp={(event) => {
        if (dragRef.current?.pointerId === event.pointerId) {
          dragRef.current = null;
          event.currentTarget.releasePointerCapture(event.pointerId);
        }
      }}
      onPointerCancel={() => {
        dragRef.current = null;
      }}
      onWheel={(event) => {
        if (!event.ctrlKey && !event.metaKey) return;
        event.preventDefault();
        onZoom(Math.max(0.7, Math.min(1.7, zoom - event.deltaY * 0.002)));
      }}
    >
      <div
        className="graph-transform"
        style={{
          transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
        }}
      >
        <svg viewBox="0 0 1000 520" preserveAspectRatio="none" aria-hidden="true">
          <defs>
            <marker
              id="edge-arrow"
              markerWidth="8"
              markerHeight="8"
              refX="7"
              refY="3"
              orient="auto"
            >
              <path d="M0,0 L0,6 L8,3 z" />
            </marker>
          </defs>
          {demo.edges.map((edge: CircuitEdge) => {
            const source = featureById.get(edge.source);
            const target = featureById.get(edge.target);
            if (!source || !target) return null;
            const sourcePosition = fitGraphPoint(source.x, source.y);
            const targetPosition = fitGraphPoint(target.x, target.y);
            const x1 = sourcePosition.x * 10;
            const y1 = sourcePosition.y * 5.2;
            const x2 = targetPosition.x * 10;
            const y2 = targetPosition.y * 5.2;
            const curve =
              view === "river"
                ? `M ${x1} ${y1} C ${x1 + 90} ${y1}, ${x2 - 90} ${y2}, ${x2} ${y2}`
                : `M ${x1} ${y1} L ${x2} ${y2}`;
            return (
              <g key={`${edge.source}-${edge.target}`}>
                <path
                  d={curve}
                  className={[
                    "graph-edge",
                    edge.contribution < 0 ? "negative" : "positive",
                    edge.path === "error" ? "error" : "",
                    changedIds.includes(edge.target) ? "changed" : "",
                    loweredQuery &&
                    !matchesQuery(source) &&
                    !matchesQuery(target)
                      ? "search-dimmed"
                      : "",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                  style={{
                    strokeWidth: 1.2 + Math.abs(edge.contribution) * 4.2,
                  }}
                  markerEnd="url(#edge-arrow)"
                />
                {view === "graph" && (
                  <text x={(x1 + x2) / 2} y={(y1 + y2) / 2 - 7}>
                    {edge.path}
                  </text>
                )}
              </g>
            );
          })}
        </svg>

        {demo.features.map((feature: CircuitFeature, index) => {
          const selected = feature.id === selectedId;
          const matched = matchesQuery(feature);
          const position = fitGraphPoint(feature.x, feature.y);
          return (
            <button
              type="button"
              key={feature.id}
              className={[
                "ide-node",
                `kind-${feature.kind}`,
                selected ? "selected" : "",
                changedIds.includes(feature.id) ? "changed" : "",
                !matched ? "search-dimmed" : "",
              ]
                .filter(Boolean)
                .join(" ")}
              style={{ left: `${position.x}%`, top: `${position.y}%` }}
              onClick={() => onSelect(feature.id)}
              onKeyDown={(event) => selectAdjacent(event, index)}
              aria-pressed={selected}
              aria-label={`${feature.label}, ${feature.kind}, layer ${feature.layer}, contribution ${feature.contribution.toFixed(2)}`}
              data-graph-feature={feature.id}
              data-testid={
                view === "river"
                  ? `node-${feature.id}`
                  : `graph-node-${feature.id}`
              }
            >
              <span>{feature.kind.toUpperCase()}</span>
              <strong>{feature.label}</strong>
              <small>
                L{feature.layer} · {feature.contribution > 0 ? "+" : ""}
                {feature.contribution.toFixed(2)}
              </small>
            </button>
          );
        })}

        {firstLayer !== null && (
          <div
            className="divergence-marker"
            style={{ left: `${Math.max(8, (firstLayer / 18) * 88)}%` }}
            data-testid="divergence-marker"
          >
            <span>FIRST STORED CHANGE</span>
            <strong>L{firstLayer}</strong>
          </div>
        )}
      </div>

      <div className="graph-minimap" aria-label="Circuit minimap">
        <span>MINIMAP</span>
        <svg viewBox="0 0 100 62" aria-hidden="true">
          {demo.edges.map((item) => {
            const source = featureById.get(item.source);
            const target = featureById.get(item.target);
            if (!source || !target) return null;
            const sourcePosition = fitGraphPoint(source.x, source.y);
            const targetPosition = fitGraphPoint(target.x, target.y);
            return (
              <line
                key={`${item.source}-${item.target}`}
                x1={sourcePosition.x}
                y1={sourcePosition.y * 0.62}
                x2={targetPosition.x}
                y2={targetPosition.y * 0.62}
              />
            );
          })}
          {demo.features.map((feature) => {
            const position = fitGraphPoint(feature.x, feature.y);
            return (
              <circle
                key={feature.id}
                cx={position.x}
                cy={position.y * 0.62}
                r={feature.id === selectedId ? 2.4 : 1.3}
              />
            );
          })}
          <rect
            x={8 + (1 - zoom) * 10 - pan.x / 25}
            y={6 - pan.y / 25}
            width={Math.max(44, 80 / zoom)}
            height={48}
          />
        </svg>
      </div>
    </div>
  );
}

function AccessibleGraphTreegrid({
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
    <div className="treegrid-wrap">
      <table aria-label="Accessible circuit node table">
        <thead>
          <tr>
            <th scope="col">Layer</th>
            <th scope="col">Type</th>
            <th scope="col">Feature</th>
            <th scope="col">Contribution</th>
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
              <td>{feature.contribution.toFixed(2)}</td>
              <td>{feature.activationSigma.toFixed(2)}σ</td>
            </tr>
          ))}
          {visibleFeatures.length === 0 && (
            <tr>
              <td colSpan={5}>No circuit nodes match “{query}”.</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

function FeatureInspector({
  feature,
  manifestId,
}: {
  feature: CircuitFeature;
  manifestId: string;
}) {
  return (
    <aside className="feature-inspector" aria-label="Feature inspector">
      <header>
        <span>INSPECTOR</span>
        <small>{feature.id}</small>
      </header>
      <section className="feature-title">
        <span data-kind={feature.kind}>{feature.kind}</span>
        <h2>{feature.label}</h2>
        <p>{feature.detail}</p>
      </section>
      <dl>
        <div>
          <dt>Layer</dt>
          <dd>{feature.layer} / 18</dd>
        </div>
        <div>
          <dt>Attribution</dt>
          <dd>{feature.contribution.toFixed(3)}</dd>
        </div>
        <div>
          <dt>Activation</dt>
          <dd>{feature.activationSigma.toFixed(2)}σ</dd>
        </div>
        <div>
          <dt>Artifact</dt>
          <dd>{manifestId}</dd>
        </div>
      </dl>
      <section className="feature-examples">
        <h3>STORED ACTIVATION EXAMPLES</h3>
        {feature.examples?.length ? (
          <ul>
            {feature.examples.map((example) => (
              <li key={example}>{example}</li>
            ))}
          </ul>
        ) : (
          <p>No token examples are stored for this fixture node.</p>
        )}
      </section>
    </aside>
  );
}

function BottomPanel({
  demo,
  selected,
  mode,
  setMode,
  activeTab,
  setActiveTab,
  branched,
  setBranched,
}: {
  demo: Demo;
  selected: CircuitFeature;
  mode: InterventionMode;
  setMode: (mode: InterventionMode) => void;
  activeTab: BottomTab;
  setActiveTab: (tab: BottomTab) => void;
  branched: boolean;
  setBranched: (value: boolean) => void;
}) {
  const outcome = useMemo(
    () => runFixtureIntervention(demo, selected, mode),
    [demo, mode, selected],
  );
  const validationMetrics = [
    {
      label: "Attributed effect",
      value: outcome.predictedLogitDelta,
    },
    {
      label: "Stored intervention",
      value: outcome.observedLogitDelta,
    },
    {
      label: "Unexplained residual",
      value: outcome.unexplainedResidual,
    },
  ];
  const validationMaximum = Math.max(
    0.01,
    ...validationMetrics.map((metric) => Math.abs(metric.value)),
  );

  return (
    <section className="bottom-panel" aria-label="Analysis panel">
      <header>
        <div role="tablist" aria-label="Analysis views">
          {(["intervention", "validation", "provenance"] as BottomTab[]).map(
            (tab) => (
              <button
                type="button"
                role="tab"
                key={tab}
                aria-selected={activeTab === tab}
                onClick={() => setActiveTab(tab)}
              >
                {tab}
                {tab === "validation" && branched ? <i /> : null}
              </button>
            ),
          )}
        </div>
        <span>
          {demo.manifest.evidenceClass.replaceAll("-", " ").toUpperCase()}
        </span>
      </header>

      {activeTab === "intervention" && (
        <div className="intervention-workbench">
          <section>
            <label>
              CLEAN PROMPT
              <textarea readOnly value={demo.prompt} />
            </label>
            <label>
              ALIGNED CONTRAST
              <textarea readOnly value={demo.contrastPrompt} />
            </label>
          </section>
          <section className="intervention-settings">
            <label>
              SELECTED NODE
              <input readOnly value={`${selected.label} · L${selected.layer}`} />
            </label>
            <div className="mode-control" role="group" aria-label="Intervention type">
              {(["suppress", "amplify", "patch"] as InterventionMode[]).map(
                (item) => (
                  <button
                    type="button"
                    key={item}
                    className={mode === item ? "active" : ""}
                    aria-pressed={mode === item}
                    onClick={() => {
                      setMode(item);
                      setBranched(false);
                    }}
                    data-testid={`mode-${item}`}
                  >
                    {interventionCopy[item].verb}
                  </button>
                ),
              )}
            </div>
            <p>{interventionCopy[mode].note}</p>
            <button
              type="button"
              className="run-intervention"
              onClick={() => setBranched(true)}
              data-testid="run-intervention"
            >
              ▶ Run branched execution
            </button>
          </section>
          <section
            className={`measurement-result ${branched ? "ready" : ""}`}
            data-testid="branch-result"
          >
            {branched ? (
              <>
                <div className="result-heading">
                  <span>STORED RESULT</span>
                  <strong>{outcome.answer}</strong>
                  <small>
                    {outcome.answerChanged
                      ? "OUTPUT CHANGED"
                      : "OUTPUT PRESERVED"}
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
                    <dt>Attributed Δ</dt>
                    <dd>{outcome.predictedLogitDelta.toFixed(2)}</dd>
                  </div>
                  <div>
                    <dt>Residual</dt>
                    <dd>{outcome.unexplainedResidual.toFixed(2)}</dd>
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
                <div className="changed-components" data-testid="changed-components">
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
                      : "No nodes crossed threshold"}
                  </strong>
                </div>
              </>
            ) : (
              <div className="empty-result">
                <span aria-hidden="true">⑂</span>
                <p>Run an intervention to materialize this branch</p>
              </div>
            )}
          </section>
        </div>
      )}

      {activeTab === "validation" && (
        <div className="validation-panel">
          <section>
            <span>VALIDATION CONTRACT</span>
            <h2>Attribution is a hypothesis until intervened on.</h2>
            <p>
              For {selected.label}, the {mode} branch compares its stored
              attributed logit delta with the selected fixture&apos;s stored
              intervention delta and reports the unexplained residual. These
              authored values validate software behavior only.
            </p>
          </section>
          <section className="validation-bars">
            {validationMetrics.map((metric) => (
              <div key={metric.label}>
                <label>{metric.label}</label>
                <i
                  style={{
                    width: `${validationBarPercent(
                      metric.value,
                      validationMaximum,
                    )}%`,
                  }}
                />
                <strong>{metric.value.toFixed(2)}</strong>
              </div>
            ))}
          </section>
          <section className="version-diff">
            <span>MODEL VERSION DIFF · STORED FIXTURE CONTRAST</span>
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
      )}

      {activeTab === "provenance" && (
        <div className="provenance-panel" id="provenance">
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
              <dt>Revision</dt>
              <dd>{demo.manifest.modelRevision}</dd>
            </div>
            <div>
              <dt>Transcoder target</dt>
              <dd>{demo.manifest.transcoderTarget}</dd>
            </div>
            <div>
              <dt>Generator</dt>
              <dd>{demo.manifest.generator}</dd>
            </div>
            <div>
              <dt>Generated</dt>
              <dd>{demo.manifest.generatedAt}</dd>
            </div>
            <div>
              <dt>Prompt hash</dt>
              <dd>{demo.manifest.promptHash}</dd>
            </div>
            <div>
              <dt>Artifact hash</dt>
              <dd>{demo.manifest.artifactHash}</dd>
            </div>
            <div>
              <dt>License</dt>
              <dd>{demo.manifest.license}</dd>
            </div>
          </dl>
          <p>{demo.manifest.caveat}</p>
          <a href={demo.manifest.sourceUrl} target="_blank" rel="noreferrer">
            {demo.manifest.sourceTitle} ↗
          </a>
        </div>
      )}
    </section>
  );
}

function CommandPalette({
  onClose,
  onCommand,
}: {
  onClose: () => void;
  onCommand: (command: string) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const commands: Array<[string, string, string]> = [
    ["fit", "Graph: Fit to viewport", "F"],
    ["table", "View: Toggle accessible node table", "T"],
    ["provenance", "Panel: Open provenance", "P"],
    ["theme", "Preferences: Toggle color theme", "—"],
  ];
  const filtered = commands.filter(([, label]) =>
    label.toLowerCase().includes(query.toLowerCase()),
  );

  useEffect(() => inputRef.current?.focus(), []);

  return (
    <div
      className="command-backdrop"
      role="presentation"
      onMouseDown={(event) => {
        if (event.currentTarget === event.target) onClose();
      }}
    >
      <section
        className="command-palette"
        role="dialog"
        aria-modal="true"
        aria-label="Command palette"
      >
        <input
          ref={inputRef}
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setActiveIndex(0);
          }}
          placeholder="Type a command"
          aria-label="Command search"
          aria-controls="command-results"
          aria-activedescendant={
            filtered[activeIndex]
              ? `command-option-${filtered[activeIndex][0]}`
              : undefined
          }
          onKeyDown={(event) => {
            if (event.key === "Escape") onClose();
            if (event.key === "ArrowDown") {
              event.preventDefault();
              setActiveIndex((current) =>
                filtered.length ? (current + 1) % filtered.length : 0,
              );
            }
            if (event.key === "ArrowUp") {
              event.preventDefault();
              setActiveIndex((current) =>
                filtered.length
                  ? (current - 1 + filtered.length) % filtered.length
                  : 0,
              );
            }
            if (event.key === "Enter" && filtered[activeIndex]) {
              onCommand(filtered[activeIndex][0]);
              onClose();
            }
          }}
        />
        <ul id="command-results" role="listbox">
          {filtered.map(([id, label, key], index) => (
            <li key={id} role="option" aria-selected={index === activeIndex}>
              <button
                type="button"
                id={`command-option-${id}`}
                className={index === activeIndex ? "selected" : ""}
                onMouseEnter={() => setActiveIndex(index)}
                onClick={() => {
                  onCommand(id);
                  onClose();
                }}
              >
                <span>{label}</span>
                <kbd>{key}</kbd>
              </button>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

export function BranchTraceApp() {
  const [demoId, setDemoId] = useState(demos[0].id);
  const [openTabs, setOpenTabs] = useState<string[]>([demos[0].id]);
  const [selectedFeature, setSelectedFeature] = useState(demos[0].focusFeature);
  const [mode, setMode] = useState<InterventionMode>("suppress");
  const [branched, setBranched] = useState(false);
  const [view, setView] = useState<CircuitView>("graph");
  const [bottomTab, setBottomTab] = useState<BottomTab>("intervention");
  const [query, setQuery] = useState("");
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState<GraphPan>({ x: 0, y: 0 });
  const [showTable, setShowTable] = useState(false);
  const [showPalette, setShowPalette] = useState(false);
  const [showExplorer, setShowExplorer] = useState(true);
  const paletteReturnFocusRef = useRef<HTMLElement | null>(null);

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

  const openDemo = (next: Demo) => {
    setDemoId(next.id);
    setOpenTabs((current) =>
      current.includes(next.id) ? current : [...current, next.id],
    );
    setSelectedFeature(next.focusFeature);
    setMode("suppress");
    setBranched(false);
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };

  const closeTab = (id: string) => {
    if (openTabs.length === 1) return;
    const nextTabs = openTabs.filter((item) => item !== id);
    setOpenTabs(nextTabs);
    if (demoId === id) openDemo(demos.find((item) => item.id === nextTabs.at(-1)) ?? demos[0]);
  };

  const runCommand = (command: string) => {
    if (command === "fit") {
      setZoom(1);
      setPan({ x: 0, y: 0 });
    }
    if (command === "table") setShowTable((current) => !current);
    if (command === "provenance") setBottomTab("provenance");
    if (command === "theme") {
      document
        .querySelector<HTMLButtonElement>('[data-testid="theme-toggle"]')
        ?.click();
    }
  };

  const openPalette = () => {
    paletteReturnFocusRef.current =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    setShowPalette(true);
  };

  const closePalette = () => {
    setShowPalette(false);
    window.setTimeout(() => paletteReturnFocusRef.current?.focus(), 0);
  };

  useEffect(() => {
    const handleKey = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        paletteReturnFocusRef.current =
          document.activeElement instanceof HTMLElement
            ? document.activeElement
            : null;
        setShowPalette(true);
      } else if (
        event.key.toLowerCase() === "f" &&
        !(event.target instanceof HTMLInputElement) &&
        !(event.target instanceof HTMLTextAreaElement)
      ) {
        setZoom(1);
        setPan({ x: 0, y: 0 });
      } else if (event.key === "Escape") {
        setShowPalette(false);
        setQuery("");
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, []);

  return (
    <main
      className={`ide-shell ${showExplorer ? "" : "explorer-collapsed"}`}
      id="explorer"
    >
      <header className="ide-titlebar">
        <div className="ide-brand">
          <span aria-hidden="true">⑂</span>
          <strong>BranchTrace</strong>
          <small>Mechanistic Debugger IDE</small>
        </div>
        <button
          type="button"
          className="command-trigger"
          onClick={openPalette}
          aria-label="Open command palette"
        >
          <span>Search files, features, layers, commands…</span>
          <kbd>⌘ K</kbd>
        </button>
        <div className="title-actions">
          <span className="fixture-state">
            <i /> FIXTURE · NO MODEL RUNNING
          </span>
          <ThemeToggle />
          <a
            href="#provenance"
            onClick={() => setBottomTab("provenance")}
          >
            API schema
          </a>
        </div>
      </header>

      <nav className="activity-bar" aria-label="Workbench views">
        <button
          type="button"
          className={showExplorer ? "active" : ""}
          aria-label="Toggle run explorer"
          aria-pressed={showExplorer}
          onClick={() => setShowExplorer((current) => !current)}
        >
          ⧉
        </button>
        <button
          type="button"
          aria-label="Search features"
          onClick={() =>
            document.querySelector<HTMLInputElement>("#feature-search")?.focus()
          }
        >
          ⌕
        </button>
        <button
          type="button"
          aria-label="Open intervention panel"
          onClick={() => setBottomTab("intervention")}
        >
          ⑂
        </button>
        <button
          type="button"
          aria-label="Open validation panel"
          onClick={() => setBottomTab("validation")}
        >
          ✓
        </button>
        <button
          type="button"
          aria-label="Open provenance panel"
          onClick={() => setBottomTab("provenance")}
        >
          ⓘ
        </button>
      </nav>

      {showExplorer && <RunExplorer active={demo} onOpen={openDemo} />}

      <section className="editor-area">
        <nav
          className="editor-tabs"
          role="tablist"
          aria-label="Open circuit artifacts"
        >
          {openTabs.map((id, index) => {
            const item = demos.find((candidate) => candidate.id === id)!;
            return (
              <div
                key={id}
                className={id === demo.id ? "active" : ""}
                role="presentation"
              >
                <button
                  type="button"
                  role="tab"
                  aria-selected={id === demo.id}
                  onClick={() => openDemo(item)}
                  onKeyDown={(event) => {
                    if (
                      event.key === "ArrowLeft" ||
                      event.key === "ArrowRight"
                    ) {
                      event.preventDefault();
                      const direction = event.key === "ArrowRight" ? 1 : -1;
                      const nextIndex =
                        (index + direction + openTabs.length) % openTabs.length;
                      const nextId = openTabs[nextIndex];
                      const nextDemo = demos.find(
                        (candidate) => candidate.id === nextId,
                      );
                      if (nextDemo) openDemo(nextDemo);
                      document
                        .querySelectorAll<HTMLButtonElement>(
                          ".editor-tabs [role='tab']",
                        )
                        .item(nextIndex)
                        ?.focus();
                    }
                    if (
                      (event.key === "Delete" ||
                        event.key === "Backspace") &&
                      openTabs.length > 1
                    ) {
                      event.preventDefault();
                      closeTab(id);
                    }
                  }}
                >
                  <i data-kind={item.task} />
                  {item.title}
                  <small>graph.json</small>
                </button>
                {openTabs.length > 1 && (
                  <button
                    type="button"
                    className="close-tab"
                    aria-label={`Close ${item.title}`}
                    onClick={() => closeTab(id)}
                  >
                    ×
                  </button>
                )}
              </div>
            );
          })}
        </nav>

        <header className="editor-toolbar">
          <div className="breadcrumb">
            <span>artifacts</span> / <span>{demo.manifest.artifactId}</span> /{" "}
            <strong>graph.json</strong>
          </div>
          <div className="graph-tools">
            <label>
              <span className="sr-only">Search circuit features</span>
              <input
                id="feature-search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Filter features"
              />
            </label>
            <div role="tablist" aria-label="Circuit visualization">
              <button
                type="button"
                role="tab"
                aria-selected={view === "river"}
                onClick={() => setView("river")}
                data-testid="view-river"
              >
                River
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={view === "graph"}
                onClick={() => setView("graph")}
                data-testid="view-graph"
              >
                Graph
              </button>
            </div>
            <button
              type="button"
              aria-label="Zoom out graph"
              onClick={() => setZoom((value) => Math.max(0.7, value - 0.1))}
            >
              −
            </button>
            <span>{Math.round(zoom * 100)}%</span>
            <button
              type="button"
              aria-label="Zoom in graph"
              onClick={() => setZoom((value) => Math.min(1.7, value + 0.1))}
            >
              +
            </button>
            <button
              type="button"
              onClick={() => {
                setZoom(1);
                setPan({ x: 0, y: 0 });
              }}
            >
              Fit
            </button>
            <button
              type="button"
              aria-pressed={showTable}
              onClick={() => setShowTable((current) => !current)}
            >
              {showTable ? "Graph view" : "Node table"}
            </button>
          </div>
        </header>

        <div className="prompt-strip">
          <span>INPUT</span>
          <code>{demo.prompt}</code>
          <span>MODEL COMPLETION</span>
          <strong>{demo.answer}</strong>
          <small>{demo.model}</small>
        </div>

        <section className="graph-editor">
          {showTable ? (
            <AccessibleGraphTreegrid
              demo={demo}
              selected={selected.id}
              query={query}
              onSelect={(id) => {
                setSelectedFeature(id);
                setBranched(false);
              }}
            />
          ) : (
            <GraphCanvas
              demo={demo}
              selectedId={selected.id}
              onSelect={(id) => {
                setSelectedFeature(id);
                setBranched(false);
              }}
              view={view}
              changedIds={branched ? outcome.changedNodeIds : []}
              firstLayer={branched ? outcome.firstLayer : null}
              query={query}
              zoom={zoom}
              onZoom={setZoom}
              pan={pan}
              onPan={setPan}
            />
          )}
        </section>
      </section>

      <FeatureInspector
        feature={selected}
        manifestId={demo.manifest.artifactId}
      />

      <BottomPanel
        demo={demo}
        selected={selected}
        mode={mode}
        setMode={setMode}
        activeTab={bottomTab}
        setActiveTab={setBottomTab}
        branched={branched}
        setBranched={setBranched}
      />

      <footer className="status-bar">
        <span>⑂ main*</span>
        <span>{`${demo.features.length}-node subgraph`}</span>
        <span>{`${demo.edges.length} edges`}</span>
        <span>pruning threshold 0.10</span>
        <span className="status-spacer" />
        <span>MODEL VERSION DIFF: fixture contrast available</span>
        <span>{demo.manifest.schemaVersion}</span>
      </footer>

      {showPalette && (
        <CommandPalette
          onClose={closePalette}
          onCommand={runCommand}
        />
      )}
    </main>
  );
}
