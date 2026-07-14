import test from "node:test";
import assert from "node:assert/strict";
import {
  buildFamilyVisibilityPermissionModel,
  canManageFamily,
  canViewFamily,
  familyVisibilityPermissionRules,
  familyVisibilityPermissions,
  isFamilyVisibilityPermission,
  mockFamilyVisibilityPermissionModel,
  resolveFamilyVisibilityPermission,
  summarizeFamilyVisibilityPermissions,
  type FamilyVisibilityPermissionModel,
} from "../src/lib/platform/familyVisibilityPermissions";

const permissionModel: FamilyVisibilityPermissionModel = {
  grants: [
    {
      id: "grant-none",
      familyId: "family-1",
      subjectMemberId: "member-none",
      permission: "None",
      source: "owner",
      createdAt: "2026-07-14T00:00:00.000Z",
      updatedAt: "2026-07-14T00:00:00.000Z",
    },
    {
      id: "grant-view",
      familyId: "family-1",
      subjectMemberId: "member-view",
      targetMemberId: "member-child",
      permission: "View",
      source: "owner",
      createdAt: "2026-07-14T00:00:00.000Z",
      updatedAt: "2026-07-14T00:00:00.000Z",
    },
    {
      id: "grant-manage",
      familyId: "family-1",
      subjectMemberId: "member-manage",
      permission: "Manage",
      source: "owner",
      createdAt: "2026-07-14T00:00:00.000Z",
      updatedAt: "2026-07-14T00:00:00.000Z",
    },
  ],
};

test("BeastOS Family visibility supports None View and Manage", () => {
  assert.deepEqual(familyVisibilityPermissions, ["None", "View", "Manage"]);
  assert.equal(isFamilyVisibilityPermission("View"), true);
  assert.equal(isFamilyVisibilityPermission("Edit"), false);

  const summary = summarizeFamilyVisibilityPermissions(permissionModel);

  assert.equal(summary.grantCount, 3);
  assert.equal(summary.noneCount, 1);
  assert.equal(summary.viewCount, 1);
  assert.equal(summary.manageCount, 1);
  assert.deepEqual(summary.supportedPermissions, familyVisibilityPermissions);
});

test("BeastOS Family visibility resolves owner and member access", () => {
  assert.equal(
    resolveFamilyVisibilityPermission({
      grants: permissionModel.grants,
      familyOwnerMemberId: "member-owner",
      subjectMemberId: "member-owner",
    }),
    "Manage"
  );
  assert.equal(
    resolveFamilyVisibilityPermission({
      grants: permissionModel.grants,
      familyOwnerMemberId: "member-owner",
      subjectMemberId: "member-view",
      targetMemberId: "member-child",
    }),
    "View"
  );
  assert.equal(
    resolveFamilyVisibilityPermission({
      grants: permissionModel.grants,
      familyOwnerMemberId: "member-owner",
      subjectMemberId: "member-none",
    }),
    "None"
  );
  assert.equal(
    resolveFamilyVisibilityPermission({
      grants: permissionModel.grants,
      familyOwnerMemberId: "member-owner",
      subjectMemberId: "member-unknown",
    }),
    "None"
  );
});

test("BeastOS Family visibility exposes reusable checks for future modules", () => {
  const viewInput = {
    grants: permissionModel.grants,
    familyOwnerMemberId: "member-owner",
    subjectMemberId: "member-view",
    targetMemberId: "member-child",
  };
  const manageInput = {
    grants: permissionModel.grants,
    familyOwnerMemberId: "member-owner",
    subjectMemberId: "member-manage",
  };

  assert.equal(canViewFamily(viewInput), true);
  assert.equal(canManageFamily(viewInput), false);
  assert.equal(canViewFamily(manageInput), true);
  assert.equal(canManageFamily(manageInput), true);
  assert.equal(
    familyVisibilityPermissionRules[4],
    "Future modules may consume these permissions but must not own the permission model."
  );
});

test("BeastOS Family visibility rejects unsupported permission labels", () => {
  assert.throws(
    () =>
      buildFamilyVisibilityPermissionModel({
        grants: [
          {
            id: "grant-invalid",
            familyId: "family-1",
            subjectMemberId: "member-view",
            permission: "Edit" as never,
            source: "owner",
            createdAt: "2026-07-14T00:00:00.000Z",
            updatedAt: "2026-07-14T00:00:00.000Z",
          },
        ],
      }),
    /Unsupported family visibility permission/
  );

  const seeded = summarizeFamilyVisibilityPermissions(
    mockFamilyVisibilityPermissionModel
  );
  assert.equal(seeded.manageCount, 1);
});
