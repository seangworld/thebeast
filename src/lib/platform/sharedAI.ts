import type { PlatformModule } from "./types";

export type SharedAIContextKind =
  | "User"
  | "Goal"
  | "Plan"
  | "Document"
  | "Timeline"
  | "Module";

export type SharedAIContextItem = {
  id: string;
  kind: SharedAIContextKind;
  source: PlatformModule;
  sourceRecordId: string;
  summary: string;
  permission: "Allowed" | "Restricted";
  retention: "Session" | "Persistent" | "Exportable";
};

export type SharedAIRecommendation = {
  id: string;
  title: string;
  explanation: string;
  assumptions: string[];
  sourceContextIds: string[];
  ownerModule?: PlatformModule;
};

export type SharedAIMemoryBoundary = {
  correctionsAllowed: boolean;
  retentionDays: number;
  exportAllowed: boolean;
  deletionAllowed: boolean;
  restrictedContextIds: string[];
};

export type SharedAISpecialistHandoff = {
  id: string;
  targetModule: "money" | "learning";
  specialist: "BeastMoney" | "BeastLearning Mentor" | "BeastLearning Tutor";
  reason: string;
  dispatchMode: "specialist-handoff";
  sourceOwnershipPreserved: true;
};

export const sharedAIContractRules = [
  "BeastOS Shared AI owns permissioned context assembly, recommendation framing, explanation metadata, memory boundaries, and specialist handoff routing.",
  "Source modules own module-specific reasoning, calculations, teaching behavior, completion, transactions, mastery, and business actions.",
  "Shared AI context must identify kind, source module, source record, permission, retention, and export posture.",
  "Specialist handoffs route to BeastMoney or BeastLearning without BeastOS taking ownership of specialist logic.",
];

function assertNonEmpty(value: string, label: string) {
  if (!value.trim()) throw new Error(`Shared AI ${label} is required.`);
}

export function buildSharedAIContext(items: SharedAIContextItem[]) {
  return items
    .map((item) => {
      assertNonEmpty(item.id, "context id");
      assertNonEmpty(item.sourceRecordId, "source record id");
      assertNonEmpty(item.summary, "summary");
      return item;
    })
    .filter((item) => item.permission === "Allowed");
}

export function buildSharedAIRecommendation({
  id,
  title,
  context,
  ownerModule,
}: {
  id: string;
  title: string;
  context: SharedAIContextItem[];
  ownerModule?: PlatformModule;
}): SharedAIRecommendation {
  assertNonEmpty(id, "recommendation id");
  assertNonEmpty(title, "recommendation title");
  const allowed = buildSharedAIContext(context);

  return {
    id,
    title,
    explanation: "Recommendation is framed from permissioned shared context and leaves module logic with the source owner.",
    assumptions: allowed.map((item) => `${item.kind}: ${item.summary}`),
    sourceContextIds: allowed.map((item) => item.id),
    ownerModule,
  };
}

export function buildSharedAIMemoryBoundary({
  context,
  retentionDays,
}: {
  context: SharedAIContextItem[];
  retentionDays: number;
}): SharedAIMemoryBoundary {
  return {
    correctionsAllowed: true,
    retentionDays: Math.max(0, retentionDays),
    exportAllowed: true,
    deletionAllowed: true,
    restrictedContextIds: context
      .filter((item) => item.permission === "Restricted")
      .map((item) => item.id),
  };
}

export function buildSharedAISpecialistHandoff({
  request,
}: {
  request: string;
}): SharedAISpecialistHandoff {
  const normalized = request.toLowerCase();
  const targetModule = normalized.includes("money") || normalized.includes("bill")
    ? "money"
    : "learning";

  return {
    id: `shared-ai-handoff-${targetModule}`,
    targetModule,
    specialist:
      targetModule === "money"
        ? "BeastMoney"
        : normalized.includes("tutor")
          ? "BeastLearning Tutor"
          : "BeastLearning Mentor",
    reason: "Route to the owning module specialist for domain-specific logic.",
    dispatchMode: "specialist-handoff",
    sourceOwnershipPreserved: true,
  };
}
