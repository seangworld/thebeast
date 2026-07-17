import { getModuleRegistryEntry, type BeastModuleIdentifier } from "./moduleRegistry";
import type { AdminViewMode } from "./entitlements";

export type BeastAdminMemberStatus = "Active" | "Invited" | "Paused";
export type BeastAdminMemberRole = "Owner" | "Admin" | "Member" | "Beta";
export type BeastAdminFeedbackStatus = "New" | "Reviewing" | "Resolved";

export type BeastAdminMember = {
  id: string;
  name: string;
  email: string;
  joinDate: string;
  status: BeastAdminMemberStatus;
  role: BeastAdminMemberRole;
};

export type BeastAdminBetaAssignment = {
  id: string;
  memberId: string;
  moduleId: BeastModuleIdentifier;
  assignedAt: string;
};

export type BeastAdminFeedbackItem = {
  id: string;
  date: string;
  module: string;
  user: string;
  status: BeastAdminFeedbackStatus;
  summary: string;
};

export function isBeastAdminOwnerRole(role: unknown) {
  return role === "admin";
}

export function canAccessBeastAdmin({
  role,
  adminViewMode = "admin",
}: {
  role: unknown;
  adminViewMode?: AdminViewMode;
}) {
  return isBeastAdminOwnerRole(role) && adminViewMode === "admin";
}

export const beastAdminMembers: BeastAdminMember[] = [
  {
    id: "member-owner",
    name: "Sean G.",
    email: "owner@beastos.local",
    joinDate: "2026-07-01",
    status: "Active",
    role: "Owner",
  },
  {
    id: "member-beta",
    name: "Beta Member",
    email: "beta@beastos.local",
    joinDate: "2026-07-10",
    status: "Invited",
    role: "Beta",
  },
];

export const beastAdminBetaAssignableModules: BeastModuleIdentifier[] = [
  "learning",
  "health",
  "home",
  "goals",
  "documents",
];

export const beastAdminBetaAssignments: BeastAdminBetaAssignment[] = [
  {
    id: "assignment-learning-beta",
    memberId: "member-beta",
    moduleId: "learning",
    assignedAt: "2026-07-13T00:00:00.000Z",
  },
];

export const beastAdminFeedbackItems: BeastAdminFeedbackItem[] = [
  {
    id: "feedback-learning-home",
    date: "2026-07-13",
    module: "BeastLearning",
    user: "Beta Member",
    status: "New",
    summary: "Mentor Home made the next learning action clear.",
  },
  {
    id: "feedback-money-nav",
    date: "2026-07-12",
    module: "BeastMoney",
    user: "Sean G.",
    status: "Reviewing",
    summary: "Implemented financial workflows should not appear under Future.",
  },
];

export function assignBetaModule(
  assignments: BeastAdminBetaAssignment[],
  assignment: BeastAdminBetaAssignment
) {
  const exists = assignments.some(
    (item) =>
      item.memberId === assignment.memberId && item.moduleId === assignment.moduleId
  );

  return exists ? assignments : [...assignments, assignment];
}

export function getBetaAssignableModuleLabels(
  moduleIds: BeastModuleIdentifier[] = beastAdminBetaAssignableModules
) {
  return moduleIds.map(
    (moduleId) => getModuleRegistryEntry(moduleId)?.name || moduleId
  );
}

export function buildBetaAssignmentRows({
  members = beastAdminMembers,
  assignments = beastAdminBetaAssignments,
}: {
  members?: BeastAdminMember[];
  assignments?: BeastAdminBetaAssignment[];
} = {}) {
  return assignments.map((assignment) => {
    const member = members.find((item) => item.id === assignment.memberId);
    const registryModule = getModuleRegistryEntry(assignment.moduleId);

    return {
      ...assignment,
      memberName: member?.name || "Unknown member",
      memberRole: member?.role || "Member",
      moduleName: registryModule?.name || assignment.moduleId,
    };
  });
}

export function buildBeastAdminAnalytics({
  members,
  moduleCount,
  feedbackCount,
  betaAssignments,
}: {
  members: BeastAdminMember[];
  moduleCount: number;
  feedbackCount: number;
  betaAssignments: BeastAdminBetaAssignment[];
}) {
  return {
    totalMembers: members.length,
    activeMembers: members.filter((member) => member.status === "Active").length,
    moduleCount,
    feedbackCount,
    betaUsers: new Set(betaAssignments.map((assignment) => assignment.memberId)).size,
  };
}
