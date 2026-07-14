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

export type HouseholdModel = {
  households: Household[];
  members: HouseholdMember[];
};

export type HouseholdSummary = {
  householdCount: number;
  memberCount: number;
  membersByHousehold: Record<string, HouseholdMember[]>;
  ownersByHousehold: Record<string, HouseholdMember | undefined>;
  householdsWithoutOwner: Household[];
  orphanMembers: HouseholdMember[];
};

export const householdOwnershipRules = [
  "Household belongs to BeastOS as shared Personal Hub context.",
  "Household is separate from BeastHome and must not depend on BeastHome workflows.",
  "A Household Owner is the foundation owner for the household record.",
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
};

export function buildHouseholdModel(model: HouseholdModel): HouseholdModel {
  const householdIds = new Set(
    model.households.map((household) => household.id)
  );

  return {
    households: model.households,
    members: model.members.filter((member) =>
      householdIds.has(member.householdId)
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
    membersByHousehold,
    ownersByHousehold,
    householdsWithoutOwner: normalized.households.filter(
      (household) => !ownersByHousehold[household.id]
    ),
    orphanMembers: model.members.filter(
      (member) => !householdIds.has(member.householdId)
    ),
  };
}
