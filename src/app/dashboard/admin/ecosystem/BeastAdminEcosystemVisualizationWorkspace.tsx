"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  DashboardCard,
  SectionHeader,
} from "@/app/components/design/DashboardPrimitives";
import {
  beastAdminEcosystemCategories,
  beastAdminEcosystemRelationKinds,
  buildBeastAdminEcosystemMap,
  filterBeastAdminEcosystemNodes,
  getBeastAdminEcosystemConnectedNodeId,
  getBeastAdminEcosystemConnections,
  getBeastAdminEcosystemNode,
  getBeastAdminEcosystemRelationKind,
  getBeastAdminEcosystemVisibleEdges,
  type BeastAdminEcosystemCategory,
  type BeastAdminEcosystemEdge,
  type BeastAdminEcosystemNode,
  type BeastAdminEcosystemRelationKind,
} from "@/lib/beastAdminEcosystemVisualization";

const categoryLabels: Record<BeastAdminEcosystemCategory, string> = {
  platform: "Platform",
  fusion: "Fusion",
  "shared-service": "Shared services",
  professional: "Professionals",
  module: "Applications",
};

const nodeClasses: Record<BeastAdminEcosystemCategory, string> = {
  platform: "fill-amber-300/20 stroke-amber-200",
  fusion: "fill-purple-300/20 stroke-purple-200",
  "shared-service": "fill-sky-300/15 stroke-sky-200/70",
  professional: "fill-emerald-300/15 stroke-emerald-200/70",
  module: "fill-slate-300/10 stroke-slate-200/60",
};

const legendClasses: Record<BeastAdminEcosystemCategory, string> = {
  platform: "border-amber-200 bg-amber-300/20",
  fusion: "border-purple-200 bg-purple-300/20",
  "shared-service": "border-sky-200/70 bg-sky-300/15",
  professional: "border-emerald-200/70 bg-emerald-300/15",
  module: "border-slate-200/60 bg-slate-300/10",
};

const categoryPurposes: Record<BeastAdminEcosystemCategory, string> = {
  platform: "Owns shared platform contracts.",
  fusion: "Coordinates approved collaboration.",
  "shared-service": "Provide reusable platform capabilities.",
  professional: "Own domain reasoning.",
  module: "Own business logic and user experience.",
};

const relationshipLegend: Record<
  BeastAdminEcosystemRelationKind,
  {
    label: string;
    description: string;
    markerId: string;
    markerClass: string;
    pathClass: string;
    sampleClass: string;
    dasharray?: string;
  }
> = {
  ownership: {
    label: "Ownership",
    description: "Shows which layer owns, governs, or hosts a contract.",
    markerId: "ecosystem-arrow-ownership",
    markerClass: "fill-amber-200",
    pathClass: "stroke-amber-200/80",
    sampleClass: "border-amber-200",
  },
  authorization: {
    label: "Authorization",
    description: "Shows where explicit permission gates access.",
    markerId: "ecosystem-arrow-authorization",
    markerClass: "fill-rose-300",
    pathClass: "stroke-rose-300/80",
    sampleClass: "border-rose-300 border-dashed",
    dasharray: "7 4",
  },
  context: {
    label: "Context",
    description: "Shows approved context or coordination flowing to another node.",
    markerId: "ecosystem-arrow-context",
    markerClass: "fill-violet-300",
    pathClass: "stroke-violet-300/80",
    sampleClass: "border-violet-300 border-dotted",
    dasharray: "3 4",
  },
  contribution: {
    label: "Contribution",
    description: "Shows source-owned records or events supplied to a shared capability.",
    markerId: "ecosystem-arrow-contribution",
    markerClass: "fill-sky-300",
    pathClass: "stroke-sky-300/80",
    sampleClass: "border-sky-300 border-dashed",
    dasharray: "11 4 2 4",
  },
};

type ArchitectureNavigationRequest = {
  nodeId: string;
  sequence: number;
};

function edgePath(
  edge: BeastAdminEcosystemEdge,
  nodes: ReadonlyMap<string, BeastAdminEcosystemNode>
) {
  const source = nodes.get(edge.from);
  const target = nodes.get(edge.to);
  if (!source || !target) return "";
  const sourceCenterX = source.x + source.width / 2;
  const targetCenterX = target.x + target.width / 2;
  const targetBelow = target.y >= source.y;
  const sourceY = targetBelow ? source.y + source.height : source.y;
  const targetY = targetBelow ? target.y : target.y + target.height;
  const controlY = (sourceY + targetY) / 2;
  return `M ${sourceCenterX} ${sourceY} C ${sourceCenterX} ${controlY}, ${targetCenterX} ${controlY}, ${targetCenterX} ${targetY}`;
}

function ArchitectureGraph({
  nodes,
  edges,
  selectedNodeId,
  focusedNodeIds,
  navigationRequest,
  onSelect,
}: {
  nodes: readonly BeastAdminEcosystemNode[];
  edges: readonly BeastAdminEcosystemEdge[];
  selectedNodeId: string;
  focusedNodeIds: ReadonlySet<string>;
  navigationRequest: ArchitectureNavigationRequest | null;
  onSelect: (nodeId: string) => void;
}) {
  const nodeElementsRef = useRef(
    new Map<string, SVGGElement | null>()
  );
  const nodesById = useMemo(
    () => new Map(nodes.map((node) => [node.id, node])),
    [nodes]
  );
  const hasFocus = focusedNodeIds.size > 0;

  useEffect(() => {
    if (!navigationRequest) return;
    const targetNode = nodeElementsRef.current.get(navigationRequest.nodeId);
    if (!targetNode) return;

    const animationFrame = window.requestAnimationFrame(() => {
      const reduceMotion = window.matchMedia(
        "(prefers-reduced-motion: reduce)"
      ).matches;

      targetNode.scrollIntoView({
        behavior: reduceMotion ? "auto" : "smooth",
        block: "nearest",
        inline: "center",
      });
    });

    return () => window.cancelAnimationFrame(animationFrame);
  }, [navigationRequest]);

  return (
    <div
      className="overflow-x-auto rounded-xl border border-[#2a3242] bg-[#080d15]"
      data-architecture-scroll-container
    >
      <svg
        viewBox="0 0 1120 630"
        className="block w-full min-w-[920px]"
        role="img"
        aria-labelledby="ecosystem-map-title ecosystem-map-description"
      >
        <title id="ecosystem-map-title">Beast ecosystem architecture map</title>
        <desc id="ecosystem-map-description">
          Interactive owner-only map of BeastOS, shared services, BeastFusion,
          professionals, applications, and their directional relationships.
        </desc>
        <defs>
          {Object.values(relationshipLegend).map((relationship) => (
            <marker
              key={relationship.markerId}
              id={relationship.markerId}
              viewBox="0 0 10 10"
              refX="8"
              refY="5"
              markerWidth="5"
              markerHeight="5"
              orient="auto-start-reverse"
            >
              <path
                d="M 0 0 L 10 5 L 0 10 z"
                className={relationship.markerClass}
              />
            </marker>
          ))}
        </defs>

        <g aria-hidden="true">
          <text x="20" y="124" className="fill-[#68768b] text-[11px] font-black uppercase tracking-[0.14em]">
            Shared BeastOS services
          </text>
          <text x="20" y="248" className="fill-[#68768b] text-[11px] font-black uppercase tracking-[0.14em]">
            Collaboration layer
          </text>
          <text x="20" y="372" className="fill-[#68768b] text-[11px] font-black uppercase tracking-[0.14em]">
            Professional relationships
          </text>
          <text x="20" y="520" className="fill-[#68768b] text-[11px] font-black uppercase tracking-[0.14em]">
            Beast applications
          </text>
        </g>

        <g aria-hidden="true">
          {edges.map((edge) => {
            const relationship =
              relationshipLegend[
                getBeastAdminEcosystemRelationKind(edge.relation)
              ];
            return (
              <path
                key={edge.id}
                d={edgePath(edge, nodesById)}
                fill="none"
                markerEnd={`url(#${relationship.markerId})`}
                className={`${relationship.pathClass} opacity-80`}
                strokeDasharray={relationship.dasharray}
                strokeWidth={
                  edge.from === selectedNodeId ||
                  edge.to === selectedNodeId
                    ? 2.5
                    : 1.5
                }
              />
            );
          })}
        </g>

        {nodes.map((node) => {
          const selected = node.id === selectedNodeId;
          const focused =
            selected || !hasFocus || focusedNodeIds.has(node.id);
          return (
            <g
              key={node.id}
              ref={(element) => {
                nodeElementsRef.current.set(node.id, element);
              }}
              data-architecture-node={node.id}
              role="button"
              aria-label={`${node.label}, ${categoryLabels[node.category]}, ${node.status}`}
              aria-pressed={selected}
              tabIndex={0}
              onClick={() => onSelect(node.id)}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  onSelect(node.id);
                }
              }}
              className={`cursor-pointer transition-opacity ${
                focused ? "opacity-100" : "opacity-25"
              }`}
            >
              <rect
                x={node.x}
                y={node.y}
                width={node.width}
                height={node.height}
                rx="12"
                className={`${nodeClasses[node.category]} ${
                  selected ? "stroke-[3px]" : "stroke-[1.5px]"
                }`}
              />
              {selected ? (
                <rect
                  x={node.x - 4}
                  y={node.y - 4}
                  width={node.width + 8}
                  height={node.height + 8}
                  rx="16"
                  fill="none"
                  className="stroke-amber-200/70"
                  strokeWidth="2"
                  strokeDasharray="5 4"
                />
              ) : null}
              <text
                x={node.x + node.width / 2}
                y={node.y + 25}
                textAnchor="middle"
                className="pointer-events-none fill-white text-[13px] font-black"
              >
                {node.label}
              </text>
              <text
                x={node.x + node.width / 2}
                y={node.y + 45}
                textAnchor="middle"
                className="pointer-events-none fill-[#9aa7b8] text-[10px] font-bold"
              >
                {node.subtitle.length > 24
                  ? `${node.subtitle.slice(0, 22)}…`
                  : node.subtitle}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

function ArchitectureLegend() {
  return (
    <section
      className="mt-4 rounded-xl border border-[#2a3242] bg-[#0b1220] p-4 sm:p-5"
      aria-labelledby="architecture-legend-title"
    >
      <div>
        <h3
          id="architecture-legend-title"
          className="text-sm font-black text-white"
        >
          How to read this map
        </h3>
        <p className="mt-1 text-xs leading-5 text-[#7f8da3]">
          Node colors identify architectural responsibility. Arrowheads point
          toward the node receiving the relationship.
        </p>
      </div>

      <div className="mt-4 grid gap-5 lg:grid-cols-2">
        <div>
          <h4 className="text-xs font-black uppercase tracking-wide text-[#9aa7b8]">
            Layers
          </h4>
          <dl className="mt-3 grid gap-3">
            {beastAdminEcosystemCategories.map((categoryId) => (
              <div
                key={categoryId}
                className="grid min-w-0 grid-cols-[auto_minmax(0,1fr)] gap-3"
              >
                <span
                  aria-hidden="true"
                  className={`mt-1 h-3.5 w-3.5 rounded-sm border ${legendClasses[categoryId]}`}
                />
                <div>
                  <dt className="text-xs font-black text-white">
                    {categoryLabels[categoryId]}
                  </dt>
                  <dd className="mt-0.5 text-xs leading-5 text-[#9aa7b8]">
                    {categoryPurposes[categoryId]}
                  </dd>
                </div>
              </div>
            ))}
          </dl>
        </div>

        <div>
          <h4 className="text-xs font-black uppercase tracking-wide text-[#9aa7b8]">
            Arrow meaning
          </h4>
          <dl className="mt-3 grid gap-3">
            {beastAdminEcosystemRelationKinds.map((kind) => {
              const relationship = relationshipLegend[kind];
              return (
                <div
                  key={kind}
                  className="grid min-w-0 grid-cols-[2.75rem_minmax(0,1fr)] gap-3"
                >
                  <span
                    aria-hidden="true"
                    className="mt-1 inline-flex h-4 items-center"
                  >
                    <span
                      className={`w-8 border-t-2 ${relationship.sampleClass}`}
                    />
                    <span className="-ml-0.5 text-sm text-white">›</span>
                  </span>
                  <div>
                    <dt className="text-xs font-black text-white">
                      {relationship.label}
                    </dt>
                    <dd className="mt-0.5 text-xs leading-5 text-[#9aa7b8]">
                      {relationship.description}
                    </dd>
                  </div>
                </div>
              );
            })}
          </dl>
        </div>
      </div>

      <p className="mt-4 border-t border-[#2a3242] pt-4 text-xs leading-5 text-[#68768b]">
        The map documents registered architecture; it does not inspect live
        member data or execute platform actions.
      </p>
    </section>
  );
}

function ConnectionRow({
  edge,
  selectedNodeId,
  nodesById,
  onNavigate,
}: {
  edge: BeastAdminEcosystemEdge;
  selectedNodeId: string;
  nodesById: ReadonlyMap<string, BeastAdminEcosystemNode>;
  onNavigate: (nodeId: string) => void;
}) {
  const outgoing = edge.from === selectedNodeId;
  const connectedId = getBeastAdminEcosystemConnectedNodeId(
    edge,
    selectedNodeId
  );
  if (!connectedId) return null;
  const connected = nodesById.get(connectedId);
  if (!connected) return null;

  return (
    <button
      type="button"
      aria-label={`Navigate to ${connected.label} through ${edge.label}`}
      data-architecture-navigation-target={connectedId}
      onClick={() => onNavigate(connectedId)}
      className="group w-full rounded-xl border border-[#2a3242] bg-[#111827] p-3 text-left transition hover:border-amber-200/60 focus-visible:border-amber-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300/30"
    >
      <span className="text-xs font-black uppercase tracking-wide text-[#7f8da3]">
        {outgoing ? `${edge.label} →` : `← ${edge.label}`}
      </span>
      <span className="mt-1 flex items-center justify-between gap-3 font-black text-white">
        <span>{connected.label}</span>
        <span
          aria-hidden="true"
          className="text-amber-200 transition-transform group-hover:translate-x-0.5"
        >
          →
        </span>
      </span>
      <span className="mt-2 block text-xs leading-5 text-[#9aa7b8]">
        {edge.description}
      </span>
    </button>
  );
}

export function BeastAdminEcosystemVisualizationWorkspace() {
  const map = useMemo(() => buildBeastAdminEcosystemMap(), []);
  const [selectedNodeId, setSelectedNodeId] = useState("platform-beastos");
  const [category, setCategory] = useState<
    BeastAdminEcosystemCategory | "all"
  >("all");
  const [query, setQuery] = useState("");
  const [showAllRelationships, setShowAllRelationships] = useState(false);
  const navigationSequenceRef = useRef(0);
  const [navigationRequest, setNavigationRequest] =
    useState<ArchitectureNavigationRequest | null>(null);

  const selectedNode =
    getBeastAdminEcosystemNode(map, selectedNodeId) || map.nodes[0];
  const focusedNodes = useMemo(
    () => filterBeastAdminEcosystemNodes(map, { category, query }),
    [category, map, query]
  );
  const focusedNodeIds = useMemo(
    () => new Set(focusedNodes.map((node) => node.id)),
    [focusedNodes]
  );
  const allNodeIds = useMemo(
    () => new Set(map.nodes.map((node) => node.id)),
    [map.nodes]
  );
  const visibleEdges = useMemo(
    () =>
      getBeastAdminEcosystemVisibleEdges(map, {
        visibleNodeIds: allNodeIds,
        selectedNodeId,
        showAllRelationships,
      }),
    [allNodeIds, map, selectedNodeId, showAllRelationships]
  );
  const selectedConnections = useMemo(
    () => getBeastAdminEcosystemConnections(map, selectedNode.id),
    [map, selectedNode.id]
  );
  const nodesById = useMemo(
    () => new Map(map.nodes.map((node) => [node.id, node])),
    [map.nodes]
  );
  const navigateToConnectedNode = useCallback(
    (nodeId: string) => {
      if (!getBeastAdminEcosystemNode(map, nodeId)) return;
      navigationSequenceRef.current += 1;
      setSelectedNodeId(nodeId);
      setNavigationRequest({
        nodeId,
        sequence: navigationSequenceRef.current,
      });
    },
    [map]
  );

  return (
    <div className="space-y-6">
      <DashboardCard accent="admin">
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_18rem] xl:items-end">
          <SectionHeader
            eyebrow="Interactive architecture map"
            title="How Beast fits together"
            description="Select a node to isolate its relationships. Focus controls emphasize a layer without removing the surrounding architecture."
          />
          <label className="grid gap-2 text-sm font-bold text-[#dbe3ef]">
            Find an architecture node
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search identity, memory, Money…"
              className="min-h-11 w-full rounded-lg border border-[#344052] bg-[#0b1220] px-3 py-2 text-sm text-white outline-none placeholder:text-[#68768b] focus:border-amber-300/70 focus:ring-2 focus:ring-amber-300/15"
            />
          </label>
        </div>

        <div className="mt-5 flex flex-wrap items-center gap-2">
          {(["all", ...beastAdminEcosystemCategories] as const).map(
            (categoryId) => (
              <button
                key={categoryId}
                type="button"
                aria-pressed={category === categoryId}
                onClick={() => setCategory(categoryId)}
                className={`rounded-full border px-3 py-2 text-xs font-black transition ${
                  category === categoryId
                    ? "border-amber-200 bg-amber-200/20 text-amber-100"
                    : "border-[#344052] bg-[#111827] text-[#9aa7b8] hover:border-amber-200/60"
                }`}
              >
                {categoryId === "all"
                  ? "All layers"
                  : categoryLabels[categoryId]}
              </button>
            )
          )}
          <label className="ml-auto flex min-h-10 items-center gap-2 rounded-full border border-[#344052] bg-[#111827] px-3 py-2 text-xs font-black text-[#dbe3ef]">
            <input
              type="checkbox"
              checked={showAllRelationships}
              onChange={(event) =>
                setShowAllRelationships(event.target.checked)
              }
              className="h-4 w-4 accent-amber-300"
            />
            Show all relationships
          </label>
        </div>

        {focusedNodes.length === 0 ? (
          <p className="mt-4 rounded-xl border border-dashed border-[#344052] bg-[#0b1220] p-4 text-sm text-[#9aa7b8]">
            No architecture nodes match this focus. Clear the search or choose a
            different layer; the verified map remains unchanged.
          </p>
        ) : null}
      </DashboardCard>

      <div className="grid min-w-0 gap-6 2xl:grid-cols-[minmax(0,1fr)_23rem]">
        <DashboardCard accent="admin">
          <ArchitectureGraph
            nodes={map.nodes}
            edges={visibleEdges}
            selectedNodeId={selectedNode.id}
            focusedNodeIds={focusedNodeIds}
            navigationRequest={navigationRequest}
            onSelect={setSelectedNodeId}
          />
          <ArchitectureLegend />
        </DashboardCard>

        <aside
          className="min-w-0 2xl:sticky 2xl:top-6 2xl:self-start"
          aria-live="polite"
          aria-label={`Architecture details for ${selectedNode.label}`}
        >
          <DashboardCard accent="admin">
            <p className="beast-kicker">
              {categoryLabels[selectedNode.category]}
            </p>
            <h2 className="mt-2 text-2xl font-black text-white">
              {selectedNode.label}
            </h2>
            <p className="mt-1 text-xs font-black uppercase tracking-wide text-amber-100">
              {selectedNode.status}
            </p>
            <div className="mt-4">
              <p className="text-xs font-black uppercase tracking-wide text-[#7f8da3]">
                Purpose
              </p>
              <p className="mt-2 text-sm leading-6 text-[#dbe3ef]">
                {selectedNode.purpose}
              </p>
            </div>

            <dl className="mt-5 grid gap-3">
              <div className="rounded-xl border border-[#2a3242] bg-[#111827] p-3">
                <dt className="text-xs font-black uppercase tracking-wide text-[#7f8da3]">
                  Owner
                </dt>
                <dd className="mt-1 text-sm font-black text-white">
                  {selectedNode.owner}
                </dd>
              </div>
              <div className="rounded-xl border border-[#2a3242] bg-[#111827] p-3">
                <dt className="text-xs font-black uppercase tracking-wide text-[#7f8da3]">
                  Direct relationships
                </dt>
                <dd className="mt-1 text-sm font-black text-white">
                  {selectedConnections.length}
                </dd>
              </div>
            </dl>

            <div className="mt-6">
              <h3 className="text-sm font-black text-white">Boundaries</h3>
              <ul className="mt-3 grid gap-2 text-sm leading-5 text-[#9aa7b8]">
                {selectedNode.boundaries.map((boundary) => (
                  <li key={boundary} className="flex gap-2">
                    <span aria-hidden="true" className="text-amber-200">
                      •
                    </span>
                    <span>{boundary}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="mt-6">
              <h3 className="text-sm font-black text-white">
                Connected architecture
              </h3>
              <p className="mt-2 text-xs leading-5 text-[#7f8da3]">
                Follow a connection to move through the map without changing
                your current search or layer focus.
              </p>
              <div className="mt-3 grid max-h-[28rem] gap-2 overflow-y-auto pr-1">
                {selectedConnections.map((connection) => (
                  <ConnectionRow
                    key={connection.id}
                    edge={connection}
                    selectedNodeId={selectedNode.id}
                    nodesById={nodesById}
                    onNavigate={navigateToConnectedNode}
                  />
                ))}
              </div>
            </div>

            <div className="mt-6 border-t border-[#2a3242] pt-5">
              <h3 className="text-sm font-black text-white">
                Source registries
              </h3>
              <ul className="mt-3 grid gap-2">
                {selectedNode.sourceRefs.map((sourceRef) => (
                  <li
                    key={sourceRef}
                    className="break-all rounded-lg bg-[#080d15] px-3 py-2 font-mono text-[11px] leading-5 text-[#9aa7b8]"
                  >
                    {sourceRef}
                  </li>
                ))}
              </ul>
            </div>
          </DashboardCard>
        </aside>
      </div>
    </div>
  );
}
