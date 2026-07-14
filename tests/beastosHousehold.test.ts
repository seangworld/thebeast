import test from "node:test";
import assert from "node:assert/strict";
import {
  buildHouseholdModel,
  householdRelationshipTypes,
  householdOwnershipRules,
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

test("BeastOS Household foundation does not add advanced permissions", () => {
  const summary = summarizeHouseholdModel(mockHouseholdModel);

  assert.equal(summary.householdCount, 1);
  assert.equal(summary.memberCount, 1);
  assert.equal(summary.ownersByHousehold["household-sean"]?.isOwner, true);
  assert.match(householdOwnershipRules[4], /permissions/);
});
