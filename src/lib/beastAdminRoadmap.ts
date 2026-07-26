import { getModuleRegistryEntry } from "./moduleRegistry";

export const beastAdminRoadmapStatuses = [
  "planned",
  "in_progress",
  "testing",
  "released",
  "archived",
] as const;

export type BeastAdminRoadmapStatus =
  (typeof beastAdminRoadmapStatuses)[number];

export const beastAdminRoadmapStatusLabels: Record<
  BeastAdminRoadmapStatus,
  string
> = {
  planned: "Planned",
  in_progress: "In Progress",
  testing: "Testing",
  released: "Released",
  archived: "Archived",
};

export const beastAdminRoadmapProductIds = [
  "beastos",
  "money",
  "education",
  "health",
  "goals",
  "documents",
  "home",
  "fusion",
  "seangworld",
  "future",
] as const;

export type BeastAdminRoadmapProductId =
  (typeof beastAdminRoadmapProductIds)[number];

export type BeastAdminRoadmapProduct = {
  id: BeastAdminRoadmapProductId;
  name: string;
  purpose: string;
  currentVersion: string | null;
  sourceLabel: string;
};

function moduleProduct({
  id,
  moduleId,
  name,
  purpose,
}: {
  id: BeastAdminRoadmapProductId;
  moduleId:
    | "beastos"
    | "money"
    | "learning"
    | "health"
    | "goals"
    | "documents"
    | "home";
  name: string;
  purpose: string;
}): BeastAdminRoadmapProduct {
  const registryEntry = getModuleRegistryEntry(moduleId);

  return {
    id,
    name,
    purpose,
    currentVersion: registryEntry?.version || null,
    sourceLabel: "Beast module registry",
  };
}

export const beastAdminRoadmapProducts: BeastAdminRoadmapProduct[] = [
  moduleProduct({
    id: "beastos",
    moduleId: "beastos",
    name: "BeastOS",
    purpose: "Shared platform, identity, permissions, memory, and services.",
  }),
  moduleProduct({
    id: "money",
    moduleId: "money",
    name: "Money",
    purpose: "Financial planning and the Money Coach relationship.",
  }),
  moduleProduct({
    id: "education",
    moduleId: "learning",
    name: "Education",
    purpose: "Educational planning and the Guidance Counselor relationship.",
  }),
  moduleProduct({
    id: "health",
    moduleId: "health",
    name: "Health",
    purpose: "Personal health organization and professional guidance.",
  }),
  moduleProduct({
    id: "goals",
    moduleId: "goals",
    name: "Goals",
    purpose: "Shared objectives, plans, milestones, and progress.",
  }),
  moduleProduct({
    id: "documents",
    moduleId: "documents",
    name: "Documents",
    purpose: "Personal records, uploads, and document intelligence.",
  }),
  moduleProduct({
    id: "home",
    moduleId: "home",
    name: "Home",
    purpose: "Household operations, maintenance, and home context.",
  }),
  {
    id: "fusion",
    name: "Fusion",
    purpose: "Cross-professional collaboration and shared understanding.",
    currentVersion: null,
    sourceLabel: "External product; no version in the Beast manifest",
  },
  {
    id: "seangworld",
    name: "SEANGWORLD",
    purpose: "Company, product ecosystem, and public development story.",
    currentVersion: null,
    sourceLabel: "External product; no version in the Beast manifest",
  },
  {
    id: "future",
    name: "Future products",
    purpose: "Unannounced or newly proposed products awaiting definition.",
    currentVersion: null,
    sourceLabel: "Owner-managed planning category",
  },
];

export type BeastAdminRoadmapItem = {
  id: string;
  userId: string;
  productId: BeastAdminRoadmapProductId;
  title: string;
  summary: string;
  status: BeastAdminRoadmapStatus;
  ownerNotes: string;
  createdAt: string;
  updatedAt: string;
};

export type BeastAdminRoadmapRow = {
  id: string;
  user_id: string;
  product_id: string;
  title: string;
  summary: string | null;
  status: string;
  owner_notes: string | null;
  created_at: string;
  updated_at: string;
};

export type BeastAdminRoadmapFilters = {
  productId: BeastAdminRoadmapProductId | "all";
  status: BeastAdminRoadmapStatus | "all";
  query: string;
};

export function isBeastAdminRoadmapProductId(
  value: unknown
): value is BeastAdminRoadmapProductId {
  return beastAdminRoadmapProductIds.includes(
    value as BeastAdminRoadmapProductId
  );
}

export function isBeastAdminRoadmapStatus(
  value: unknown
): value is BeastAdminRoadmapStatus {
  return beastAdminRoadmapStatuses.includes(
    value as BeastAdminRoadmapStatus
  );
}

export function normalizeBeastAdminRoadmapRow(
  row: BeastAdminRoadmapRow
): BeastAdminRoadmapItem | null {
  if (
    !isBeastAdminRoadmapProductId(row.product_id) ||
    !isBeastAdminRoadmapStatus(row.status) ||
    !row.title.trim()
  ) {
    return null;
  }

  return {
    id: row.id,
    userId: row.user_id,
    productId: row.product_id,
    title: row.title.trim(),
    summary: row.summary?.trim() || "",
    status: row.status,
    ownerNotes: row.owner_notes?.trim() || "",
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function filterBeastAdminRoadmapItems(
  items: BeastAdminRoadmapItem[],
  filters: BeastAdminRoadmapFilters
) {
  const query = filters.query.trim().toLocaleLowerCase();

  return items.filter((item) => {
    if (filters.productId !== "all" && item.productId !== filters.productId) {
      return false;
    }
    if (filters.status !== "all" && item.status !== filters.status) {
      return false;
    }
    if (!query) return true;

    return [item.title, item.summary, item.ownerNotes].some((value) =>
      value.toLocaleLowerCase().includes(query)
    );
  });
}

export function buildBeastAdminRoadmapCounts(
  items: BeastAdminRoadmapItem[]
) {
  return beastAdminRoadmapStatuses.reduce<
    Record<BeastAdminRoadmapStatus, number>
  >(
    (counts, status) => {
      counts[status] = items.filter((item) => item.status === status).length;
      return counts;
    },
    {
      planned: 0,
      in_progress: 0,
      testing: 0,
      released: 0,
      archived: 0,
    }
  );
}

export function getBeastAdminRoadmapLifecyclePosition(
  status: BeastAdminRoadmapStatus
) {
  if (status === "archived") {
    return {
      current: 0,
      total: 4,
      label: "Archived outside the active delivery lifecycle",
    };
  }

  const activeStatuses: BeastAdminRoadmapStatus[] = [
    "planned",
    "in_progress",
    "testing",
    "released",
  ];
  const current = activeStatuses.indexOf(status) + 1;

  return {
    current,
    total: activeStatuses.length,
    label: `${current} of ${activeStatuses.length} delivery stages`,
  };
}

export function getBeastAdminRoadmapProduct(
  productId: BeastAdminRoadmapProductId
) {
  return beastAdminRoadmapProducts.find((product) => product.id === productId);
}
