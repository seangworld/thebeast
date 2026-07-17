export type Household = {
  id: string;
  ownerId: string;
  name: string;
  createdAt: string;
  updatedAt: string;
};

export type HouseholdMember = {
  id: string;
  householdId: string;
  userId?: string;
  displayName: string;
  isOwner: boolean;
  role?: HouseholdMemberRole;
  joinedAt: string;
  updatedAt: string;
};

export type HouseholdMemberRole = "Owner" | "Admin" | "Member" | "Child";
export type HouseholdRelationshipType = "Husband" | "Wife" | "Son" | "Daughter";
export type HouseholdInvitationStatus =
  | "Pending"
  | "Accepted"
  | "Expired"
  | "Revoked";
export type HouseholdSharedLinkKind = "Goal" | "Document" | "Finance" | "Learning";
export type HouseholdSharedLinkPermission = "View" | "Manage";
export type HouseholdSharedLinkStatus = "Active" | "Revoked";

export type HouseholdRelationship = {
  id: string;
  householdId: string;
  fromMemberId: string;
  toMemberId: string;
  relationship: HouseholdRelationshipType;
  createdAt: string;
  updatedAt: string;
};

export type HouseholdInvitation = {
  id: string;
  householdId: string;
  invitedByMemberId: string;
  email: string;
  role: Exclude<HouseholdMemberRole, "Owner">;
  status: HouseholdInvitationStatus;
  createdAt: string;
  expiresAt: string;
};

export type HouseholdLifecycleActionRequest = {
  id: string;
  householdId: string;
  requestedByMemberId: string;
  action: "Create" | "Invite" | "ChangeRole" | "Remove";
  targetMemberId?: string;
  targetEmail?: string;
  role?: HouseholdMemberRole;
  dispatchMode: "household-contract-event";
  requiresOwnerOrAdmin: boolean;
  sourceOwnershipPreserved: true;
};

export type HouseholdSharedLink = {
  id: string;
  householdId: string;
  kind: HouseholdSharedLinkKind;
  sourceModule: "goals" | "documents" | "money" | "learning";
  sourceRecordId: string;
  title: string;
  permission: HouseholdSharedLinkPermission;
  status: HouseholdSharedLinkStatus;
  grantedByMemberId: string;
  grantedToMemberIds: string[];
  createdAt: string;
};

export type HouseholdSharedLinkRequest = HouseholdSharedLink & {
  dispatchMode: "household-visibility-contract";
  sourceOwnershipPreserved: true;
};

export type HouseholdModel = {
  households: Household[];
  members: HouseholdMember[];
  relationships?: HouseholdRelationship[];
  invitations?: HouseholdInvitation[];
  sharedLinks?: HouseholdSharedLink[];
};

export type HouseholdSummary = {
  householdCount: number;
  memberCount: number;
  relationshipCount: number;
  pendingInvitationCount: number;
  sharedLinkCount: number;
  membersByHousehold: Record<string, HouseholdMember[]>;
  relationshipsByHousehold: Record<string, HouseholdRelationship[]>;
  invitationsByHousehold: Record<string, HouseholdInvitation[]>;
  sharedLinksByHousehold: Record<string, HouseholdSharedLink[]>;
  ownersByHousehold: Record<string, HouseholdMember | undefined>;
  householdsWithoutOwner: Household[];
  orphanMembers: HouseholdMember[];
  orphanRelationships: HouseholdRelationship[];
  orphanInvitations: HouseholdInvitation[];
  orphanSharedLinks: HouseholdSharedLink[];
  supportedRoles: HouseholdMemberRole[];
  supportedRelationships: HouseholdRelationshipType[];
};

export const householdMemberRoles: HouseholdMemberRole[] = [
  "Owner",
  "Admin",
  "Member",
  "Child",
];

export const householdRelationshipTypes: HouseholdRelationshipType[] = [
  "Husband",
  "Wife",
  "Son",
  "Daughter",
];

const householdRelationshipSet = new Set<HouseholdRelationshipType>(
  householdRelationshipTypes
);
const householdRoleSet = new Set<HouseholdMemberRole>(householdMemberRoles);

export const householdOwnershipRules = [
  "Household belongs to BeastOS as shared Personal Hub context.",
  "Household is separate from BeastHome and must not depend on BeastHome workflows.",
  "A Household Owner is the foundation owner for the household record.",
  "Household relationships are links between household members, not new personas.",
  "Household invitations roles removal and shared visibility must use BeastOS-owned contract events.",
  "Future modules may consume Household only through BeastOS-owned boundaries.",
  "Shared household links record visibility only; source modules keep business logic ownership.",
];

export const mockHouseholdModel: HouseholdModel = {
  households: [
    {
      id: "household-sean",
      ownerId: "member-owner",
      name: "Sean's Household",
      createdAt: "2026-07-14T00:00:00.000Z",
      updatedAt: "2026-07-14T00:00:00.000Z",
    },
  ],
  members: [
    {
      id: "household-member-owner",
      householdId: "household-sean",
      userId: "member-owner",
      displayName: "Sean G.",
      isOwner: true,
      joinedAt: "2026-07-14T00:00:00.000Z",
      updatedAt: "2026-07-14T00:00:00.000Z",
    },
  ],
  relationships: [],
};

export function isHouseholdRelationshipType(
  relationship: unknown
): relationship is HouseholdRelationshipType {
  return householdRelationshipSet.has(relationship as HouseholdRelationshipType);
}

export function isHouseholdMemberRole(role: unknown): role is HouseholdMemberRole {
  return householdRoleSet.has(role as HouseholdMemberRole);
}

export function getHouseholdMemberRole(
  member: HouseholdMember,
  household?: Household
): HouseholdMemberRole {
  if (member.isOwner || member.userId === household?.ownerId) return "Owner";
  return member.role || "Member";
}

export function buildHouseholdModel(model: HouseholdModel): HouseholdModel {
  const householdIds = new Set(
    model.households.map((household) => household.id)
  );
  const normalizedMembers = model.members.filter((member) =>
    householdIds.has(member.householdId)
  );
  const membersById = new Map(
    normalizedMembers.map((member) => [member.id, member])
  );

  return {
    households: model.households,
    members: normalizedMembers,
    relationships: (model.relationships || [])
      .filter(
        (relationship) => {
          const fromMember = membersById.get(relationship.fromMemberId);
          const toMember = membersById.get(relationship.toMemberId);

          return (
            householdIds.has(relationship.householdId) &&
            fromMember?.householdId === relationship.householdId &&
            toMember?.householdId === relationship.householdId
          );
        }
      )
      .map((relationship) => {
        if (!isHouseholdRelationshipType(relationship.relationship)) {
          throw new Error(
            `Unsupported household relationship: ${relationship.relationship}`
          );
        }

        return relationship;
      }),
    invitations: (model.invitations || [])
      .filter((invitation) => householdIds.has(invitation.householdId))
      .map((invitation) => {
        if (!isHouseholdMemberRole(invitation.role)) {
          throw new Error(`Unsupported household role: ${invitation.role}`);
        }

        return invitation;
      }),
    sharedLinks: (model.sharedLinks || []).filter((link) =>
      householdIds.has(link.householdId)
    ),
  };
}

export function summarizeHouseholdModel(
  model: HouseholdModel
): HouseholdSummary {
  const normalized = buildHouseholdModel(model);
  const householdIds = new Set(
    normalized.households.map((household) => household.id)
  );
  const membersById = new Map(
    normalized.members.map((member) => [member.id, member])
  );
  const membersByHousehold = normalized.households.reduce<
    Record<string, HouseholdMember[]>
  >(
    (groups, household) => ({
      ...groups,
      [household.id]: normalized.members.filter(
        (member) => member.householdId === household.id
      ),
    }),
    {}
  );
  const relationshipsByHousehold = normalized.households.reduce<
    Record<string, HouseholdRelationship[]>
  >(
    (groups, household) => ({
      ...groups,
      [household.id]: (normalized.relationships || []).filter(
        (relationship) => relationship.householdId === household.id
      ),
    }),
    {}
  );
  const invitationsByHousehold = normalized.households.reduce<
    Record<string, HouseholdInvitation[]>
  >(
    (groups, household) => ({
      ...groups,
      [household.id]: (normalized.invitations || []).filter(
        (invitation) => invitation.householdId === household.id
      ),
    }),
    {}
  );
  const sharedLinksByHousehold = normalized.households.reduce<
    Record<string, HouseholdSharedLink[]>
  >(
    (groups, household) => ({
      ...groups,
      [household.id]: (normalized.sharedLinks || []).filter(
        (link) => link.householdId === household.id && link.status === "Active"
      ),
    }),
    {}
  );
  const ownersByHousehold = normalized.households.reduce<
    Record<string, HouseholdMember | undefined>
  >(
    (owners, household) => ({
      ...owners,
      [household.id]: membersByHousehold[household.id]?.find(
        (member) =>
          member.isOwner &&
          (!member.userId || member.userId === household.ownerId)
      ),
    }),
    {}
  );

  return {
    householdCount: normalized.households.length,
    memberCount: normalized.members.length,
    relationshipCount: (normalized.relationships || []).length,
    pendingInvitationCount: (normalized.invitations || []).filter(
      (invitation) => invitation.status === "Pending"
    ).length,
    sharedLinkCount: (normalized.sharedLinks || []).filter(
      (link) => link.status === "Active"
    ).length,
    membersByHousehold,
    relationshipsByHousehold,
    invitationsByHousehold,
    sharedLinksByHousehold,
    ownersByHousehold,
    householdsWithoutOwner: normalized.households.filter(
      (household) => !ownersByHousehold[household.id]
    ),
    orphanMembers: model.members.filter(
      (member) => !householdIds.has(member.householdId)
    ),
    orphanRelationships: (model.relationships || []).filter(
      (relationship) => {
        const fromMember = membersById.get(relationship.fromMemberId);
        const toMember = membersById.get(relationship.toMemberId);

        return (
          !householdIds.has(relationship.householdId) ||
          fromMember?.householdId !== relationship.householdId ||
          toMember?.householdId !== relationship.householdId
        );
      }
    ),
    orphanInvitations: (model.invitations || []).filter(
      (invitation) => !householdIds.has(invitation.householdId)
    ),
    orphanSharedLinks: (model.sharedLinks || []).filter(
      (link) => !householdIds.has(link.householdId)
    ),
    supportedRoles: householdMemberRoles,
    supportedRelationships: householdRelationshipTypes,
  };
}

function getHouseholdOrThrow(householdId: string, model: HouseholdModel) {
  const household = buildHouseholdModel(model).households.find(
    (item) => item.id === householdId
  );
  if (!household) throw new Error(`Unknown household: ${householdId}`);
  return household;
}

function getHouseholdMemberOrThrow(
  householdId: string,
  memberId: string,
  model: HouseholdModel
) {
  const member = buildHouseholdModel(model).members.find(
    (item) => item.householdId === householdId && item.id === memberId
  );
  if (!member) throw new Error(`Unknown household member: ${memberId}`);
  return member;
}

function memberCanManageHousehold(
  householdId: string,
  memberId: string,
  model: HouseholdModel
) {
  const household = getHouseholdOrThrow(householdId, model);
  const member = getHouseholdMemberOrThrow(householdId, memberId, model);
  const role = getHouseholdMemberRole(member, household);
  return role === "Owner" || role === "Admin";
}

export function buildHouseholdInvitationRequest({
  householdId,
  invitedByMemberId,
  email,
  role,
  model = mockHouseholdModel,
}: {
  householdId: string;
  invitedByMemberId: string;
  email: string;
  role: Exclude<HouseholdMemberRole, "Owner">;
  model?: HouseholdModel;
}): HouseholdLifecycleActionRequest {
  if (!email.includes("@")) throw new Error("Household invitation email is invalid.");
  if (!isHouseholdMemberRole(role)) {
    throw new Error(`Unsupported household role: ${role}`);
  }
  if (!memberCanManageHousehold(householdId, invitedByMemberId, model)) {
    throw new Error("Only household Owner or Admin can invite household members.");
  }

  return {
    id: `household-invite-${householdId}-${role.toLowerCase()}`,
    householdId,
    requestedByMemberId: invitedByMemberId,
    action: "Invite",
    targetEmail: email,
    role,
    dispatchMode: "household-contract-event",
    requiresOwnerOrAdmin: true,
    sourceOwnershipPreserved: true,
  };
}

export function buildHouseholdRemovalRequest({
  householdId,
  requestedByMemberId,
  targetMemberId,
  model = mockHouseholdModel,
}: {
  householdId: string;
  requestedByMemberId: string;
  targetMemberId: string;
  model?: HouseholdModel;
}): HouseholdLifecycleActionRequest {
  if (!memberCanManageHousehold(householdId, requestedByMemberId, model)) {
    throw new Error("Only household Owner or Admin can remove household members.");
  }
  const household = getHouseholdOrThrow(householdId, model);
  const targetMember = getHouseholdMemberOrThrow(householdId, targetMemberId, model);
  if (getHouseholdMemberRole(targetMember, household) === "Owner") {
    throw new Error("Household Owner cannot be removed by a member action.");
  }

  return {
    id: `household-remove-${targetMemberId}`,
    householdId,
    requestedByMemberId,
    action: "Remove",
    targetMemberId,
    dispatchMode: "household-contract-event",
    requiresOwnerOrAdmin: true,
    sourceOwnershipPreserved: true,
  };
}

function sourceModuleForSharedLink(kind: HouseholdSharedLinkKind) {
  return {
    Goal: "goals",
    Document: "documents",
    Finance: "money",
    Learning: "learning",
  }[kind] as HouseholdSharedLink["sourceModule"];
}

export function buildHouseholdSharedLinkRequest({
  householdId,
  kind,
  sourceRecordId,
  title,
  permission,
  grantedByMemberId,
  grantedToMemberIds,
  model = mockHouseholdModel,
}: {
  householdId: string;
  kind: HouseholdSharedLinkKind;
  sourceRecordId: string;
  title: string;
  permission: HouseholdSharedLinkPermission;
  grantedByMemberId: string;
  grantedToMemberIds: string[];
  model?: HouseholdModel;
}): HouseholdSharedLinkRequest {
  if (!memberCanManageHousehold(householdId, grantedByMemberId, model)) {
    throw new Error("Only household Owner or Admin can create shared links.");
  }
  grantedToMemberIds.forEach((memberId) =>
    getHouseholdMemberOrThrow(householdId, memberId, model)
  );

  return {
    id: `household-link-${kind.toLowerCase()}-${sourceRecordId}`,
    householdId,
    kind,
    sourceModule: sourceModuleForSharedLink(kind),
    sourceRecordId,
    title,
    permission,
    status: "Active",
    grantedByMemberId,
    grantedToMemberIds,
    createdAt: new Date(0).toISOString(),
    dispatchMode: "household-visibility-contract",
    sourceOwnershipPreserved: true,
  };
}

export function getHouseholdSharedLinksForMember({
  householdId,
  memberId,
  model = mockHouseholdModel,
}: {
  householdId: string;
  memberId: string;
  model?: HouseholdModel;
}): HouseholdSharedLink[] {
  const household = getHouseholdOrThrow(householdId, model);
  const member = getHouseholdMemberOrThrow(householdId, memberId, model);
  const role = getHouseholdMemberRole(member, household);

  return (buildHouseholdModel(model).sharedLinks || []).filter((link) => {
    if (link.householdId !== householdId || link.status !== "Active") return false;
    if (role === "Owner" || role === "Admin") return true;
    return link.grantedToMemberIds.includes(memberId);
  });
}
