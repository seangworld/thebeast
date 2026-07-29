import type { BeastModuleRegistryEntry } from "@/lib/moduleRegistry";
import versionManifest from "../version-manifest.json";
import { personalInformationCanonicalRoute } from "./personalHub";
import {
  buildPlatformSearchItem,
  type PlatformSearchItem,
  type SearchPermissionScope,
} from "./search";
import type { PlatformModule } from "./types";
import { educationTeachingCapabilitiesAvailable } from "../education/generationBoundary";

export type UnifiedConversationRecord = {
  id: string;
  agentId: string;
  title: string;
  summary: string;
  tags: string[];
  updatedAt: string;
};

export type UnifiedGoalRecord = {
  id: string;
  title: string;
  summary: string;
  category: string;
  status: string;
  currentStep: string;
  sourceModule?: PlatformModule;
  updatedAt: string;
};

export type UnifiedDocumentRecord = {
  id: string;
  title: string;
  category: string;
  status: string;
  fileName: string;
  mimeType: string;
  sourceModule?: PlatformModule;
  updatedAt: string;
};

export type UnifiedFinancialAccountRecord = {
  id: string;
  name: string;
  type: string;
  active: boolean;
  updatedAt: string;
};

export type UnifiedDebtRecord = {
  id: string;
  name: string;
  archived: boolean;
  updatedAt: string;
};

export type UnifiedLessonRecord = {
  id: string;
  title: string;
  activityType: string;
  difficulty: string;
  status: string;
  updatedAt: string;
};

export type UnifiedRoadmapRecord = {
  id: string;
  title: string;
  summary: string;
  updatedAt: string;
};

export type UnifiedFamilyMemberRecord = {
  id: string;
  displayName: string;
  relationship: string;
  permissionScope: SearchPermissionScope;
  updatedAt: string;
};

export type UnifiedSearchSources = {
  conversations?: UnifiedConversationRecord[];
  goals?: UnifiedGoalRecord[];
  documents?: UnifiedDocumentRecord[];
  financialAccounts?: UnifiedFinancialAccountRecord[];
  debts?: UnifiedDebtRecord[];
  lessons?: UnifiedLessonRecord[];
  roadmaps?: UnifiedRoadmapRecord[];
  familyMembers?: UnifiedFamilyMemberRecord[];
  futureModules?: BeastModuleRegistryEntry[];
  allowedModules?: PlatformModule[];
};

function conversationSource(agentId: string): PlatformModule {
  const normalized = agentId.toLowerCase();
  if (normalized.includes("money")) return "money";
  if (
    normalized.includes("guidance") ||
    normalized.includes("education") ||
    normalized.includes("tutor")
  ) {
    return "learning";
  }
  if (normalized.includes("health")) return "health";
  if (normalized.includes("home")) return "home";
  return "beastos";
}

function conversationHref(source: PlatformModule) {
  if (source === "money") return "/dashboard/money";
  if (source === "learning") return "/dashboard/education";
  if (source === "health") return "/dashboard/health";
  if (source === "home") return "/dashboard/home";
  return "/dashboard";
}

function sourceOrFallback(
  source: PlatformModule | undefined,
  fallback: PlatformModule
) {
  return source || fallback;
}

function item(
  value: PlatformSearchItem
): PlatformSearchItem {
  return buildPlatformSearchItem(value);
}

export function buildUnifiedSearchItems({
  conversations = [],
  goals = [],
  documents = [],
  financialAccounts = [],
  debts = [],
  lessons = [],
  roadmaps = [],
  familyMembers = [],
  futureModules = [],
  allowedModules,
}: UnifiedSearchSources): PlatformSearchItem[] {
  const results: PlatformSearchItem[] = [];

  conversations.forEach((conversation) => {
    const source = conversationSource(conversation.agentId);
    const href = conversationHref(source);
    results.push(
      item({
        id: `conversation-${conversation.id}`,
        source,
        sourceRecordId: conversation.id,
        domain: "Conversations",
        title: conversation.title,
        summary:
          conversation.summary ||
          `Conversation with ${conversation.agentId.replace(/[._-]+/g, " ")}.`,
        keywords: [
          "conversation",
          "chat",
          conversation.agentId,
          ...conversation.tags,
        ],
        href,
        permissionScope: "Owner",
        updatedAt: conversation.updatedAt,
        actions: [{ type: "Open", label: "Open conversation", href }],
      })
    );
  });

  goals.forEach((goal) => {
    results.push(
      item({
        id: `goal-${goal.id}`,
        source: sourceOrFallback(goal.sourceModule, "goals"),
        sourceRecordId: goal.id,
        domain: "Goals",
        title: goal.title,
        summary:
          goal.summary ||
          goal.currentStep ||
          `${goal.status} ${goal.category.toLowerCase()} goal.`,
        keywords: [
          "goal",
          goal.category,
          goal.status,
          goal.currentStep,
        ],
        href: "/dashboard/goals",
        permissionScope: "Owner",
        updatedAt: goal.updatedAt,
        actions: [
          {
            type: "Open",
            label: "Open goal",
            href: "/dashboard/goals",
          },
        ],
      })
    );
  });

  documents
    .filter((document) => document.status !== "Deleted")
    .forEach((document) => {
      const healthRecord = document.category === "Health";
      const uploadedFile = document.status === "Uploaded";
      const domain = healthRecord
        ? "Health records"
        : uploadedFile
          ? "Uploaded files"
          : "Documents";
      results.push(
        item({
          id: `document-${document.id}`,
          source: sourceOrFallback(document.sourceModule, "documents"),
          sourceRecordId: document.id,
          domain,
          title: document.title,
          summary: `${document.category} ${document.status.toLowerCase()} document.`,
          keywords: [
            "document",
            "file",
            "upload",
            document.category,
            document.status,
            document.fileName,
            document.mimeType,
          ],
          href: "/dashboard/uploads",
          permissionScope: "Owner",
          updatedAt: document.updatedAt,
          actions: [
            {
              type: "Open",
              label: "Open document",
              href: "/dashboard/uploads",
            },
          ],
        })
      );
    });

  financialAccounts.forEach((account) => {
    results.push(
      item({
        id: `financial-account-${account.id}`,
        source: "money",
        sourceRecordId: account.id,
        domain: "Financial accounts",
        title: account.name,
        summary: `${account.active ? "Active" : "Inactive"} ${account.type} account.`,
        keywords: [
          "money",
          "financial",
          "account",
          "funding source",
          account.type,
          account.active ? "active" : "inactive",
        ],
        href: "/dashboard/money/cashflow#funding-sources",
        permissionScope: "Owner",
        updatedAt: account.updatedAt,
        actions: [
          {
            type: "Open",
            label: "Open account",
            href: "/dashboard/money/cashflow#funding-sources",
          },
        ],
      })
    );
  });

  debts.forEach((debt) => {
    results.push(
      item({
        id: `debt-${debt.id}`,
        source: "money",
        sourceRecordId: debt.id,
        domain: "Debts",
        title: debt.name,
        summary: `${debt.archived ? "Archived" : "Active"} debt account.`,
        keywords: [
          "money",
          "debt",
          "payoff",
          debt.archived ? "archived" : "active",
        ],
        href: "/dashboard/money/debts",
        permissionScope: "Owner",
        updatedAt: debt.updatedAt,
        actions: [
          {
            type: "Open",
            label: "Open debt",
            href: "/dashboard/money/debts",
          },
        ],
      })
    );
  });

  if (educationTeachingCapabilitiesAvailable) {
    lessons.forEach((lesson) => {
      const href = `/dashboard/education/activities/${lesson.id}`;
      results.push(
        item({
          id: `lesson-${lesson.id}`,
          source: "learning",
          sourceRecordId: lesson.id,
          domain: "Lessons",
          title: lesson.title,
          summary: `${lesson.status} ${lesson.difficulty.toLowerCase()} ${lesson.activityType.toLowerCase()} lesson.`,
          keywords: [
            "education",
            "lesson",
            lesson.activityType,
            lesson.difficulty,
            lesson.status,
          ],
          href,
          permissionScope: "Owner",
          updatedAt: lesson.updatedAt,
          actions: [{ type: "Resume", label: "Open lesson", href }],
        })
      );
    });
  }

  roadmaps.forEach((roadmap) => {
    results.push(
      item({
        id: `roadmap-${roadmap.id}`,
        source: "learning",
        sourceRecordId: roadmap.id,
        domain: "Roadmaps",
        title: roadmap.title,
        summary: roadmap.summary || "Your saved educational roadmap.",
        keywords: ["education", "roadmap", "plan", "learning path"],
        href: "/dashboard/education/educational-roadmap",
        permissionScope: "Owner",
        updatedAt: roadmap.updatedAt,
        actions: [
          {
            type: "Open",
            label: "Open roadmap",
            href: "/dashboard/education/educational-roadmap",
          },
        ],
      })
    );
  });

  familyMembers.forEach((member) => {
    results.push(
      item({
        id: `family-member-${member.id}`,
        source: "family",
        sourceRecordId: member.id,
        domain: "Family members",
        title: member.displayName,
        summary: member.relationship
          ? `Family relationship: ${member.relationship}.`
          : "Family member.",
        keywords: ["family", "household", "member", member.relationship],
        href: personalInformationCanonicalRoute,
        permissionScope: member.permissionScope,
        updatedAt: member.updatedAt,
        actions: [
          {
            type: "Open",
            label: "Open family profile",
            href: personalInformationCanonicalRoute,
          },
        ],
      })
    );
  });

  futureModules
    .filter(
      (module) =>
        module.enabled &&
        module.status !== "active" &&
        Boolean(module.href) &&
        module.module !== "admin"
    )
    .forEach((module) => {
      results.push(
        item({
          id: `future-module-${module.id}`,
          source: module.module,
          sourceRecordId: module.id,
          domain: "Future modules",
          title: module.name,
          summary: module.ownerNotes,
          keywords: [
            "future",
            "module",
            module.name,
            module.status,
            module.visibility,
          ],
          href: module.href as string,
          permissionScope: "Owner",
          updatedAt: `${versionManifest.generatedAt}T00:00:00.000Z`,
          actions: [
            {
              type: "Open",
              label: `Open ${module.name}`,
              href: module.href,
            },
          ],
        })
      );
    });

  return allowedModules
    ? results.filter((result) => allowedModules.includes(result.source))
    : results;
}
