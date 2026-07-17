import {
  formatDocumentFileSize,
  getDocumentUploadAcceptValue,
  type DocumentOverviewSummary,
} from "./platform/documents";
import {
  getActiveGoalRecommendations,
  getCurrentGoalMilestone,
  getGoalProgressPercent,
  type Goal,
  type GoalOverviewSummary,
} from "./platform/goals";
import {
  getCurrentHousehold,
  getHouseholdMembers,
} from "./platform/familyService";
import {
  buildHouseholdInvitationRequest,
  mockHouseholdModel,
  summarizeHouseholdModel,
  type HouseholdModel,
} from "./platform/household";
import type { PlatformModule } from "./platform/types";

export type MobilePersonalHubActionCard = {
  id: string;
  source: PlatformModule;
  title: string;
  summary: string;
  href: string;
  actionLabel: string;
  metadata: string[];
  dispatchMode:
    | "document-upload-contract"
    | "goal-source-route"
    | "household-contract-event"
    | "household-visibility-contract";
  sourceOwnershipPreserved: true;
};

export function buildMobileQuickUploadCards({
  summary,
}: {
  summary: DocumentOverviewSummary;
}): MobilePersonalHubActionCard[] {
  return [
    {
      id: "mobile-quick-upload",
      source: "documents",
      title: "Quick upload",
      summary:
        "Add a document through the BeastOS Upload Center so modules can reference it without owning a separate copy.",
      href: "/dashboard/uploads#mobile-quick-upload",
      actionLabel: "Choose file",
      metadata: [
        `${summary.activeDocuments} active`,
        formatDocumentFileSize(summary.storageBytes),
        getDocumentUploadAcceptValue().split(",").length + " supported types",
      ],
      dispatchMode: "document-upload-contract",
      sourceOwnershipPreserved: true,
    },
  ];
}

export function buildMobileGoalActionCards({
  goals,
  summary,
  limit = 3,
}: {
  goals: Goal[];
  summary: GoalOverviewSummary;
  limit?: number;
}): MobilePersonalHubActionCard[] {
  const goalCards = goals.slice(0, limit).map((goal) => {
    const recommendation = getActiveGoalRecommendations(goal)[0];
    const milestone = getCurrentGoalMilestone(goal);
    const progress = getGoalProgressPercent(goal);

    return {
      id: `mobile-goal-${goal.id}`,
      source: "goals" as PlatformModule,
      title: goal.title,
      summary:
        recommendation?.reason ||
        goal.currentStep ||
        milestone?.title ||
        goal.summary ||
        "Open the BeastOS goal record for the next owner-scoped step.",
      href: recommendation?.actionUrl || "/dashboard/goals",
      actionLabel: recommendation?.actionLabel || "Open goal",
      metadata: [
        goal.status,
        goal.category,
        progress == null ? "No milestones" : `${progress}%`,
      ],
      dispatchMode: "goal-source-route" as const,
      sourceOwnershipPreserved: true as const,
    };
  });

  if (goalCards.length > 0) return goalCards;

  return [
    {
      id: "mobile-goals-empty",
      source: "goals",
      title: "Goals",
      summary:
        summary.nextSteps[0] ||
        "No shared goal action is waiting. Goals will appear after real BeastOS goal records exist.",
      href: "/dashboard/goals",
      actionLabel: "Open goals",
      metadata: [
        `${summary.totalGoals} total`,
        `${summary.activeGoals} active`,
        `${summary.openBlockers} blockers`,
      ],
      dispatchMode: "goal-source-route",
      sourceOwnershipPreserved: true,
    },
  ];
}

export function buildMobileHouseholdAlertCards({
  model = mockHouseholdModel,
}: {
  model?: HouseholdModel;
} = {}): MobilePersonalHubActionCard[] {
  const summary = summarizeHouseholdModel(model);
  const household = getCurrentHousehold(model);
  const members = household ? getHouseholdMembers(household.id, model) : [];
  const owner = members.find((member) => member.isOwner) || members[0];
  const alertCount =
    summary.pendingInvitationCount +
    summary.sharedLinkCount +
    summary.householdsWithoutOwner.length +
    summary.orphanMembers.length +
    summary.orphanSharedLinks.length;

  const invitePreview =
    household && owner
      ? buildHouseholdInvitationRequest({
          householdId: household.id,
          invitedByMemberId: owner.id,
          email: "member@example.com",
          role: "Member",
          model,
        })
      : null;

  return [
    {
      id: "mobile-household-alerts",
      source: "beastos",
      title: "Household alerts",
      summary:
        alertCount > 0
          ? "Review pending household invitations, shared links, and ownership cleanup signals."
          : "Household context is ready. Alerts will appear here when invitations or shared visibility need attention.",
      href: "/dashboard/profile#household",
      actionLabel: "Review household",
      metadata: [
        `${summary.memberCount} members`,
        `${summary.pendingInvitationCount} invites`,
        `${summary.sharedLinkCount} shared links`,
      ],
      dispatchMode: invitePreview?.dispatchMode || "household-contract-event",
      sourceOwnershipPreserved: true,
    },
  ];
}
