export type FamilyRelationshipType = "Husband" | "Wife" | "Son" | "Daughter";

export type Family = {
  id: string;
  ownerId: string;
  name: string;
  createdAt: string;
  updatedAt: string;
};

export type FamilyMember = {
  id: string;
  familyId: string;
  userId?: string;
  displayName: string;
  relationship: FamilyRelationshipType;
  createdAt: string;
  updatedAt: string;
};

export type FamilyModel = {
  families: Family[];
  members: FamilyMember[];
};

export type FamilySummary = {
  familyCount: number;
  memberCount: number;
  membersByFamily: Record<string, FamilyMember[]>;
  orphanMembers: FamilyMember[];
  supportedRelationships: FamilyRelationshipType[];
};

export const familyRelationshipTypes: FamilyRelationshipType[] = [
  "Husband",
  "Wife",
  "Son",
  "Daughter",
];

const familyRelationshipSet = new Set<FamilyRelationshipType>(
  familyRelationshipTypes
);

export const familyOwnershipRules = [
  "Family belongs to BeastOS as shared Personal Hub context.",
  "Family membership is separate from authentication, personas, and entitlements.",
  "Advanced permissions and sharing controls are intentionally deferred.",
  "Modules may reference family context only through BeastOS-owned boundaries.",
];

export const mockFamilyModel: FamilyModel = {
  families: [
    {
      id: "family-sean",
      ownerId: "member-owner",
      name: "Sean's Family",
      createdAt: "2026-07-14T00:00:00.000Z",
      updatedAt: "2026-07-14T00:00:00.000Z",
    },
  ],
  members: [
    {
      id: "family-member-husband",
      familyId: "family-sean",
      userId: "member-owner",
      displayName: "Sean G.",
      relationship: "Husband",
      createdAt: "2026-07-14T00:00:00.000Z",
      updatedAt: "2026-07-14T00:00:00.000Z",
    },
  ],
};

export function isFamilyRelationshipType(
  relationship: unknown
): relationship is FamilyRelationshipType {
  return familyRelationshipSet.has(relationship as FamilyRelationshipType);
}

export function buildFamilyModel(model: FamilyModel): FamilyModel {
  const familyIds = new Set(model.families.map((family) => family.id));

  return {
    families: model.families,
    members: model.members
      .filter((member) => familyIds.has(member.familyId))
      .map((member) => {
        if (!isFamilyRelationshipType(member.relationship)) {
          throw new Error(`Unsupported family relationship: ${member.relationship}`);
        }

        return member;
      }),
  };
}

export function summarizeFamilyModel(model: FamilyModel): FamilySummary {
  const normalized = buildFamilyModel(model);
  const familyIds = new Set(normalized.families.map((family) => family.id));
  const membersByFamily = normalized.families.reduce<Record<string, FamilyMember[]>>(
    (groups, family) => ({
      ...groups,
      [family.id]: normalized.members.filter(
        (member) => member.familyId === family.id
      ),
    }),
    {}
  );

  return {
    familyCount: normalized.families.length,
    memberCount: normalized.members.length,
    membersByFamily,
    orphanMembers: model.members.filter((member) => !familyIds.has(member.familyId)),
    supportedRelationships: familyRelationshipTypes,
  };
}
