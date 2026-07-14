import test from "node:test";
import assert from "node:assert/strict";
import {
  buildFamilyModel,
  familyOwnershipRules,
  familyRelationshipTypes,
  isFamilyRelationshipType,
  mockFamilyModel,
  summarizeFamilyModel,
  type FamilyModel,
} from "../src/lib/platform/family";

const familyModel: FamilyModel = {
  families: [
    {
      id: "family-1",
      ownerId: "member-1",
      name: "Primary household",
      createdAt: "2026-07-14T00:00:00.000Z",
      updatedAt: "2026-07-14T00:00:00.000Z",
    },
  ],
  members: [
    {
      id: "member-husband",
      familyId: "family-1",
      userId: "member-1",
      displayName: "Sean",
      relationship: "Husband",
      createdAt: "2026-07-14T00:00:00.000Z",
      updatedAt: "2026-07-14T00:00:00.000Z",
    },
    {
      id: "member-wife",
      familyId: "family-1",
      displayName: "Spouse",
      relationship: "Wife",
      createdAt: "2026-07-14T00:00:00.000Z",
      updatedAt: "2026-07-14T00:00:00.000Z",
    },
    {
      id: "member-son",
      familyId: "family-1",
      displayName: "Son",
      relationship: "Son",
      createdAt: "2026-07-14T00:00:00.000Z",
      updatedAt: "2026-07-14T00:00:00.000Z",
    },
    {
      id: "member-daughter",
      familyId: "family-1",
      displayName: "Daughter",
      relationship: "Daughter",
      createdAt: "2026-07-14T00:00:00.000Z",
      updatedAt: "2026-07-14T00:00:00.000Z",
    },
  ],
};

test("BeastOS Family service supports the approved foundation relationships", () => {
  assert.deepEqual(familyRelationshipTypes, [
    "Husband",
    "Wife",
    "Son",
    "Daughter",
  ]);
  assert.equal(isFamilyRelationshipType("Husband"), true);
  assert.equal(isFamilyRelationshipType("Parent"), false);

  const model = buildFamilyModel(familyModel);

  assert.equal(model.families[0].name, "Primary household");
  assert.deepEqual(
    model.members.map((member) => member.relationship),
    ["Husband", "Wife", "Son", "Daughter"]
  );
});

test("BeastOS Family summary keeps family membership separate from roles", () => {
  const summary = summarizeFamilyModel({
    ...familyModel,
    members: [
      ...familyModel.members,
      {
        id: "member-orphan",
        familyId: "missing-family",
        displayName: "Unlinked",
        relationship: "Son",
        createdAt: "2026-07-14T00:00:00.000Z",
        updatedAt: "2026-07-14T00:00:00.000Z",
      },
    ],
  });

  assert.equal(summary.familyCount, 1);
  assert.equal(summary.memberCount, 4);
  assert.equal(summary.membersByFamily["family-1"].length, 4);
  assert.equal(summary.orphanMembers.length, 1);
  assert.deepEqual(summary.supportedRelationships, familyRelationshipTypes);
  assert.equal(
    familyOwnershipRules[1],
    "Family membership is separate from authentication, personas, and entitlements."
  );
});

test("BeastOS Family foundation exposes seeded platform context only", () => {
  const summary = summarizeFamilyModel(mockFamilyModel);

  assert.equal(summary.familyCount, 1);
  assert.equal(summary.memberCount, 1);
  assert.equal(mockFamilyModel.members[0].relationship, "Husband");
  assert.match(familyOwnershipRules[2], /permissions/);
});
