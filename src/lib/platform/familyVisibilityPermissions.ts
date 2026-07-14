export type FamilyVisibilityPermission = "None" | "View" | "Manage";

export type FamilyVisibilityGrant = {
  id: string;
  familyId: string;
  subjectMemberId: string;
  targetMemberId?: string;
  permission: FamilyVisibilityPermission;
  source: "owner" | "member" | "system";
  createdAt: string;
  updatedAt: string;
};

export type FamilyVisibilityPermissionModel = {
  grants: FamilyVisibilityGrant[];
};

export type FamilyVisibilityResolutionInput = {
  grants: FamilyVisibilityGrant[];
  familyOwnerMemberId: string;
  subjectMemberId: string;
  targetMemberId?: string;
};

export type FamilyVisibilitySummary = {
  grantCount: number;
  noneCount: number;
  viewCount: number;
  manageCount: number;
  supportedPermissions: FamilyVisibilityPermission[];
};

export const familyVisibilityPermissions: FamilyVisibilityPermission[] = [
  "None",
  "View",
  "Manage",
];

const familyVisibilityPermissionSet = new Set<FamilyVisibilityPermission>(
  familyVisibilityPermissions
);

const familyVisibilityPermissionRank: Record<FamilyVisibilityPermission, number> = {
  None: 0,
  View: 1,
  Manage: 2,
};

export const familyVisibilityPermissionRules = [
  "Family visibility permissions belong to BeastOS as shared Personal Hub policy.",
  "None means no visibility.",
  "View means visibility without management authority.",
  "Manage means visibility plus foundation management authority.",
  "Future modules may consume these permissions but must not own the permission model.",
];

export const mockFamilyVisibilityPermissionModel: FamilyVisibilityPermissionModel = {
  grants: [
    {
      id: "family-visibility-owner-manage",
      familyId: "family-sean",
      subjectMemberId: "family-member-husband",
      permission: "Manage",
      source: "owner",
      createdAt: "2026-07-14T00:00:00.000Z",
      updatedAt: "2026-07-14T00:00:00.000Z",
    },
  ],
};

export function isFamilyVisibilityPermission(
  permission: unknown
): permission is FamilyVisibilityPermission {
  return familyVisibilityPermissionSet.has(
    permission as FamilyVisibilityPermission
  );
}

export function buildFamilyVisibilityPermissionModel(
  model: FamilyVisibilityPermissionModel
): FamilyVisibilityPermissionModel {
  return {
    grants: model.grants.map((grant) => {
      if (!isFamilyVisibilityPermission(grant.permission)) {
        throw new Error(
          `Unsupported family visibility permission: ${grant.permission}`
        );
      }

      return grant;
    }),
  };
}

export function compareFamilyVisibilityPermission(
  left: FamilyVisibilityPermission,
  right: FamilyVisibilityPermission
) {
  return familyVisibilityPermissionRank[left] - familyVisibilityPermissionRank[right];
}

export function resolveFamilyVisibilityPermission({
  grants,
  familyOwnerMemberId,
  subjectMemberId,
  targetMemberId,
}: FamilyVisibilityResolutionInput): FamilyVisibilityPermission {
  if (subjectMemberId === familyOwnerMemberId) return "Manage";

  const matchingGrants = buildFamilyVisibilityPermissionModel({ grants }).grants.filter(
    (grant) =>
      grant.subjectMemberId === subjectMemberId &&
      (!targetMemberId ||
        !grant.targetMemberId ||
        grant.targetMemberId === targetMemberId)
  );

  return matchingGrants.reduce<FamilyVisibilityPermission>(
    (highest, grant) =>
      compareFamilyVisibilityPermission(grant.permission, highest) > 0
        ? grant.permission
        : highest,
    "None"
  );
}

export function canViewFamily(input: FamilyVisibilityResolutionInput) {
  return (
    compareFamilyVisibilityPermission(
      resolveFamilyVisibilityPermission(input),
      "View"
    ) >= 0
  );
}

export function canManageFamily(input: FamilyVisibilityResolutionInput) {
  return resolveFamilyVisibilityPermission(input) === "Manage";
}

export function summarizeFamilyVisibilityPermissions(
  model: FamilyVisibilityPermissionModel
): FamilyVisibilitySummary {
  const normalized = buildFamilyVisibilityPermissionModel(model);

  return {
    grantCount: normalized.grants.length,
    noneCount: normalized.grants.filter((grant) => grant.permission === "None")
      .length,
    viewCount: normalized.grants.filter((grant) => grant.permission === "View")
      .length,
    manageCount: normalized.grants.filter((grant) => grant.permission === "Manage")
      .length,
    supportedPermissions: familyVisibilityPermissions,
  };
}
