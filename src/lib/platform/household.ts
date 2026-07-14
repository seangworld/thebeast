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
  joinedAt: string;
  updatedAt: string;
};

export type HouseholdRelationshipType = "Husband" | "Wife" | "Son" | "Daughter";

export type HouseholdRelationship = {
  id: string;
  householdId: string;
  fromMemberId: string;
  toMemberId: string;
  relationship: HouseholdRelationshipType;
  createdAt: string;
  updatedAt: string;
};

export type HouseholdModel = {
  households: Household[];
  members: HouseholdMember[];
  relationships?: HouseholdRelationship[];
};

export type HouseholdSummary = {
  householdCount: number;
  memberCount: number;
  relationshipCount: number;
  membersByHousehold: Record<string, HouseholdMember[]>;
  relationshipsByHousehold: Record<string, HouseholdRelationship[]>;
  ownersByHousehold: Record<string, HouseholdMember | undefined>;
  householdsWithoutOwner: Household[];
  orphanMembers: HouseholdMember[];
  orphanRelationships: HouseholdRelationship[];
  supportedRelationships: HouseholdRelationshipType[];
};

export const householdRelationshipTypes: HouseholdRelationshipType[] = [
  "Husband",
  "Wife",
  "Son",
  "Daughter",
];

const householdRelationshipSet = new Set<HouseholdRelationshipType>(
  householdRelationshipTypes
);

export const householdOwnershipRules = [
  "Household belongs to BeastOS as shared Personal Hub context.",
  "Household is separate from BeastHome and must not depend on BeastHome workflows.",
  "A Household Owner is the foundation owner for the household record.",
  "Household relationships are links between household members, not new personas.",
  "Advanced invitations, permissions, and sharing controls are intentionally deferred.",
  "Future modules may consume Household only through BeastOS-owned boundaries.",
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
    membersByHousehold,
    relationshipsByHousehold,
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
    supportedRelationships: householdRelationshipTypes,
  };
}
