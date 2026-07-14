import {
  buildFamilyModel,
  familyOwnershipRules,
  mockFamilyModel,
  type Family,
  type FamilyMember,
  type FamilyModel,
} from "./family";
import {
  buildHouseholdModel,
  householdOwnershipRules,
  mockHouseholdModel,
  type Household,
  type HouseholdMember,
  type HouseholdModel,
  type HouseholdRelationship,
} from "./household";

export {
  canManageFamily,
  canViewFamily,
  type FamilyVisibilityResolutionInput,
} from "./familyVisibilityPermissions";

export type BeastOSSharedServiceId = "family" | "household";

export type BeastOSSharedServiceRegistration = {
  id: BeastOSSharedServiceId;
  name: string;
  owner: "BeastOS";
  status: "foundation";
  visibility: "shared-platform-service";
  sourcePackages: string[];
  publicFunctions: string[];
  boundaries: string[];
};

export const beastOSFamilyServiceRules = [
  "Family and Household are BeastOS shared platform services.",
  "Future applications must consume Family and Household through BeastOS service interfaces.",
  "Modules must not implement duplicate family or household logic.",
  "Invitations, sharing UI, family switching, module integrations, household assets, BeastHome integration, advanced permissions, and editing workflows are future roadmap work.",
];

export const beastOSFamilySharedServices: BeastOSSharedServiceRegistration[] = [
  {
    id: "family",
    name: "Family",
    owner: "BeastOS",
    status: "foundation",
    visibility: "shared-platform-service",
    sourcePackages: ["BO-301", "BO-304", "BO-305"],
    publicFunctions: [
      "getCurrentFamily",
      "getFamilyMembers",
      "getRelationships",
      "canViewFamily",
      "canManageFamily",
    ],
    boundaries: familyOwnershipRules,
  },
  {
    id: "household",
    name: "Household",
    owner: "BeastOS",
    status: "foundation",
    visibility: "shared-platform-service",
    sourcePackages: ["BO-302", "BO-303", "BO-305"],
    publicFunctions: ["getCurrentHousehold", "getHouseholdMembers"],
    boundaries: householdOwnershipRules,
  },
];

export function getFamilySharedServiceRegistration(
  serviceId: BeastOSSharedServiceId
) {
  return beastOSFamilySharedServices.find((service) => service.id === serviceId);
}

export function getCurrentFamily(
  model: FamilyModel = mockFamilyModel
): Family | undefined {
  return buildFamilyModel(model).families[0];
}

export function getFamilyMembers(
  familyId = getCurrentFamily()?.id,
  model: FamilyModel = mockFamilyModel
): FamilyMember[] {
  if (!familyId) return [];

  return buildFamilyModel(model).members.filter(
    (member) => member.familyId === familyId
  );
}

export function getCurrentHousehold(
  model: HouseholdModel = mockHouseholdModel
): Household | undefined {
  return buildHouseholdModel(model).households[0];
}

export function getHouseholdMembers(
  householdId = getCurrentHousehold()?.id,
  model: HouseholdModel = mockHouseholdModel
): HouseholdMember[] {
  if (!householdId) return [];

  return buildHouseholdModel(model).members.filter(
    (member) => member.householdId === householdId
  );
}

export function getRelationships(
  householdId = getCurrentHousehold()?.id,
  model: HouseholdModel = mockHouseholdModel
): HouseholdRelationship[] {
  if (!householdId) return [];

  return (buildHouseholdModel(model).relationships || []).filter(
    (relationship) => relationship.householdId === householdId
  );
}
