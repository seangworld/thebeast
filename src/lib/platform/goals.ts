import type { PlatformModule } from "./types";
import type {
  BeastGoal as BeastGoalRow,
  BeastGoalContribution as BeastGoalContributionRow,
  BeastGoalLifecycleEvent as BeastGoalLifecycleEventRow,
  BeastGoalMilestone as BeastGoalMilestoneRow,
  BeastGoalRecommendation as BeastGoalRecommendationRow,
  BeastGoalReference as BeastGoalReferenceRow,
  BeastGoalSupportItem as BeastGoalSupportItemRow,
} from "@/lib/types/database";

export type GoalStatus =
  | "Proposed"
  | "Active"
  | "Paused"
  | "Blocked"
  | "Completed"
  | "Archived";

export type GoalCategory =
  | "Education"
  | "Career"
  | "Money"
  | "Personal"
  | "Project"
  | "Home"
  | "Health"
  | "Other";

export type GoalMilestoneStatus =
  | "Not Started"
  | "In Progress"
  | "Completed"
  | "Skipped";

export type GoalSupportItemType =
  | "Dependency"
  | "Prerequisite"
  | "Blocker"
  | "Recurring Action";

export type GoalSupportItemStatus =
  | "Needed"
  | "In Progress"
  | "Satisfied"
  | "Blocked"
  | "Open"
  | "Resolved"
  | "Active"
  | "Paused";

export type GoalSupportItemCadence =
  | "Daily"
  | "Weekly"
  | "Biweekly"
  | "Monthly"
  | "Custom";

export type GoalReferenceType =
  | "Note"
  | "Document"
  | "Event"
  | "Module Record"
  | "Today"
  | "Calendar";

export type GoalReferenceStatus = "Active" | "Archived";

export type GoalContributionType =
  | "Progress"
  | "Recommendation"
  | "Milestone"
  | "Evidence"
  | "Review";

export type GoalContributionStatus = "Active" | "Dismissed" | "Archived";

export type GoalRecommendationType =
  | "Next Action"
  | "Review"
  | "Milestone"
  | "Risk"
  | "Opportunity";

export type GoalRecommendationStatus =
  | "Suggested"
  | "Accepted"
  | "Dismissed"
  | "Completed"
  | "Archived";

export type GoalLifecycleEventType =
  | "Completed"
  | "Abandoned"
  | "Revised"
  | "Archived"
  | "Superseded";

export type GoalMilestone = {
  id: string;
  ownerId: string;
  goalId: string;
  title: string;
  status: GoalMilestoneStatus;
  targetDate?: string;
  completedAt?: string;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
};

export type GoalSupportItem = {
  id: string;
  ownerId: string;
  goalId: string;
  type: GoalSupportItemType;
  title: string;
  status: GoalSupportItemStatus;
  summary?: string;
  cadence?: GoalSupportItemCadence;
  nextDueDate?: string;
  resolvedAt?: string;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
};

export type GoalReference = {
  id: string;
  ownerId: string;
  goalId: string;
  type: GoalReferenceType;
  title: string;
  status: GoalReferenceStatus;
  summary?: string;
  url?: string;
  referenceId?: string;
  referenceDate?: string;
  sourceModule?: PlatformModule;
  createdAt: string;
  updatedAt: string;
};

export type GoalContribution = {
  id: string;
  ownerId: string;
  goalId: string;
  sourceModule: PlatformModule;
  type: GoalContributionType;
  status: GoalContributionStatus;
  title: string;
  summary: string;
  actionUrl?: string;
  occurredAt: string;
  createdAt: string;
  updatedAt: string;
};

export type GoalRecommendation = {
  id: string;
  ownerId: string;
  goalId: string;
  sourceModule?: PlatformModule;
  type: GoalRecommendationType;
  status: GoalRecommendationStatus;
  title: string;
  reason: string;
  actionLabel?: string;
  actionUrl?: string;
  reviewDueDate?: string;
  dismissedAt?: string;
  createdAt: string;
  updatedAt: string;
};

export type GoalLifecycleEvent = {
  id: string;
  ownerId: string;
  goalId: string;
  type: GoalLifecycleEventType;
  title: string;
  reason?: string;
  previousStatus?: GoalStatus;
  nextStatus?: GoalStatus;
  supersededByGoalId?: string;
  sourceModule?: PlatformModule;
  occurredAt: string;
  createdAt: string;
  updatedAt: string;
};

export type Goal = {
  id: string;
  ownerId: string;
  title: string;
  category: GoalCategory;
  status: GoalStatus;
  summary?: string;
  targetDate?: string;
  currentStep?: string;
  sourceModule?: PlatformModule;
  milestones: GoalMilestone[];
  supportItems: GoalSupportItem[];
  references: GoalReference[];
  contributions: GoalContribution[];
  recommendations: GoalRecommendation[];
  lifecycleEvents: GoalLifecycleEvent[];
  createdAt: string;
  updatedAt: string;
};

export type GoalDatabaseColumn = {
  name: string;
  type: string;
  required: boolean;
};

export type GoalOverviewSummary = {
  totalGoals: number;
  activeGoals: number;
  completedGoals: number;
  blockedGoals: number;
  archivedGoals: number;
  totalMilestones: number;
  completedMilestones: number;
  openBlockers: number;
  activeRecurringActions: number;
  unsatisfiedRequirements: number;
  linkedReferences: number;
  documentReferences: number;
  eventReferences: number;
  todayReferences: number;
  calendarReferences: number;
  moduleRecordReferences: number;
  crossModuleContributions: number;
  contributingModules: PlatformModule[];
  contributionRecommendations: number;
  activeRecommendations: number;
  dismissedRecommendations: number;
  reviewDueRecommendations: number;
  lifecycleEvents: number;
  completedLifecycleEvents: number;
  abandonedLifecycleEvents: number;
  revisedLifecycleEvents: number;
  archivedLifecycleEvents: number;
  supersededLifecycleEvents: number;
  overallProgressPercent: number | null;
  nextSteps: string[];
};

export type GoalLoadStatus = "ready" | "signed-out" | "unavailable";

export type GoalLoadResult = {
  goals: Goal[];
  status: GoalLoadStatus;
  message?: string;
};

export type BeastGoalDataClient = {
  auth: {
    getUser: () => Promise<{
      data: { user: { id: string } | null };
      error: { message?: string } | null;
    }>;
  };
  from: (table: string) => {
    select: (columns: string) => {
      eq: (column: string, value: string) => {
        order: (
          column: string,
          options: { ascending: boolean }
        ) => Promise<{
          data:
            | BeastGoalRow[]
            | BeastGoalMilestoneRow[]
            | BeastGoalSupportItemRow[]
            | BeastGoalReferenceRow[]
            | BeastGoalContributionRow[]
            | BeastGoalRecommendationRow[]
            | BeastGoalLifecycleEventRow[]
            | null;
          error: { message?: string } | null;
        }>;
      };
    };
  };
};

const activeGoalStatuses = new Set<GoalStatus>(["Proposed", "Active", "Blocked"]);

export const goalStatuses: GoalStatus[] = [
  "Proposed",
  "Active",
  "Paused",
  "Blocked",
  "Completed",
  "Archived",
];

export const goalCategories: GoalCategory[] = [
  "Education",
  "Career",
  "Money",
  "Personal",
  "Project",
  "Home",
  "Health",
  "Other",
];

export const goalMilestoneStatuses: GoalMilestoneStatus[] = [
  "Not Started",
  "In Progress",
  "Completed",
  "Skipped",
];

export const goalDatabaseTableName = "beast_goals";
export const goalMilestoneDatabaseTableName = "beast_goal_milestones";
export const goalSupportItemDatabaseTableName = "beast_goal_support_items";
export const goalReferenceDatabaseTableName = "beast_goal_references";
export const goalContributionDatabaseTableName = "beast_goal_contributions";
export const goalRecommendationDatabaseTableName = "beast_goal_recommendations";
export const goalLifecycleEventDatabaseTableName = "beast_goal_lifecycle_events";

export const goalDatabaseColumns: GoalDatabaseColumn[] = [
  { name: "id", type: "uuid", required: true },
  { name: "owner_id", type: "uuid", required: true },
  { name: "title", type: "text", required: true },
  { name: "category", type: "text", required: true },
  { name: "status", type: "text", required: true },
  { name: "summary", type: "text", required: false },
  { name: "target_date", type: "date", required: false },
  { name: "current_step", type: "text", required: false },
  { name: "source_module", type: "text", required: false },
  { name: "created_at", type: "timestamptz", required: true },
  { name: "updated_at", type: "timestamptz", required: true },
];

export const goalMilestoneDatabaseColumns: GoalDatabaseColumn[] = [
  { name: "id", type: "uuid", required: true },
  { name: "owner_id", type: "uuid", required: true },
  { name: "goal_id", type: "uuid", required: true },
  { name: "title", type: "text", required: true },
  { name: "status", type: "text", required: true },
  { name: "target_date", type: "date", required: false },
  { name: "completed_at", type: "timestamptz", required: false },
  { name: "sort_order", type: "integer", required: true },
  { name: "created_at", type: "timestamptz", required: true },
  { name: "updated_at", type: "timestamptz", required: true },
];

export const goalSupportItemTypes: GoalSupportItemType[] = [
  "Dependency",
  "Prerequisite",
  "Blocker",
  "Recurring Action",
];

export const goalSupportItemStatuses: GoalSupportItemStatus[] = [
  "Needed",
  "In Progress",
  "Satisfied",
  "Blocked",
  "Open",
  "Resolved",
  "Active",
  "Paused",
];

export const goalSupportItemCadences: GoalSupportItemCadence[] = [
  "Daily",
  "Weekly",
  "Biweekly",
  "Monthly",
  "Custom",
];

export const goalSupportItemDatabaseColumns: GoalDatabaseColumn[] = [
  { name: "id", type: "uuid", required: true },
  { name: "owner_id", type: "uuid", required: true },
  { name: "goal_id", type: "uuid", required: true },
  { name: "item_type", type: "text", required: true },
  { name: "title", type: "text", required: true },
  { name: "status", type: "text", required: true },
  { name: "summary", type: "text", required: false },
  { name: "cadence", type: "text", required: false },
  { name: "next_due_date", type: "date", required: false },
  { name: "resolved_at", type: "timestamptz", required: false },
  { name: "sort_order", type: "integer", required: true },
  { name: "created_at", type: "timestamptz", required: true },
  { name: "updated_at", type: "timestamptz", required: true },
];

export const goalReferenceTypes: GoalReferenceType[] = [
  "Note",
  "Document",
  "Event",
  "Module Record",
  "Today",
  "Calendar",
];

export const goalReferenceStatuses: GoalReferenceStatus[] = [
  "Active",
  "Archived",
];

export const goalReferenceDatabaseColumns: GoalDatabaseColumn[] = [
  { name: "id", type: "uuid", required: true },
  { name: "owner_id", type: "uuid", required: true },
  { name: "goal_id", type: "uuid", required: true },
  { name: "reference_type", type: "text", required: true },
  { name: "title", type: "text", required: true },
  { name: "status", type: "text", required: true },
  { name: "summary", type: "text", required: false },
  { name: "url", type: "text", required: false },
  { name: "reference_id", type: "text", required: false },
  { name: "reference_date", type: "date", required: false },
  { name: "source_module", type: "text", required: false },
  { name: "created_at", type: "timestamptz", required: true },
  { name: "updated_at", type: "timestamptz", required: true },
];

export const goalContributionTypes: GoalContributionType[] = [
  "Progress",
  "Recommendation",
  "Milestone",
  "Evidence",
  "Review",
];

export const goalContributionStatuses: GoalContributionStatus[] = [
  "Active",
  "Dismissed",
  "Archived",
];

export const goalContributionDatabaseColumns: GoalDatabaseColumn[] = [
  { name: "id", type: "uuid", required: true },
  { name: "owner_id", type: "uuid", required: true },
  { name: "goal_id", type: "uuid", required: true },
  { name: "source_module", type: "text", required: true },
  { name: "contribution_type", type: "text", required: true },
  { name: "status", type: "text", required: true },
  { name: "title", type: "text", required: true },
  { name: "summary", type: "text", required: true },
  { name: "action_url", type: "text", required: false },
  { name: "occurred_at", type: "timestamptz", required: true },
  { name: "created_at", type: "timestamptz", required: true },
  { name: "updated_at", type: "timestamptz", required: true },
];

export const goalRecommendationTypes: GoalRecommendationType[] = [
  "Next Action",
  "Review",
  "Milestone",
  "Risk",
  "Opportunity",
];

export const goalRecommendationStatuses: GoalRecommendationStatus[] = [
  "Suggested",
  "Accepted",
  "Dismissed",
  "Completed",
  "Archived",
];

export const goalRecommendationDatabaseColumns: GoalDatabaseColumn[] = [
  { name: "id", type: "uuid", required: true },
  { name: "owner_id", type: "uuid", required: true },
  { name: "goal_id", type: "uuid", required: true },
  { name: "source_module", type: "text", required: false },
  { name: "recommendation_type", type: "text", required: true },
  { name: "status", type: "text", required: true },
  { name: "title", type: "text", required: true },
  { name: "reason", type: "text", required: true },
  { name: "action_label", type: "text", required: false },
  { name: "action_url", type: "text", required: false },
  { name: "review_due_date", type: "date", required: false },
  { name: "dismissed_at", type: "timestamptz", required: false },
  { name: "created_at", type: "timestamptz", required: true },
  { name: "updated_at", type: "timestamptz", required: true },
];

export const goalLifecycleEventTypes: GoalLifecycleEventType[] = [
  "Completed",
  "Abandoned",
  "Revised",
  "Archived",
  "Superseded",
];

export const goalLifecycleEventDatabaseColumns: GoalDatabaseColumn[] = [
  { name: "id", type: "uuid", required: true },
  { name: "owner_id", type: "uuid", required: true },
  { name: "goal_id", type: "uuid", required: true },
  { name: "event_type", type: "text", required: true },
  { name: "title", type: "text", required: true },
  { name: "reason", type: "text", required: false },
  { name: "previous_status", type: "text", required: false },
  { name: "next_status", type: "text", required: false },
  { name: "superseded_by_goal_id", type: "uuid", required: false },
  { name: "source_module", type: "text", required: false },
  { name: "occurred_at", type: "timestamptz", required: true },
  { name: "created_at", type: "timestamptz", required: true },
  { name: "updated_at", type: "timestamptz", required: true },
];

export const goalOwnershipRules = [
  "Goals belong to BeastOS as shared Personal Hub data.",
  "Goals are outcomes, not module-owned task lists.",
  "Modules may suggest goals and contribute progress without owning shared goals.",
  "Dependencies, prerequisites, blockers, and recurring actions attach to BeastOS-owned goals and plans.",
  "Notes, documents, events, module records, Today items, and Calendar items link as references without duplicating goal ownership.",
  "Modules may contribute evidence, progress, milestones, recommendations, and reviews without owning shared goals.",
  "Recommendations must include a plain-language reason and can be dismissed without deleting history.",
  "Goal and Plan lifecycle events preserve completion, abandonment, revision, archive, and superseded history.",
  "BeastGoals remains superseded as a standalone customer-facing module.",
];

export const mockGoals: Goal[] = [
  {
    id: "goal-security-plus",
    ownerId: "member-owner",
    title: "Earn Security+",
    category: "Education",
    status: "Active",
    summary: "Prepare for the Security+ certification.",
    targetDate: "2026-10-01",
    currentStep: "Continue the next Mentor mission.",
    sourceModule: "learning",
    supportItems: [],
    references: [],
    contributions: [],
    recommendations: [],
    lifecycleEvents: [],
    milestones: [
      {
        id: "milestone-security-basics",
        ownerId: "member-owner",
        goalId: "goal-security-plus",
        title: "Finish networking foundations",
        status: "Completed",
        sortOrder: 1,
        createdAt: "2026-07-14T00:00:00.000Z",
        updatedAt: "2026-07-14T00:00:00.000Z",
      },
      {
        id: "milestone-security-practice",
        ownerId: "member-owner",
        goalId: "goal-security-plus",
        title: "Complete first practice checkpoint",
        status: "In Progress",
        targetDate: "2026-08-01",
        sortOrder: 2,
        createdAt: "2026-07-14T00:00:00.000Z",
        updatedAt: "2026-07-14T00:00:00.000Z",
      },
    ],
    createdAt: "2026-07-14T00:00:00.000Z",
    updatedAt: "2026-07-14T00:00:00.000Z",
  },
  {
    id: "goal-debt-free",
    ownerId: "member-owner",
    title: "Become debt free",
    category: "Money",
    status: "Proposed",
    summary: "Use BeastMoney planning to reduce debt safely.",
    currentStep: "Review the next safe extra payment.",
    sourceModule: "money",
    milestones: [],
    supportItems: [],
    references: [],
    contributions: [],
    recommendations: [],
    lifecycleEvents: [],
    createdAt: "2026-07-14T00:00:00.000Z",
    updatedAt: "2026-07-14T00:00:00.000Z",
  },
];

export const exampleGoals = mockGoals;

function toPlatformModule(module: string | null | undefined) {
  return module ? (module as PlatformModule) : undefined;
}

export function mapGoalRow(row: BeastGoalRow): Goal {
  return buildGoal({
    id: row.id,
    ownerId: row.owner_id,
    title: row.title,
    category: row.category,
    status: row.status,
    summary: row.summary ?? undefined,
    targetDate: row.target_date ?? undefined,
    currentStep: row.current_step ?? undefined,
    sourceModule: toPlatformModule(row.source_module),
    milestones: [],
    supportItems: [],
    references: [],
    contributions: [],
    recommendations: [],
    lifecycleEvents: [],
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  });
}

export function isGoalMilestoneStatus(
  status: unknown
): status is GoalMilestoneStatus {
  return goalMilestoneStatuses.includes(status as GoalMilestoneStatus);
}

export function mapGoalMilestoneRow(
  row: BeastGoalMilestoneRow
): GoalMilestone {
  if (!isGoalMilestoneStatus(row.status)) {
    throw new Error(`Unsupported goal milestone status: ${row.status}`);
  }

  return {
    id: row.id,
    ownerId: row.owner_id,
    goalId: row.goal_id,
    title: row.title,
    status: row.status,
    targetDate: row.target_date ?? undefined,
    completedAt: row.completed_at ?? undefined,
    sortOrder: row.sort_order,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function isGoalSupportItemType(
  type: unknown
): type is GoalSupportItemType {
  return goalSupportItemTypes.includes(type as GoalSupportItemType);
}

export function isGoalSupportItemStatus(
  status: unknown
): status is GoalSupportItemStatus {
  return goalSupportItemStatuses.includes(status as GoalSupportItemStatus);
}

export function isGoalSupportItemCadence(
  cadence: unknown
): cadence is GoalSupportItemCadence {
  return goalSupportItemCadences.includes(cadence as GoalSupportItemCadence);
}

export function mapGoalSupportItemRow(
  row: BeastGoalSupportItemRow
): GoalSupportItem {
  if (!isGoalSupportItemType(row.item_type)) {
    throw new Error(`Unsupported goal support item type: ${row.item_type}`);
  }

  if (!isGoalSupportItemStatus(row.status)) {
    throw new Error(`Unsupported goal support item status: ${row.status}`);
  }

  if (row.cadence && !isGoalSupportItemCadence(row.cadence)) {
    throw new Error(`Unsupported goal support item cadence: ${row.cadence}`);
  }

  return {
    id: row.id,
    ownerId: row.owner_id,
    goalId: row.goal_id,
    type: row.item_type,
    title: row.title,
    status: row.status,
    summary: row.summary ?? undefined,
    cadence: row.cadence ?? undefined,
    nextDueDate: row.next_due_date ?? undefined,
    resolvedAt: row.resolved_at ?? undefined,
    sortOrder: row.sort_order,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function isGoalReferenceType(
  type: unknown
): type is GoalReferenceType {
  return goalReferenceTypes.includes(type as GoalReferenceType);
}

export function isGoalReferenceStatus(
  status: unknown
): status is GoalReferenceStatus {
  return goalReferenceStatuses.includes(status as GoalReferenceStatus);
}

export function mapGoalReferenceRow(row: BeastGoalReferenceRow): GoalReference {
  if (!isGoalReferenceType(row.reference_type)) {
    throw new Error(`Unsupported goal reference type: ${row.reference_type}`);
  }

  if (!isGoalReferenceStatus(row.status)) {
    throw new Error(`Unsupported goal reference status: ${row.status}`);
  }

  return {
    id: row.id,
    ownerId: row.owner_id,
    goalId: row.goal_id,
    type: row.reference_type,
    title: row.title,
    status: row.status,
    summary: row.summary ?? undefined,
    url: row.url ?? undefined,
    referenceId: row.reference_id ?? undefined,
    referenceDate: row.reference_date ?? undefined,
    sourceModule: toPlatformModule(row.source_module),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function isGoalContributionType(
  type: unknown
): type is GoalContributionType {
  return goalContributionTypes.includes(type as GoalContributionType);
}

export function isGoalContributionStatus(
  status: unknown
): status is GoalContributionStatus {
  return goalContributionStatuses.includes(status as GoalContributionStatus);
}

export function mapGoalContributionRow(
  row: BeastGoalContributionRow
): GoalContribution {
  if (!isGoalContributionType(row.contribution_type)) {
    throw new Error(
      `Unsupported goal contribution type: ${row.contribution_type}`
    );
  }

  if (!isGoalContributionStatus(row.status)) {
    throw new Error(`Unsupported goal contribution status: ${row.status}`);
  }

  return {
    id: row.id,
    ownerId: row.owner_id,
    goalId: row.goal_id,
    sourceModule: toPlatformModule(row.source_module) || "beastos",
    type: row.contribution_type,
    status: row.status,
    title: row.title,
    summary: row.summary,
    actionUrl: row.action_url ?? undefined,
    occurredAt: row.occurred_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function isGoalRecommendationType(
  type: unknown
): type is GoalRecommendationType {
  return goalRecommendationTypes.includes(type as GoalRecommendationType);
}

export function isGoalRecommendationStatus(
  status: unknown
): status is GoalRecommendationStatus {
  return goalRecommendationStatuses.includes(status as GoalRecommendationStatus);
}

export function mapGoalRecommendationRow(
  row: BeastGoalRecommendationRow
): GoalRecommendation {
  if (!isGoalRecommendationType(row.recommendation_type)) {
    throw new Error(
      `Unsupported goal recommendation type: ${row.recommendation_type}`
    );
  }

  if (!isGoalRecommendationStatus(row.status)) {
    throw new Error(`Unsupported goal recommendation status: ${row.status}`);
  }

  return {
    id: row.id,
    ownerId: row.owner_id,
    goalId: row.goal_id,
    sourceModule: toPlatformModule(row.source_module),
    type: row.recommendation_type,
    status: row.status,
    title: row.title,
    reason: row.reason,
    actionLabel: row.action_label ?? undefined,
    actionUrl: row.action_url ?? undefined,
    reviewDueDate: row.review_due_date ?? undefined,
    dismissedAt: row.dismissed_at ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function isGoalLifecycleEventType(
  type: unknown
): type is GoalLifecycleEventType {
  return goalLifecycleEventTypes.includes(type as GoalLifecycleEventType);
}

export function mapGoalLifecycleEventRow(
  row: BeastGoalLifecycleEventRow
): GoalLifecycleEvent {
  if (!isGoalLifecycleEventType(row.event_type)) {
    throw new Error(`Unsupported goal lifecycle event type: ${row.event_type}`);
  }

  if (row.previous_status && !isGoalStatus(row.previous_status)) {
    throw new Error(
      `Unsupported previous goal status: ${row.previous_status}`
    );
  }

  if (row.next_status && !isGoalStatus(row.next_status)) {
    throw new Error(`Unsupported next goal status: ${row.next_status}`);
  }

  return {
    id: row.id,
    ownerId: row.owner_id,
    goalId: row.goal_id,
    type: row.event_type,
    title: row.title,
    reason: row.reason ?? undefined,
    previousStatus: row.previous_status ?? undefined,
    nextStatus: row.next_status ?? undefined,
    supersededByGoalId: row.superseded_by_goal_id ?? undefined,
    sourceModule: toPlatformModule(row.source_module),
    occurredAt: row.occurred_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function loadUserGoals(
  client: BeastGoalDataClient
): Promise<GoalLoadResult> {
  try {
    const { data: userData, error: userError } = await client.auth.getUser();

    if (userError) {
      return {
        goals: [],
        status: "unavailable",
        message: "Goals could not be loaded right now.",
      };
    }

    if (!userData.user) {
      return {
        goals: [],
        status: "signed-out",
        message: "Sign in to view your goals.",
      };
    }

    const { data, error } = await client
      .from(goalDatabaseTableName)
      .select(
        "id, owner_id, title, category, status, summary, target_date, current_step, source_module, created_at, updated_at"
      )
      .eq("owner_id", userData.user.id)
      .order("created_at", { ascending: false });

    if (error) {
      return {
        goals: [],
        status: "unavailable",
        message:
          "Goals are not available yet. The database may still need its foundation migration.",
      };
    }

    const milestoneResult = await client
      .from(goalMilestoneDatabaseTableName)
      .select(
        "id, owner_id, goal_id, title, status, target_date, completed_at, sort_order, created_at, updated_at"
      )
      .eq("owner_id", userData.user.id)
      .order("sort_order", { ascending: true });

    const milestones = milestoneResult.error
      ? []
      : ((milestoneResult.data ?? []) as BeastGoalMilestoneRow[]).map(
          mapGoalMilestoneRow
        );
    const supportResult = await client
      .from(goalSupportItemDatabaseTableName)
      .select(
        "id, owner_id, goal_id, item_type, title, status, summary, cadence, next_due_date, resolved_at, sort_order, created_at, updated_at"
      )
      .eq("owner_id", userData.user.id)
      .order("sort_order", { ascending: true });

    const supportItems = supportResult.error
      ? []
      : ((supportResult.data ?? []) as BeastGoalSupportItemRow[]).map(
          mapGoalSupportItemRow
        );
    const referenceResult = await client
      .from(goalReferenceDatabaseTableName)
      .select(
        "id, owner_id, goal_id, reference_type, title, status, summary, url, reference_id, reference_date, source_module, created_at, updated_at"
      )
      .eq("owner_id", userData.user.id)
      .order("created_at", { ascending: false });

    const references = referenceResult.error
      ? []
      : ((referenceResult.data ?? []) as BeastGoalReferenceRow[]).map(
          mapGoalReferenceRow
        );
    const contributionResult = await client
      .from(goalContributionDatabaseTableName)
      .select(
        "id, owner_id, goal_id, source_module, contribution_type, status, title, summary, action_url, occurred_at, created_at, updated_at"
      )
      .eq("owner_id", userData.user.id)
      .order("occurred_at", { ascending: false });

    const contributions = contributionResult.error
      ? []
      : ((contributionResult.data ?? []) as BeastGoalContributionRow[]).map(
          mapGoalContributionRow
        );
    const recommendationResult = await client
      .from(goalRecommendationDatabaseTableName)
      .select(
        "id, owner_id, goal_id, source_module, recommendation_type, status, title, reason, action_label, action_url, review_due_date, dismissed_at, created_at, updated_at"
      )
      .eq("owner_id", userData.user.id)
      .order("created_at", { ascending: false });

    const recommendations = recommendationResult.error
      ? []
      : ((recommendationResult.data ?? []) as BeastGoalRecommendationRow[]).map(
          mapGoalRecommendationRow
        );
    const lifecycleResult = await client
      .from(goalLifecycleEventDatabaseTableName)
      .select(
        "id, owner_id, goal_id, event_type, title, reason, previous_status, next_status, superseded_by_goal_id, source_module, occurred_at, created_at, updated_at"
      )
      .eq("owner_id", userData.user.id)
      .order("occurred_at", { ascending: false });

    const lifecycleEvents = lifecycleResult.error
      ? []
      : ((lifecycleResult.data ?? []) as BeastGoalLifecycleEventRow[]).map(
          mapGoalLifecycleEventRow
        );
    const milestonesByGoal = new Map<string, GoalMilestone[]>();
    const supportItemsByGoal = new Map<string, GoalSupportItem[]>();
    const referencesByGoal = new Map<string, GoalReference[]>();
    const contributionsByGoal = new Map<string, GoalContribution[]>();
    const recommendationsByGoal = new Map<string, GoalRecommendation[]>();
    const lifecycleEventsByGoal = new Map<string, GoalLifecycleEvent[]>();

    milestones.forEach((milestone) => {
      milestonesByGoal.set(milestone.goalId, [
        ...(milestonesByGoal.get(milestone.goalId) || []),
        milestone,
      ]);
    });
    supportItems.forEach((supportItem) => {
      supportItemsByGoal.set(supportItem.goalId, [
        ...(supportItemsByGoal.get(supportItem.goalId) || []),
        supportItem,
      ]);
    });
    references.forEach((reference) => {
      referencesByGoal.set(reference.goalId, [
        ...(referencesByGoal.get(reference.goalId) || []),
        reference,
      ]);
    });
    contributions.forEach((contribution) => {
      contributionsByGoal.set(contribution.goalId, [
        ...(contributionsByGoal.get(contribution.goalId) || []),
        contribution,
      ]);
    });
    recommendations.forEach((recommendation) => {
      recommendationsByGoal.set(recommendation.goalId, [
        ...(recommendationsByGoal.get(recommendation.goalId) || []),
        recommendation,
      ]);
    });
    lifecycleEvents.forEach((event) => {
      lifecycleEventsByGoal.set(event.goalId, [
        ...(lifecycleEventsByGoal.get(event.goalId) || []),
        event,
      ]);
    });

    return {
      goals: ((data ?? []) as BeastGoalRow[]).map((row) => {
        const goal = mapGoalRow(row);

        return {
          ...goal,
          milestones: milestonesByGoal.get(goal.id) || [],
          supportItems: supportItemsByGoal.get(goal.id) || [],
          references: [...(referencesByGoal.get(goal.id) || [])].sort(
            (left, right) => right.createdAt.localeCompare(left.createdAt)
          ),
          contributions: [...(contributionsByGoal.get(goal.id) || [])].sort(
            (left, right) => right.occurredAt.localeCompare(left.occurredAt)
          ),
          recommendations: [
            ...(recommendationsByGoal.get(goal.id) || []),
          ].sort((left, right) => right.createdAt.localeCompare(left.createdAt)),
          lifecycleEvents: [
            ...(lifecycleEventsByGoal.get(goal.id) || []),
          ].sort((left, right) => right.occurredAt.localeCompare(left.occurredAt)),
        };
      }),
      status: "ready",
    };
  } catch {
    return {
      goals: [],
      status: "unavailable",
      message: "Goals could not be loaded right now.",
    };
  }
}

export function isGoalStatus(status: unknown): status is GoalStatus {
  return goalStatuses.includes(status as GoalStatus);
}

export function isGoalCategory(category: unknown): category is GoalCategory {
  return goalCategories.includes(category as GoalCategory);
}

export function buildGoal(goal: Goal): Goal {
  if (!goal.title.trim()) {
    throw new Error("Goal title is required.");
  }

  if (!isGoalStatus(goal.status)) {
    throw new Error(`Unsupported goal status: ${goal.status}`);
  }

  if (!isGoalCategory(goal.category)) {
    throw new Error(`Unsupported goal category: ${goal.category}`);
  }

  goal.milestones.forEach((milestone) => {
    if (!milestone.title.trim()) {
      throw new Error("Goal milestone title is required.");
    }

    if (!isGoalMilestoneStatus(milestone.status)) {
      throw new Error(`Unsupported goal milestone status: ${milestone.status}`);
    }
  });

  goal.supportItems.forEach((supportItem) => {
    if (!supportItem.title.trim()) {
      throw new Error("Goal support item title is required.");
    }

    if (!isGoalSupportItemType(supportItem.type)) {
      throw new Error(`Unsupported goal support item type: ${supportItem.type}`);
    }

    if (!isGoalSupportItemStatus(supportItem.status)) {
      throw new Error(
        `Unsupported goal support item status: ${supportItem.status}`
      );
    }
  });

  goal.references.forEach((reference) => {
    if (!reference.title.trim()) {
      throw new Error("Goal reference title is required.");
    }

    if (!isGoalReferenceType(reference.type)) {
      throw new Error(`Unsupported goal reference type: ${reference.type}`);
    }

    if (!isGoalReferenceStatus(reference.status)) {
      throw new Error(
        `Unsupported goal reference status: ${reference.status}`
      );
    }
  });

  goal.contributions.forEach((contribution) => {
    if (!contribution.title.trim()) {
      throw new Error("Goal contribution title is required.");
    }

    if (!contribution.summary.trim()) {
      throw new Error("Goal contribution summary is required.");
    }

    if (!isGoalContributionType(contribution.type)) {
      throw new Error(
        `Unsupported goal contribution type: ${contribution.type}`
      );
    }

    if (!isGoalContributionStatus(contribution.status)) {
      throw new Error(
        `Unsupported goal contribution status: ${contribution.status}`
      );
    }
  });

  goal.recommendations.forEach((recommendation) => {
    if (!recommendation.title.trim()) {
      throw new Error("Goal recommendation title is required.");
    }

    if (!recommendation.reason.trim()) {
      throw new Error("Goal recommendation reason is required.");
    }

    if (!isGoalRecommendationType(recommendation.type)) {
      throw new Error(
        `Unsupported goal recommendation type: ${recommendation.type}`
      );
    }

    if (!isGoalRecommendationStatus(recommendation.status)) {
      throw new Error(
        `Unsupported goal recommendation status: ${recommendation.status}`
      );
    }
  });

  goal.lifecycleEvents.forEach((event) => {
    if (!event.title.trim()) {
      throw new Error("Goal lifecycle event title is required.");
    }

    if (!isGoalLifecycleEventType(event.type)) {
      throw new Error(`Unsupported goal lifecycle event type: ${event.type}`);
    }

    if (event.previousStatus && !isGoalStatus(event.previousStatus)) {
      throw new Error(
        `Unsupported previous goal status: ${event.previousStatus}`
      );
    }

    if (event.nextStatus && !isGoalStatus(event.nextStatus)) {
      throw new Error(`Unsupported next goal status: ${event.nextStatus}`);
    }
  });

  return {
    ...goal,
    milestones: [...goal.milestones].sort(
      (left, right) => left.sortOrder - right.sortOrder
    ),
    supportItems: [...goal.supportItems].sort(
      (left, right) => left.sortOrder - right.sortOrder
    ),
    references: [...goal.references].sort((left, right) =>
      right.createdAt.localeCompare(left.createdAt)
    ),
    contributions: [...goal.contributions].sort((left, right) =>
      right.occurredAt.localeCompare(left.occurredAt)
    ),
    recommendations: [...goal.recommendations].sort((left, right) =>
      right.createdAt.localeCompare(left.createdAt)
    ),
    lifecycleEvents: [...goal.lifecycleEvents].sort((left, right) =>
      right.occurredAt.localeCompare(left.occurredAt)
    ),
  };
}

export function buildGoalCollection(goals: Goal[]) {
  return goals.map(buildGoal);
}

export function getGoalProgressPercent(goal: Goal) {
  const measurable = goal.milestones.filter(
    (milestone) => milestone.status !== "Skipped"
  );

  if (measurable.length === 0) return null;

  const completed = measurable.filter(
    (milestone) => milestone.status === "Completed"
  ).length;

  return Math.round((completed / measurable.length) * 100);
}

export function getCurrentGoalMilestone(goal: Goal) {
  return (
    goal.milestones.find((milestone) => milestone.status === "In Progress") ||
    goal.milestones.find((milestone) => milestone.status === "Not Started") ||
    null
  );
}

export function summarizeGoals(goals: Goal[]): GoalOverviewSummary {
  const normalized = buildGoalCollection(goals);
  const milestones = normalized.flatMap((goal) => goal.milestones);
  const measurableMilestones = milestones.filter(
    (milestone) => milestone.status !== "Skipped"
  );
  const completedMilestones = measurableMilestones.filter(
    (milestone) => milestone.status === "Completed"
  ).length;
  const supportItems = normalized.flatMap((goal) => goal.supportItems);
  const references = normalized
    .flatMap((goal) => goal.references)
    .filter((reference) => reference.status === "Active");
  const contributions = normalized
    .flatMap((goal) => goal.contributions)
    .filter((contribution) => contribution.status === "Active");
  const contributingModules = Array.from(
    new Set(contributions.map((contribution) => contribution.sourceModule))
  ).sort();
  const recommendations = normalized.flatMap((goal) => goal.recommendations);
  const lifecycleEvents = normalized.flatMap((goal) => goal.lifecycleEvents);
  const activeRecommendations = recommendations.filter(
    (recommendation) =>
      recommendation.status === "Suggested" ||
      recommendation.status === "Accepted"
  );
  const openBlockers = supportItems.filter(
    (item) => item.type === "Blocker" && item.status !== "Resolved"
  ).length;
  const activeRecurringActions = supportItems.filter(
    (item) => item.type === "Recurring Action" && item.status === "Active"
  ).length;
  const unsatisfiedRequirements = supportItems.filter(
    (item) =>
      (item.type === "Dependency" || item.type === "Prerequisite") &&
      item.status !== "Satisfied"
  ).length;

  return {
    totalGoals: normalized.length,
    activeGoals: normalized.filter((goal) => activeGoalStatuses.has(goal.status))
      .length,
    completedGoals: normalized.filter((goal) => goal.status === "Completed")
      .length,
    blockedGoals: normalized.filter((goal) => goal.status === "Blocked").length,
    archivedGoals: normalized.filter((goal) => goal.status === "Archived").length,
    totalMilestones: measurableMilestones.length,
    completedMilestones,
    openBlockers,
    activeRecurringActions,
    unsatisfiedRequirements,
    linkedReferences: references.length,
    documentReferences: references.filter(
      (reference) => reference.type === "Document"
    ).length,
    eventReferences: references.filter((reference) => reference.type === "Event")
      .length,
    todayReferences: references.filter((reference) => reference.type === "Today")
      .length,
    calendarReferences: references.filter(
      (reference) => reference.type === "Calendar"
    ).length,
    moduleRecordReferences: references.filter(
      (reference) => reference.type === "Module Record"
    ).length,
    crossModuleContributions: contributions.length,
    contributingModules,
    contributionRecommendations: contributions.filter(
      (contribution) => contribution.type === "Recommendation"
    ).length,
    activeRecommendations: activeRecommendations.length,
    dismissedRecommendations: recommendations.filter(
      (recommendation) => recommendation.status === "Dismissed"
    ).length,
    reviewDueRecommendations: activeRecommendations.filter(
      (recommendation) => recommendation.reviewDueDate
    ).length,
    lifecycleEvents: lifecycleEvents.length,
    completedLifecycleEvents: lifecycleEvents.filter(
      (event) => event.type === "Completed"
    ).length,
    abandonedLifecycleEvents: lifecycleEvents.filter(
      (event) => event.type === "Abandoned"
    ).length,
    revisedLifecycleEvents: lifecycleEvents.filter(
      (event) => event.type === "Revised"
    ).length,
    archivedLifecycleEvents: lifecycleEvents.filter(
      (event) => event.type === "Archived"
    ).length,
    supersededLifecycleEvents: lifecycleEvents.filter(
      (event) => event.type === "Superseded"
    ).length,
    overallProgressPercent:
      measurableMilestones.length > 0
        ? Math.round((completedMilestones / measurableMilestones.length) * 100)
        : null,
    nextSteps: normalized
      .filter((goal) => activeGoalStatuses.has(goal.status) && goal.currentStep)
      .map((goal) => goal.currentStep as string),
  };
}

export function getGoalSupportItemsByType(
  goal: Goal,
  type: GoalSupportItemType
) {
  return goal.supportItems.filter((item) => item.type === type);
}

export function getGoalReferencesByType(goal: Goal, type: GoalReferenceType) {
  return goal.references.filter(
    (reference) => reference.type === type && reference.status === "Active"
  );
}

export function getGoalContributionsByModule(
  goal: Goal,
  module: PlatformModule
) {
  return goal.contributions.filter(
    (contribution) =>
      contribution.sourceModule === module && contribution.status === "Active"
  );
}

export function getActiveGoalRecommendations(goal: Goal) {
  return goal.recommendations.filter(
    (recommendation) =>
      recommendation.status === "Suggested" ||
      recommendation.status === "Accepted"
  );
}

export function getGoalLifecycleEvents(goal: Goal) {
  return [...goal.lifecycleEvents].sort((left, right) =>
    right.occurredAt.localeCompare(left.occurredAt)
  );
}
