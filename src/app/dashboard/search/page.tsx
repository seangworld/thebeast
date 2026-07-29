import { PlatformServiceHero } from "@/app/dashboard/platformServices";
import {
  beastModuleRegistry,
  getVisibleModuleRegistryEntries,
} from "@/lib/moduleRegistry";
import { shouldUseLearningOnlyNavigation } from "@/lib/learning/access";
import {
  buildUnifiedSearchItems,
  type UnifiedConversationRecord,
  type UnifiedDebtRecord,
  type UnifiedDocumentRecord,
  type UnifiedFinancialAccountRecord,
  type UnifiedGoalRecord,
  type UnifiedLessonRecord,
  type UnifiedRoadmapRecord,
} from "@/lib/platform/unifiedSearch";
import type { PlatformModule } from "@/lib/platform/types";
import { educationTeachingCapabilitiesAvailable } from "@/lib/education/generationBoundary";
import { createRouteClient } from "@/lib/supabase/server";
import UnifiedSearchWorkspace from "./UnifiedSearchWorkspace";

type UnifiedSearchLoadResult = {
  items: ReturnType<typeof buildUnifiedSearchItems>;
  allowedModules: PlatformModule[];
  ownerStorageKey: string;
  state: "ready" | "signed-out" | "unavailable";
};

const sharedSearchModules: PlatformModule[] = [
  "beastos",
  "goals",
  "documents",
  "family",
];

function stringValue(value: unknown) {
  return typeof value === "string" ? value : "";
}

function stringArray(value: unknown) {
  return Array.isArray(value) ? value.map(String) : [];
}

function platformModule(value: unknown): PlatformModule | undefined {
  const supported: PlatformModule[] = [
    "beastos",
    "money",
    "learning",
    "health",
    "home",
    "projects",
    "vehicles",
    "family",
    "goals",
    "documents",
    "calendar",
    "notifications",
    "timeline",
    "search",
    "admin",
  ];
  return supported.includes(value as PlatformModule)
    ? (value as PlatformModule)
    : undefined;
}

function conversationSummary(value: unknown) {
  if (typeof value === "string") return value;
  if (!value || typeof value !== "object") return "";
  return stringValue((value as Record<string, unknown>).overview);
}

function mapConversations(
  rows: Record<string, unknown>[]
): UnifiedConversationRecord[] {
  return rows.map((row) => ({
    id: String(row.id),
    agentId: stringValue(row.agent_id),
    title: stringValue(row.title) || "Conversation",
    summary: conversationSummary(row.summary),
    tags: stringArray(row.tags),
    updatedAt: stringValue(row.updated_at),
  }));
}

function mapGoals(rows: Record<string, unknown>[]): UnifiedGoalRecord[] {
  return rows.map((row) => ({
    id: String(row.id),
    title: stringValue(row.title),
    summary: stringValue(row.summary),
    category: stringValue(row.category),
    status: stringValue(row.status),
    currentStep: stringValue(row.current_step),
    sourceModule: platformModule(row.source_module),
    updatedAt: stringValue(row.updated_at),
  }));
}

function mapDocuments(
  rows: Record<string, unknown>[]
): UnifiedDocumentRecord[] {
  return rows.map((row) => ({
    id: String(row.id),
    title: stringValue(row.title),
    category: stringValue(row.category),
    status: stringValue(row.status),
    fileName: stringValue(row.file_name),
    mimeType: stringValue(row.mime_type),
    sourceModule: platformModule(row.source_module),
    updatedAt: stringValue(row.updated_at),
  }));
}

function mapFinancialAccounts(
  rows: Record<string, unknown>[]
): UnifiedFinancialAccountRecord[] {
  return rows.map((row) => ({
    id: String(row.id),
    name: stringValue(row.name),
    type: stringValue(row.type),
    active: row.is_active !== false,
    updatedAt: stringValue(row.created_at),
  }));
}

function mapDebts(rows: Record<string, unknown>[]): UnifiedDebtRecord[] {
  return rows.map((row) => ({
    id: String(row.id),
    name: stringValue(row.name),
    archived: row.is_archived === true,
    updatedAt: stringValue(row.created_at),
  }));
}

function mapLessons(rows: Record<string, unknown>[]): UnifiedLessonRecord[] {
  return rows.map((row) => ({
    id: String(row.id),
    title: stringValue(row.title),
    activityType: stringValue(row.activity_type) || "Learning",
    difficulty: stringValue(row.difficulty) || "Current",
    status: stringValue(row.status) || "Ready",
    updatedAt: stringValue(row.updated_at) || stringValue(row.created_at),
  }));
}

function mapRoadmaps(rows: Record<string, unknown>[]): UnifiedRoadmapRecord[] {
  return rows.map((row) => ({
    id: String(row.id),
    title: stringValue(row.title),
    summary: stringValue(row.summary),
    updatedAt: stringValue(row.updated_at) || stringValue(row.created_at),
  }));
}

function emptyQueryResult() {
  return Promise.resolve({
    data: [] as Record<string, unknown>[],
    error: null,
  });
}

async function loadUnifiedSearch(): Promise<UnifiedSearchLoadResult> {
  try {
    const client = createRouteClient();
    const { data: userData, error: userError } = await client.auth.getUser();

    if (userError || !userData.user) {
      return {
        items: [],
        allowedModules: [],
        ownerStorageKey: "beastos:search:recent:signed-out",
        state: userData.user ? "unavailable" : "signed-out",
      };
    }

    const ownerId = userData.user.id;
    const [profileResult, learnerProfileResult] = await Promise.all([
      client
        .from("profiles")
        .select("role, birthday, current_academic_level")
        .eq("id", ownerId)
        .maybeSingle(),
      client
        .from("learning_profiles")
        .select("learner_role")
        .eq("user_id", ownerId)
        .order("created_at", { ascending: true })
        .limit(1),
    ]);
    const profile = (profileResult.data || {}) as Record<string, unknown>;
    const learnerProfile = (
      (learnerProfileResult.data || []) as Record<string, unknown>[]
    )[0];
    const isOwner = profile.role === "admin";
    const learningOnly = shouldUseLearningOnlyNavigation({
      role: stringValue(profile.role),
      birthday: stringValue(profile.birthday),
      learnerRole: stringValue(learnerProfile?.learner_role),
      gradeLevel: stringValue(profile.current_academic_level),
    });
    const visibleModules = getVisibleModuleRegistryEntries({
      isOwner,
      registry: beastModuleRegistry,
    })
      .map((module) => module.module as PlatformModule)
      .filter(
        (module) =>
          !learningOnly || !["money", "health", "home", "admin"].includes(module)
      );
    const allowedModules = Array.from(
      new Set([...sharedSearchModules, ...visibleModules])
    );
    const canSearchMoney = allowedModules.includes("money");
    const canSearchLearning = allowedModules.includes("learning");
    const canSearchTeaching =
      canSearchLearning && educationTeachingCapabilitiesAvailable;

    const [
      conversationsResult,
      goalsResult,
      documentsResult,
      financialAccountsResult,
      debtsResult,
      lessonsResult,
      roadmapsResult,
    ] = await Promise.all([
      client
        .from("agent_conversations")
        .select("id, agent_id, title, summary, tags, updated_at")
        .eq("owner_id", ownerId)
        .order("updated_at", { ascending: false })
        .limit(100),
      client
        .from("beast_goals")
        .select(
          "id, title, summary, category, status, current_step, source_module, updated_at"
        )
        .eq("owner_id", ownerId)
        .order("updated_at", { ascending: false })
        .limit(100),
      client
        .from("beast_documents")
        .select(
          "id, title, category, status, file_name, mime_type, source_module, updated_at"
        )
        .eq("owner_id", ownerId)
        .order("updated_at", { ascending: false })
        .limit(100),
      canSearchMoney
        ? client
            .from("funding_sources")
            .select("id, name, type, is_active, created_at")
            .eq("user_id", ownerId)
            .order("created_at", { ascending: false })
            .limit(100)
        : emptyQueryResult(),
      canSearchMoney
        ? client
            .from("debts")
            .select("id, name, is_archived, created_at")
            .eq("user_id", ownerId)
            .order("created_at", { ascending: false })
            .limit(100)
        : emptyQueryResult(),
      canSearchTeaching
        ? client
            .from("learning_activities")
            .select(
              "id, title, activity_type, difficulty, status, created_at, updated_at"
            )
            .eq("user_id", ownerId)
            .order("updated_at", { ascending: false })
            .limit(100)
        : emptyQueryResult(),
      canSearchLearning
        ? client
            .from("learning_plans")
            .select("id, title, summary, created_at, updated_at")
            .eq("user_id", ownerId)
            .order("updated_at", { ascending: false })
            .limit(100)
        : emptyQueryResult(),
    ]);

    const data = (result: {
      data: unknown;
      error: unknown;
    }): Record<string, unknown>[] =>
      result.error ? [] : ((result.data || []) as Record<string, unknown>[]);
    const futureModules = getVisibleModuleRegistryEntries({
      isOwner,
      registry: beastModuleRegistry,
    }).filter((module) => !learningOnly || allowedModules.includes(module.module));

    return {
      items: buildUnifiedSearchItems({
        conversations: mapConversations(data(conversationsResult)),
        goals: mapGoals(data(goalsResult)),
        documents: mapDocuments(data(documentsResult)),
        financialAccounts: mapFinancialAccounts(data(financialAccountsResult)),
        debts: mapDebts(data(debtsResult)),
        lessons: mapLessons(data(lessonsResult)),
        roadmaps: mapRoadmaps(data(roadmapsResult)),
        familyMembers: [],
        futureModules,
        allowedModules,
      }),
      allowedModules,
      ownerStorageKey: `beastos:search:recent:${ownerId}`,
      state: "ready",
    };
  } catch {
    return {
      items: [],
      allowedModules: [],
      ownerStorageKey: "beastos:search:recent:unavailable",
      state: "unavailable",
    };
  }
}

export default async function SearchPage() {
  const search = await loadUnifiedSearch();

  return (
    <main className="beast-page">
      <div className="beast-container space-y-8">
        <PlatformServiceHero
          module="search"
          eyebrow="BeastOS Shared Service"
          title="Search Beast"
          description="Search your conversations, plans, records, and files as one permissioned personal knowledge base."
        />
        <UnifiedSearchWorkspace
          items={search.items}
          allowedModules={search.allowedModules}
          ownerStorageKey={search.ownerStorageKey}
          loadState={search.state}
        />
      </div>
    </main>
  );
}
