import test from "node:test";
import assert from "node:assert/strict";
import {
  buildHouseholdModel,
  householdOwnershipRules,
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
};

test("BeastOS Household service models households, members, and owner", () => {
  const model = buildHouseholdModel(householdModel);

  assert.equal(model.households[0].name, "Primary household");
  assert.equal(model.households[0].ownerId, "member-owner");
  assert.equal(model.members.length, 2);
  assert.equal(model.members[0].isOwner, true);
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
  assert.equal(summary.membersByHousehold["household-1"].length, 2);
  assert.equal(summary.ownersByHousehold["household-1"]?.userId, "member-owner");
  assert.equal(summary.householdsWithoutOwner.length, 0);
  assert.equal(summary.orphanMembers.length, 1);
  assert.equal(
    householdOwnershipRules[1],
    "Household is separate from BeastHome and must not depend on BeastHome workflows."
  );
});

test("BeastOS Household foundation does not add advanced permissions", () => {
  const summary = summarizeHouseholdModel(mockHouseholdModel);

  assert.equal(summary.householdCount, 1);
  assert.equal(summary.memberCount, 1);
  assert.equal(summary.ownersByHousehold["household-sean"]?.isOwner, true);
  assert.match(householdOwnershipRules[3], /permissions/);
});
