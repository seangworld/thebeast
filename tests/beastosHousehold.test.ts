import test from "node:test";
import assert from "node:assert/strict";
import {
  buildHouseholdModel,
  buildHouseholdInvitationRequest,
  buildHouseholdRemovalRequest,
  buildHouseholdSharedLinkRequest,
  getHouseholdMemberRole,
  getHouseholdSharedLinksForMember,
  householdMemberRoles,
  householdRelationshipTypes,
  householdOwnershipRules,
  isHouseholdMemberRole,
  isHouseholdRelationshipType,
  mockHouseholdModel,
  summarizeHouseholdModel,
  type HouseholdModel,
} from "../src/lib/platform/household";

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
      role: "Member",
      joinedAt: "2026-07-14T00:00:00.000Z",
      updatedAt: "2026-07-14T00:00:00.000Z",
    },
  ],
  relationships: [
    {
      id: "relationship-husband",
      householdId: "household-1",
      fromMemberId: "household-member-owner",
      toMemberId: "household-member-family",
      relationship: "Husband",
      createdAt: "2026-07-14T00:00:00.000Z",
      updatedAt: "2026-07-14T00:00:00.000Z",
    },
    {
      id: "relationship-wife",
      householdId: "household-1",
      fromMemberId: "household-member-family",
      toMemberId: "household-member-owner",
      relationship: "Wife",
      createdAt: "2026-07-14T00:00:00.000Z",
      updatedAt: "2026-07-14T00:00:00.000Z",
    },
    {
      id: "relationship-son",
      householdId: "household-1",
      fromMemberId: "household-member-owner",
      toMemberId: "household-member-family",
      relationship: "Son",
      createdAt: "2026-07-14T00:00:00.000Z",
      updatedAt: "2026-07-14T00:00:00.000Z",
    },
    {
      id: "relationship-daughter",
      householdId: "household-1",
      fromMemberId: "household-member-owner",
      toMemberId: "household-member-family",
      relationship: "Daughter",
      createdAt: "2026-07-14T00:00:00.000Z",
      updatedAt: "2026-07-14T00:00:00.000Z",
    },
  ],
};

test("BeastOS Household service models households, members, and owner", () => {
  const model = buildHouseholdModel(householdModel);

  assert.equal(model.households[0].name, "Primary household");
  assert.equal(model.households[0].ownerId, "member-owner");
  assert.equal(model.members.length, 2);
  assert.equal(model.members[0].isOwner, true);
  assert.equal(model.relationships?.length, 4);
  assert.equal(
    householdOwnershipRules[0],
    "Household belongs to BeastOS as shared Personal Hub context."
  );
});

test("BeastOS Household summary separates Household from BeastHome", () => {
  const summary = summarizeHouseholdModel({
    ...householdModel,
    members: [
      ...householdModel.members,
      {
        id: "household-member-orphan",
        householdId: "missing-household",
        displayName: "Unlinked",
        isOwner: false,
        joinedAt: "2026-07-14T00:00:00.000Z",
        updatedAt: "2026-07-14T00:00:00.000Z",
      },
    ],
  });

  assert.equal(summary.householdCount, 1);
  assert.equal(summary.memberCount, 2);
  assert.equal(summary.relationshipCount, 4);
  assert.equal(summary.membersByHousehold["household-1"].length, 2);
  assert.equal(summary.relationshipsByHousehold["household-1"].length, 4);
  assert.equal(summary.ownersByHousehold["household-1"]?.userId, "member-owner");
  assert.equal(summary.householdsWithoutOwner.length, 0);
  assert.equal(summary.orphanMembers.length, 1);
  assert.equal(summary.orphanRelationships.length, 0);
  assert.equal(
    householdOwnershipRules[1],
    "Household is separate from BeastHome and must not depend on BeastHome workflows."
  );
});

test("BeastOS Household relationships support the initial relationship set", () => {
  assert.deepEqual(householdRelationshipTypes, [
    "Husband",
    "Wife",
    "Son",
    "Daughter",
  ]);
  assert.equal(isHouseholdRelationshipType("Daughter"), true);
  assert.equal(isHouseholdRelationshipType("Roommate"), false);

  const summary = summarizeHouseholdModel({
    ...householdModel,
    relationships: [
      ...(householdModel.relationships || []),
      {
        id: "relationship-orphan",
        householdId: "household-1",
        fromMemberId: "household-member-owner",
        toMemberId: "missing-member",
        relationship: "Son",
        createdAt: "2026-07-14T00:00:00.000Z",
        updatedAt: "2026-07-14T00:00:00.000Z",
      },
    ],
  });

  assert.deepEqual(
    summary.relationshipsByHousehold["household-1"].map(
      (relationship) => relationship.relationship
    ),
    ["Husband", "Wife", "Son", "Daughter"]
  );
  assert.equal(summary.orphanRelationships.length, 1);
  assert.equal(
    householdOwnershipRules[3],
    "Household relationships are links between household members, not new personas."
  );
  assert.throws(
    () =>
      buildHouseholdModel({
        ...householdModel,
        relationships: [
          {
            id: "relationship-invalid",
            householdId: "household-1",
            fromMemberId: "household-member-owner",
            toMemberId: "household-member-family",
            relationship: "Roommate" as never,
            createdAt: "2026-07-14T00:00:00.000Z",
            updatedAt: "2026-07-14T00:00:00.000Z",
          },
        ],
      }),
    /Unsupported household relationship/
  );
});

test("BeastOS Household foundation keeps modules behind BeastOS boundaries", () => {
  const summary = summarizeHouseholdModel(mockHouseholdModel);

  assert.equal(summary.householdCount, 1);
  assert.equal(summary.memberCount, 1);
  assert.equal(summary.ownersByHousehold["household-sean"]?.isOwner, true);
  assert.match(householdOwnershipRules[5], /BeastOS-owned boundaries/);
});

test("BO-46 Household supports invitations roles and safe removal events", () => {
  assert.deepEqual(householdMemberRoles, ["Owner", "Admin", "Member", "Child"]);
  assert.equal(isHouseholdMemberRole("Admin"), true);
  assert.equal(isHouseholdMemberRole("Guest"), false);
  assert.equal(
    getHouseholdMemberRole(householdModel.members[0], householdModel.households[0]),
    "Owner"
  );

  const invite = buildHouseholdInvitationRequest({
    householdId: "household-1",
    invitedByMemberId: "household-member-owner",
    email: "member@example.com",
    role: "Member",
    model: householdModel,
  });
  const removal = buildHouseholdRemovalRequest({
    householdId: "household-1",
    requestedByMemberId: "household-member-owner",
    targetMemberId: "household-member-family",
    model: householdModel,
  });

  assert.equal(invite.dispatchMode, "household-contract-event");
  assert.equal(invite.requiresOwnerOrAdmin, true);
  assert.equal(invite.sourceOwnershipPreserved, true);
  assert.equal(removal.action, "Remove");
  assert.throws(
    () =>
      buildHouseholdRemovalRequest({
        householdId: "household-1",
        requestedByMemberId: "household-member-family",
        targetMemberId: "household-member-owner",
        model: householdModel,
      }),
    /Owner or Admin/
  );
  assert.throws(
    () =>
      buildHouseholdRemovalRequest({
        householdId: "household-1",
        requestedByMemberId: "household-member-owner",
        targetMemberId: "household-member-owner",
        model: householdModel,
      }),
    /Owner cannot be removed/
  );
  assert.match(householdOwnershipRules[4], /contract events/);
});

test("BO-47 Household shared links preserve source ownership and visibility", () => {
  const goalLink = buildHouseholdSharedLinkRequest({
    householdId: "household-1",
    kind: "Goal",
    sourceRecordId: "goal-1",
    title: "Shared goal",
    permission: "View",
    grantedByMemberId: "household-member-owner",
    grantedToMemberIds: ["household-member-family"],
    model: householdModel,
  });
  const documentLink = buildHouseholdSharedLinkRequest({
    householdId: "household-1",
    kind: "Document",
    sourceRecordId: "document-1",
    title: "Shared document",
    permission: "Manage",
    grantedByMemberId: "household-member-owner",
    grantedToMemberIds: ["household-member-family"],
    model: householdModel,
  });
  const modelWithLinks: HouseholdModel = {
    ...householdModel,
    sharedLinks: [goalLink, documentLink],
  };
  const visibleToMember = getHouseholdSharedLinksForMember({
    householdId: "household-1",
    memberId: "household-member-family",
    model: modelWithLinks,
  });
  const summary = summarizeHouseholdModel(modelWithLinks);

  assert.equal(goalLink.sourceModule, "goals");
  assert.equal(documentLink.sourceModule, "documents");
  assert.equal(goalLink.dispatchMode, "household-visibility-contract");
  assert.equal(goalLink.sourceOwnershipPreserved, true);
  assert.deepEqual(
    visibleToMember.map((link) => link.sourceRecordId),
    ["goal-1", "document-1"]
  );
  assert.equal(summary.sharedLinkCount, 2);
  assert.equal(summary.sharedLinksByHousehold["household-1"].length, 2);
  assert.match(householdOwnershipRules[6], /source modules keep business logic/);
});
