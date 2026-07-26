import {
  beastModuleRegistry,
  type BeastModuleRegistryEntry,
} from "./moduleRegistry";
import {
  professionalRelationshipDefinitions,
  type ProfessionalRelationshipDefinition,
} from "./platform/relationships";

export const beastAdminEcosystemCategories = [
  "platform",
  "fusion",
  "shared-service",
  "professional",
  "module",
] as const;

export type BeastAdminEcosystemCategory =
  (typeof beastAdminEcosystemCategories)[number];

export const beastAdminEcosystemRelations = [
  "owns",
  "governs",
  "hosts",
  "coordinates",
  "authorizes",
  "informs",
  "indexes",
  "routes",
  "provides-context",
] as const;

export type BeastAdminEcosystemRelation =
  (typeof beastAdminEcosystemRelations)[number];

export type BeastAdminEcosystemNode = {
  id: string;
  label: string;
  subtitle: string;
  category: BeastAdminEcosystemCategory;
  status: string;
  owner: string;
  description: string;
  boundaries: readonly string[];
  sourceRefs: readonly string[];
  x: number;
  y: number;
  width: number;
  height: number;
};

export type BeastAdminEcosystemEdge = {
  id: string;
  from: string;
  to: string;
  relation: BeastAdminEcosystemRelation;
  label: string;
  description: string;
};

export type BeastAdminEcosystemMap = {
  nodes: readonly BeastAdminEcosystemNode[];
  edges: readonly BeastAdminEcosystemEdge[];
};

const sharedServiceNodes: readonly BeastAdminEcosystemNode[] = [
  {
    id: "service-identity",
    label: "Identity",
    subtitle: "Authentication and profile",
    category: "shared-service",
    status: "active",
    owner: "BeastOS",
    description:
      "Provides one platform identity used by every authorized Beast application.",
    boundaries: [
      "Applications reference BeastOS identity instead of owning duplicate shared profiles.",
      "Authentication and owner context remain platform responsibilities.",
    ],
    sourceRefs: [
      "src/lib/platform/identity.ts",
      "src/lib/platform/personalHub.ts",
    ],
    x: 20,
    y: 140,
    width: 140,
    height: 64,
  },
  {
    id: "service-permissions",
    label: "Permissions",
    subtitle: "Default-deny access",
    category: "shared-service",
    status: "active",
    owner: "BeastOS",
    description:
      "Authorizes professional tools and context using explicit resource actions.",
    boundaries: [
      "Explicit deny wins.",
      "A professional cannot read or act without an allowed resource action.",
      "Database RLS remains an independent enforcement boundary.",
    ],
    sourceRefs: [
      "src/lib/platform/agents/permissions.ts",
      "src/lib/platform/familyVisibilityPermissions.ts",
    ],
    x: 175,
    y: 140,
    width: 140,
    height: 64,
  },
  {
    id: "service-memory",
    label: "Memory",
    subtitle: "Owner-scoped context",
    category: "shared-service",
    status: "active",
    owner: "BeastOS / BeastAgents",
    description:
      "Retains purpose-limited professional memory and supplies it to governed runs.",
    boundaries: [
      "Memory is owner and professional scoped.",
      "Durable memory never overrides permissions or safety.",
      "Stored evidence is distinct from hidden model reasoning.",
    ],
    sourceRefs: [
      "src/lib/platform/agents/memory.ts",
      "src/lib/platform/agents/governance.ts",
      "supabase/migrations/20260722000100_add_agent_conversations_and_memory.sql",
    ],
    x: 330,
    y: 140,
    width: 140,
    height: 64,
  },
  {
    id: "service-notifications",
    label: "Notifications",
    subtitle: "Shared action routing",
    category: "shared-service",
    status: "active",
    owner: "BeastOS",
    description:
      "Owns the shared inbox while routing actions back to source-owned module contracts.",
    boundaries: [
      "Source applications own notification creation and business actions.",
      "Notification actions do not mutate module records directly.",
    ],
    sourceRefs: ["src/lib/platform/notifications.ts"],
    x: 485,
    y: 140,
    width: 140,
    height: 64,
  },
  {
    id: "service-search",
    label: "Search",
    subtitle: "Personal knowledge index",
    category: "shared-service",
    status: "active",
    owner: "BeastOS",
    description:
      "Indexes authorized source records and groups results without taking ownership of them.",
    boundaries: [
      "Search respects module, family, and RLS permissions.",
      "Search does not edit indexed records or generate AI summaries.",
    ],
    sourceRefs: [
      "src/lib/platform/search.ts",
      "src/lib/platform/unifiedSearch.ts",
    ],
    x: 640,
    y: 140,
    width: 140,
    height: 64,
  },
  {
    id: "service-documents",
    label: "Documents",
    subtitle: "Permissioned evidence",
    category: "shared-service",
    status: "foundation",
    owner: "BeastOS",
    description:
      "Provides shared document infrastructure and permissioned confirmed facts to applications.",
    boundaries: [
      "Document intelligence requires explicit permission.",
      "Extracted facts remain proposed until the member confirms them.",
      "Applications consume confirmed facts only through purpose-limited access.",
    ],
    sourceRefs: ["src/lib/platform/documents.ts"],
    x: 795,
    y: 140,
    width: 140,
    height: 64,
  },
  {
    id: "service-timeline",
    label: "Timeline",
    subtitle: "Meaningful activity",
    category: "shared-service",
    status: "active",
    owner: "BeastOS",
    description:
      "Presents meaningful cross-module activity while preserving source ownership.",
    boundaries: [
      "Technical churn is excluded.",
      "Source applications own the original records and event meaning.",
    ],
    sourceRefs: [
      "src/lib/platform/timeline.ts",
      "src/lib/platform/professionalActivity.ts",
    ],
    x: 950,
    y: 140,
    width: 140,
    height: 64,
  },
] as const;

const modulePositions = [
  [20, 536],
  [175, 536],
  [330, 536],
  [485, 536],
  [640, 536],
  [795, 536],
  [950, 536],
] as const;

function moduleNode(
  module: BeastModuleRegistryEntry,
  position: readonly [number, number]
): BeastAdminEcosystemNode {
  return {
    id: `module-${module.id}`,
    label: module.name,
    subtitle: `${module.status} · ${module.visibility}`,
    category: "module",
    status: module.status,
    owner: module.id === "goals" || module.id === "documents" ? "BeastOS" : module.name,
    description: module.ownerNotes,
    boundaries: [
      "Owns its domain records and business rules.",
      "Consumes shared services through BeastOS contracts and permissions.",
    ],
    sourceRefs: ["src/lib/moduleRegistry.ts"],
    x: position[0],
    y: position[1],
    width: 140,
    height: 64,
  };
}

const professionalPositions = [
  [260, 388],
  [490, 388],
  [720, 388],
] as const;

function professionalNode(
  professional: ProfessionalRelationshipDefinition,
  position: readonly [number, number]
): BeastAdminEcosystemNode {
  return {
    id: `professional-${professional.agentId}`,
    label: professional.role,
    subtitle: professional.module,
    category: "professional",
    status: "registered relationship",
    owner:
      beastModuleRegistry.find((module) => module.module === professional.module)
        ?.name || professional.module,
    description: professional.defaultNextConversation,
    boundaries: [
      "Owns its professional reasoning and response.",
      "May use only permissioned, owner-scoped context.",
      "Cannot modify another professional's module records.",
    ],
    sourceRefs: [
      "src/lib/platform/relationships.ts",
      "src/lib/platform/agents/registry.ts",
    ],
    x: position[0],
    y: position[1],
    width: 180,
    height: 64,
  };
}

function edge(
  from: string,
  to: string,
  relation: BeastAdminEcosystemRelation,
  label: string,
  description: string
): BeastAdminEcosystemEdge {
  return {
    id: `${from}-${relation}-${to}`,
    from,
    to,
    relation,
    label,
    description,
  };
}

export function buildBeastAdminEcosystemMap({
  modules = beastModuleRegistry,
  professionals = professionalRelationshipDefinitions,
}: {
  modules?: readonly BeastModuleRegistryEntry[];
  professionals?: readonly ProfessionalRelationshipDefinition[];
} = {}): BeastAdminEcosystemMap {
  const beastOS = modules.find((module) => module.id === "beastos");
  if (!beastOS) {
    throw new Error("Ecosystem visualization requires the BeastOS platform registry entry.");
  }

  const applicationModules = modules.filter(
    (module) => module.id !== "beastos"
  );
  if (applicationModules.length > modulePositions.length) {
    throw new Error("Ecosystem visualization needs a position for every registered application.");
  }
  if (professionals.length > professionalPositions.length) {
    throw new Error("Ecosystem visualization needs a position for every registered professional.");
  }

  const nodes: BeastAdminEcosystemNode[] = [
    {
      id: "platform-beastos",
      label: "BeastOS",
      subtitle: "Platform operating system",
      category: "platform",
      status: beastOS.status,
      owner: "SEANGWORLD",
      description:
        "The shared platform connecting identity, permissions, memory, services, applications, and professional collaboration.",
      boundaries: [
        "BeastOS owns shared platform contracts, not application domain records.",
        "Applications remain independently responsible for their business logic.",
      ],
      sourceRefs: [
        "src/lib/moduleRegistry.ts",
        "src/lib/platform/identity.ts",
      ],
      x: 470,
      y: 20,
      width: 180,
      height: 72,
    },
    ...sharedServiceNodes,
    {
      id: "fusion-beastfusion",
      label: "BeastFusion",
      subtitle: "Collaboration and understanding",
      category: "fusion",
      status: "architecture",
      owner: "BeastOS",
      description:
        "Brokers permissioned shared context and advisory collaboration between independent professionals.",
      boundaries: [
        "Context access is read-only.",
        "Cross-module writes are not allowed.",
        "Recommendations explain why they were surfaced.",
        "The member retains decision authority; no autonomous execution occurs.",
      ],
      sourceRefs: [
        "src/lib/platform/agents/crossModuleRecommendations.ts",
        "src/lib/platform/agents/memberUnderstanding.ts",
        "src/lib/platform/agents/professionalJournal.ts",
        "src/lib/platform/agents/explainability.ts",
      ],
      x: 470,
      y: 264,
      width: 180,
      height: 72,
    },
    ...professionals.map((professional, index) =>
      professionalNode(professional, professionalPositions[index])
    ),
    ...applicationModules.map((module, index) =>
      moduleNode(module, modulePositions[index])
    ),
  ];

  const moduleNodeId = (moduleId: string) => `module-${moduleId}`;
  const professionalNodeId = (agentId: string) =>
    `professional-${agentId}`;
  const edges: BeastAdminEcosystemEdge[] = [];

  for (const service of sharedServiceNodes) {
    edges.push(
      edge(
        "platform-beastos",
        service.id,
        "owns",
        "Owns",
        `BeastOS owns the ${service.label} shared-service contract.`
      )
    );
  }
  edges.push(
    edge(
      "platform-beastos",
      "fusion-beastfusion",
      "governs",
      "Governs",
      "BeastOS supplies the permission, ownership, and advisory boundaries for BeastFusion."
    )
  );

  for (const application of applicationModules) {
    edges.push(
      edge(
        "platform-beastos",
        moduleNodeId(application.id),
        "hosts",
        "Hosts",
        `${application.name} runs as an application on BeastOS while retaining its domain ownership.`
      )
    );
    edges.push(
      edge(
        moduleNodeId(application.id),
        "service-search",
        "indexes",
        "Contributes permissioned index records",
        `${application.name} remains the source owner for records exposed through Search.`
      ),
      edge(
        moduleNodeId(application.id),
        "service-notifications",
        "routes",
        "Contributes source actions",
        `${application.name} owns notification creation and business actions routed through BeastOS.`
      ),
      edge(
        moduleNodeId(application.id),
        "service-timeline",
        "routes",
        "Contributes meaningful activity",
        `${application.name} supplies source-owned meaningful events to the shared Timeline.`
      )
    );
  }

  for (const professional of professionals) {
    const professionalId = professionalNodeId(professional.agentId);
    const ownerModule = modules.find(
      (module) => module.module === professional.module
    );
    if (!ownerModule) continue;
    edges.push(
      edge(
        "fusion-beastfusion",
        professionalId,
        "coordinates",
        "Coordinates advisory context",
        `${professional.role} remains independent while BeastFusion brokers approved context.`
      ),
      edge(
        "service-permissions",
        professionalId,
        "authorizes",
        "Authorizes",
        `${professional.role} receives only explicitly allowed resource actions and context.`
      ),
      edge(
        "service-memory",
        professionalId,
        "informs",
        "Informs governed runs",
        `${professional.role} receives its owner-scoped durable memory after permission and governance checks.`
      ),
      edge(
        "service-documents",
        professionalId,
        "provides-context",
        "Provides confirmed facts",
        `${professional.role} may consume confirmed document facts only when permission and purpose allow it.`
      ),
      edge(
        professionalId,
        moduleNodeId(ownerModule.id),
        "hosts",
        "Serves",
        `${professional.role} serves the ${ownerModule.name} experience without owning other applications.`
      )
    );
  }

  edges.push(
    edge(
      "service-permissions",
      "fusion-beastfusion",
      "authorizes",
      "Gates shared context",
      "BeastFusion receives only owner-scoped context that is explicitly allowed."
    ),
    edge(
      "service-memory",
      "fusion-beastfusion",
      "informs",
      "Supplies durable context",
      "BeastFusion may reference stored understanding without changing another module's records."
    ),
    edge(
      "service-timeline",
      "fusion-beastfusion",
      "provides-context",
      "Supplies meaningful history",
      "Meaningful prior events can support transparent, evidence-backed collaboration."
    )
  );

  return { nodes, edges };
}

export function getBeastAdminEcosystemNode(
  map: BeastAdminEcosystemMap,
  nodeId: string
) {
  return map.nodes.find((node) => node.id === nodeId);
}

export function getBeastAdminEcosystemConnections(
  map: BeastAdminEcosystemMap,
  nodeId: string
) {
  return map.edges.filter(
    (edge) => edge.from === nodeId || edge.to === nodeId
  );
}

export function filterBeastAdminEcosystemNodes(
  map: BeastAdminEcosystemMap,
  {
    category = "all",
    query = "",
  }: {
    category?: BeastAdminEcosystemCategory | "all";
    query?: string;
  } = {}
) {
  const normalizedQuery = query.trim().toLocaleLowerCase();
  return map.nodes.filter(
    (node) =>
      (category === "all" || node.category === category) &&
      (!normalizedQuery ||
        [
          node.label,
          node.subtitle,
          node.owner,
          node.description,
          ...node.boundaries,
        ].some((value) =>
          value.toLocaleLowerCase().includes(normalizedQuery)
        ))
  );
}

export function getBeastAdminEcosystemVisibleEdges(
  map: BeastAdminEcosystemMap,
  {
    visibleNodeIds,
    selectedNodeId,
    showAllRelationships,
  }: {
    visibleNodeIds: ReadonlySet<string>;
    selectedNodeId?: string;
    showAllRelationships: boolean;
  }
) {
  return map.edges.filter(
    (edge) =>
      visibleNodeIds.has(edge.from) &&
      visibleNodeIds.has(edge.to) &&
      (showAllRelationships ||
        !selectedNodeId ||
        edge.from === selectedNodeId ||
        edge.to === selectedNodeId)
  );
}
