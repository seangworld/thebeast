import test from "node:test";
import assert from "node:assert/strict";
import {
  beastOSFamilyServiceRules,
  beastOSFamilySharedServices,
  buildHouseholdInvitationRequest,
  buildHouseholdSharedLinkRequest,
  canManageFamily,
  canViewFamily,
  getCurrentFamily,
  getCurrentHousehold,
  getFamilyMembers,
  getFamilySharedServiceRegistration,
  getHouseholdMembers,
  getHouseholdSharedLinksForMember,
  getRelationships,
} from "../src/lib/platform/familyService";
import { mockFamilyVisibilityPermissionModel } from "../src/lib/platform/familyVisibilityPermissions";
import type { FamilyModel } from "../src/lib/platform/family";
import type { HouseholdModel } from "../src/lib/platform/household";

const familyModel: FamilyModel = {
  families: [
    {
      id: "family-1",
      ownerId: "member-owner",
      name: "Primary family",
      createdAt: "2026-07-14T00:00:00.000Z",
      updatedAt: "2026-07-14T00:00:00.000Z",
    },
  ],
  members: [
    {
      id: "family-member-owner",
      familyId: "family-1",
      userId: "member-owner",
      displayName: "Sean",
      relationship: "Husband",
      createdAt: "2026-07-14T00:00:00.000Z",
      updatedAt: "2026-07-14T00:00:00.000Z",
    },
    {
      id: "family-member-child",
      familyId: "family-1",
      displayName: "Child",
      relationship: "Daughter",
      createdAt: "2026-07-14T00:00:00.000Z",
      updatedAt: "2026-07-14T00:00:00.000Z",
    },
    {
      id: "family-member-orphan",
      familyId: "missing-family",
      displayName: "Not returned",
      relationship: "Son",
      createdAt: "2026-07-14T00:00:00.000Z",
      updatedAt: "2026-07-14T00:00:00.000Z",
    },
  ],
};

const householdModel: HouseholdModel = {
  households: [
    {
      id: "household-1",
      ownerId: "member-owner",
      name: "Primary household",
      createdAt: "2026-07-14T00:00:00.000Z",
      updatedAt: "2026-07-14T00:00:00.000Z",
    },
  ],
  members: [
    {
      id: "household-member-owner",
      householdId: "household-1",
      userId: "member-owner",
      displayName: "Sean",
      isOwner: true,
      joinedAt: "2026-07-14T00:00:00.000Z",
      updatedAt: "2026-07-14T00:00:00.000Z",
    },
    {
      id: "household-member-family",
      householdId: "household-1",
      displayName: "Family member",
      isOwner: false,
      joinedAt: "2026-07-14T00:00:00.000Z",
      updatedAt: "2026-07-14T00:00:00.000Z",
    },
  ],
  relationships: [
    {
      id: "relationship-1",
      householdId: "household-1",
      fromMemberId: "household-member-owner",
      toMemberId: "household-member-family",
      relationship: "Husband",
      createdAt: "2026-07-14T00:00:00.000Z",
      updatedAt: "2026-07-14T00:00:00.000Z",
    },
  ],
};

test("BO-305 registers Family and Household as BeastOS shared services", () => {
  assert.deepEqual(
    beastOSFamilySharedServices.map((service) => service.id),
    ["family", "household"]
  );
  assert.equal(
    getFamilySharedServiceRegistration("family")?.visibility,
    "shared-platform-service"
  );
  assert.equal(getFamilySharedServiceRegistration("household")?.owner, "BeastOS");
  assert.deepEqual(
    getFamilySharedServiceRegistration("family")?.sourcePackages,
    ["BO-301", "BO-304", "BO-305"]
  );
  assert.match(beastOSFamilyServiceRules[2], /duplicate family or household logic/);
});

test("BO-305 exposes reusable Family and Household read interfaces", () => {
  assert.equal(getCurrentFamily(familyModel)?.id, "family-1");
  assert.deepEqual(
    getFamilyMembers("family-1", familyModel).map((member) => member.id),
    ["family-member-owner", "family-member-child"]
  );
  assert.equal(getCurrentHousehold(householdModel)?.id, "household-1");
  assert.deepEqual(
    getHouseholdMembers("household-1", householdModel).map(
      (member) => member.id
    ),
    ["household-member-owner", "household-member-family"]
  );
});

test("BO-305 exposes household relationships without adding module integrations", () => {
  const relationships = getRelationships("household-1", householdModel);

  assert.equal(relationships.length, 1);
  assert.equal(relationships[0].relationship, "Husband");
  assert.equal(getRelationships("missing-household", householdModel).length, 0);
  assert.match(beastOSFamilyServiceRules[4], /future roadmap work/);
});

test("BO-305 reuses existing family visibility permission checks", () => {
  const ownerInput = {
    grants: mockFamilyVisibilityPermissionModel.grants,
    familyOwnerMemberId: "family-member-husband",
    subjectMemberId: "family-member-husband",
  };

  assert.equal(canViewFamily(ownerInput), true);
  assert.equal(canManageFamily(ownerInput), true);
});

test("BO-46 and BO-47 expose Household lifecycle and sharing service contracts", () => {
  const registration = getFamilySharedServiceRegistration("household");
  const invite = buildHouseholdInvitationRequest({
    householdId: "household-1",
    invitedByMemberId: "household-member-owner",
    email: "member@example.com",
    role: "Member",
    model: householdModel,
  });
  const learningLink = buildHouseholdSharedLinkRequest({
    householdId: "household-1",
    kind: "Learning",
    sourceRecordId: "learning-plan-1",
    title: "Shared learning plan",
    permission: "View",
    grantedByMemberId: "household-member-owner",
    grantedToMemberIds: ["household-member-family"],
    model: householdModel,
  });
  const visibleLinks = getHouseholdSharedLinksForMember({
    householdId: "household-1",
    memberId: "household-member-family",
    model: { ...householdModel, sharedLinks: [learningLink] },
  });

  assert.equal(invite.dispatchMode, "household-contract-event");
  assert.equal(learningLink.sourceModule, "learning");
  assert.equal(learningLink.sourceOwnershipPreserved, true);
  assert.deepEqual(visibleLinks.map((link) => link.sourceRecordId), ["learning-plan-1"]);
  assert.equal(
    registration?.publicFunctions.includes("buildHouseholdInvitationRequest"),
    true
  );
  assert.equal(
    registration?.publicFunctions.includes("buildHouseholdSharedLinkRequest"),
    true
  );
  assert.match(beastOSFamilyServiceRules[3], /contract events/);
});
