import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  buildBeastInvitationCallbackUrl,
  normalizeBeastAdminInvitationAction,
  normalizeBeastAdminInvitationDirectory,
  normalizeBeastAdminMemberInvitationRequest,
} from "../src/lib/beastAdminMemberInvitations";

const householdId = "0bcdf9e4-7451-4eb5-9787-e929f617b9eb";
const flagId = "9d998e8f-4cef-4e92-96f4-09c38c12f813";

const validRequest = {
  email: "New.Member@example.com",
  displayName: "New Member",
  role: "beta",
  householdId,
  relationship: "Son",
  moduleAccess: ["learning"],
  betaFlagIds: [flagId],
  invitationMessage: "Welcome to our Beast household.",
};

test("BA-108 validates complete invitation input without inventing optional data", () => {
  assert.deepEqual(normalizeBeastAdminMemberInvitationRequest(validRequest), {
    ...validRequest,
    email: "new.member@example.com",
    role: "beta",
    relationship: "Son",
    moduleAccess: ["learning"],
  });
  assert.deepEqual(
    normalizeBeastAdminMemberInvitationRequest({
      ...validRequest,
      householdId: null,
      relationship: null,
      moduleAccess: [],
      betaFlagIds: [],
      invitationMessage: "",
    }),
    {
      ...validRequest,
      email: "new.member@example.com",
      role: "beta",
      householdId: null,
      relationship: null,
      moduleAccess: [],
      betaFlagIds: [],
      invitationMessage: null,
    }
  );
  assert.equal(
    normalizeBeastAdminMemberInvitationRequest({
      ...validRequest,
      householdId: null,
    }),
    null
  );
  assert.equal(
    normalizeBeastAdminMemberInvitationRequest({
      ...validRequest,
      email: "invalid",
    }),
    null
  );
  assert.equal(
    normalizeBeastAdminMemberInvitationRequest({
      ...validRequest,
      moduleAccess: ["learning", "learning"],
    }),
    null
  );
  assert.equal(
    normalizeBeastAdminMemberInvitationRequest({
      ...validRequest,
      invitationMessage: "x".repeat(1001),
    }),
    null
  );
});

test("BA-108 normalizes every invitation lifecycle state and household option", () => {
  const invitations = ["sent", "resent", "accepted", "expired", "revoked"].map(
    (state, index) => ({
      id: `invitation-${index}`,
      memberId: `member-${index}`,
      email: `member-${index}@example.com`,
      displayName: `Member ${index}`,
      role: "user",
      state,
      householdId,
      householdName: "Gatewood Household",
      relationship: "Son",
      moduleAccess: ["money"],
      betaFlagIds: [flagId],
      invitationMessage: null,
      sentAt: "2026-07-26T12:00:00.000Z",
      expiresAt: "2026-07-26T13:00:00.000Z",
      acceptedAt:
        state === "accepted" ? "2026-07-26T12:15:00.000Z" : null,
      revokedAt: state === "revoked" ? "2026-07-26T12:10:00.000Z" : null,
      resendCount: state === "resent" ? 1 : 0,
    })
  );
  const normalized = normalizeBeastAdminInvitationDirectory({
    invitations,
    households: [{ id: householdId, name: "Gatewood Household" }],
  });

  assert.equal(normalized?.invitations.length, 5);
  assert.deepEqual(
    normalized?.invitations.map((invitation) => invitation.state),
    ["sent", "resent", "accepted", "expired", "revoked"]
  );
  assert.equal(normalized?.households[0]?.name, "Gatewood Household");
  assert.equal(normalizeBeastAdminInvitationAction({ action: "resend" }), "resend");
  assert.equal(normalizeBeastAdminInvitationAction({ action: "revoke" }), "revoke");
  assert.equal(normalizeBeastAdminInvitationAction({ action: "delete" }), null);
});

test("BA-108 invite routes preserve one Auth identity and owner audit boundaries", () => {
  const createRoute = readFileSync(
    "src/app/api/admin/invitations/route.ts",
    "utf8"
  );
  const actionRoute = readFileSync(
    "src/app/api/admin/invitations/[invitationId]/route.ts",
    "utf8"
  );

  assert.match(createRoute, /actorProfile\?\.role !== "admin"/);
  assert.match(createRoute, /get_beast_admin_auth_user_id_by_email/);
  assert.match(createRoute, /already belongs to a Beast account/);
  assert.match(createRoute, /auth\.admin\.inviteUserByEmail/);
  assert.match(createRoute, /create_beast_admin_member_invitation/);
  assert.match(createRoute, /auth\.admin\.deleteUser\(authUser\.id\)/);
  assert.match(actionRoute, /auth\.admin\.getUserById/);
  assert.match(actionRoute, /data\.user\.id !== invitation\.member_id/);
  assert.match(actionRoute, /record_beast_admin_invitation_action/);
  assert.match(actionRoute, /ban_duration: "876000h"/);
  assert.match(actionRoute, /ban_duration: "none"/);
});

test("BA-108 presents the requested form and controlled lifecycle actions", () => {
  const panel = readFileSync(
    "src/app/dashboard/admin/members/BeastAdminMemberInvitationPanel.tsx",
    "utf8"
  );
  const workspace = readFileSync(
    "src/app/dashboard/admin/members/BeastAdminMemberTimelineWorkspace.tsx",
    "utf8"
  );

  for (const label of [
    "Email",
    "Display name",
    "Beast role",
    "Household assignment",
    "Relationship",
    "Initial module access",
    "Initial beta assignments",
    "Optional invitation message",
  ]) {
    assert.match(panel, new RegExp(label));
  }
  assert.match(panel, /Invitation sent/);
  assert.match(panel, /Invitation accepted/);
  assert.match(panel, /Invitation expired/);
  assert.match(panel, /Invitation revoked/);
  assert.match(panel, /Invitation resent/);
  assert.match(panel, /window\.confirm/);
  assert.match(panel, /Resend invitation/);
  assert.match(panel, /Revoke invitation/);
  assert.match(workspace, /get_beast_admin_member_invitations/);
  assert.match(workspace, /accountStatusLabels\[member\.accountStatus\]/);
});

test("BA-108 migration persists lifecycle, household, access, and immutable audit evidence", () => {
  const migration = readFileSync(
    "supabase/migrations/20260726001200_add_beast_admin_member_invitations.sql",
    "utf8"
  );

  assert.match(migration, /beast_admin_member_invitations/);
  assert.match(migration, /beast_households/);
  assert.match(migration, /beast_household_memberships/);
  assert.match(migration, /enable row level security/g);
  assert.match(migration, /auth\.role\(\) <> 'service_role'/);
  assert.match(migration, /lower\(auth_user\.email\)/);
  assert.match(migration, /member_id uuid not null unique references auth\.users/);
  assert.match(migration, /invitation_sent/);
  assert.match(migration, /invitation_resent/);
  assert.match(migration, /invitation_revoked/);
  assert.match(migration, /invitation_accepted/);
  assert.match(migration, /grant execute[\s\S]*to service_role/);
  assert.match(migration, /grant execute[\s\S]*to authenticated/);
  assert.doesNotMatch(migration, /grant execute[\s\S]*to anon/);
});

test("BA-108 invitation links use the BeastOS callback and acceptance session", () => {
  const callback = readFileSync("src/app/auth/callback/route.ts", "utf8");
  const acceptPage = readFileSync(
    "src/app/accept-invitation/AcceptInvitationForm.tsx",
    "utf8"
  );
  const template = readFileSync(
    "supabase/auth/templates/invite.html",
    "utf8"
  );
  const config = readFileSync("supabase/config.toml", "utf8");

  assert.equal(
    buildBeastInvitationCallbackUrl(
      "http://localhost:3000",
      "https://thebeast.seangworld.com"
    ),
    "https://thebeast.seangworld.com/auth/callback?flow=invite&next=%2Fdashboard%2Fonboarding"
  );
  assert.match(callback, /requestedType === "invite"/);
  assert.match(callback, /accept_beast_admin_member_invitation/);
  assert.match(callback, /BEAST_INVITATION_COOKIE/);
  assert.match(acceptPage, /auth\.updateUser/);
  assert.match(acceptPage, /One account for the Beast ecosystem/);
  assert.match(template, /\{\{ \.RedirectTo \}\}/);
  assert.match(template, /\{\{ \.TokenHash \}\}/);
  assert.match(template, /type=invite/);
  assert.match(template, /\.Data\.invitation_message/);
  assert.match(config, /\[auth\.email\.template\.invite\]/);
});
