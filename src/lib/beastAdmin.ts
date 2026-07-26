import { getModuleRegistryEntry, type BeastModuleIdentifier } from "./moduleRegistry";
import type { AdminViewMode } from "./entitlements";

export type BeastAdminMemberStatus = "Active" | "Invited" | "Paused";
export type BeastAdminMemberRole = "Owner" | "Admin" | "Member" | "Beta";
export type BeastAdminFeedbackStatus =
  | "New"
  | "Acknowledged"
  | "Planned"
  | "In Progress"
  | "Released"
  | "Declined";

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

export const beastAdminBetaAssignableModules: BeastModuleIdentifier[] = [
  "learning",
  "health",
  "home",
  "goals",
  "documents",
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
  members = [],
  assignments = [],
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
