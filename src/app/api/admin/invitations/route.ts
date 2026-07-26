import { NextResponse } from "next/server";
import {
  buildBeastInvitationCallbackUrl,
  getBeastInvitationErrorMessage,
  normalizeBeastAdminMemberInvitationRequest,
  type BeastAdminMemberInvitationResult,
} from "@/lib/beastAdminMemberInvitations";
import { createAdminClient } from "@/lib/supabase/admin";
import { createRouteClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

function jsonError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

function invitationExpiryHours() {
  const configured = Number(process.env.BEAST_INVITATION_EXPIRY_HOURS || "1");
  return Number.isInteger(configured) && configured >= 1 && configured <= 168
    ? configured
    : 1;
}

export async function POST(request: Request) {
  const routeClient = createRouteClient();
  const {
    data: { user: actor },
    error: authenticationError,
  } = await routeClient.auth.getUser();

  if (authenticationError || !actor) {
    return jsonError("Authentication required.", 401);
  }

  const { data: actorProfile, error: actorProfileError } = await routeClient
    .from("profiles")
    .select("role")
    .eq("id", actor.id)
    .maybeSingle();

  if (actorProfileError) {
    return jsonError("BeastAdmin could not verify owner access.", 503);
  }
  if (actorProfile?.role !== "admin") {
    return jsonError("BeastAdmin owner access required.", 403);
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError("The invitation request is not valid JSON.", 400);
  }

  const invitation = normalizeBeastAdminMemberInvitationRequest(body);
  if (!invitation) {
    return jsonError("Review the invitation fields and try again.", 400);
  }

  const adminClient = createAdminClient();
  if (!adminClient) {
    return jsonError(
      "Server-side Auth administration is not configured.",
      503
    );
  }

  const { data: existingMemberId, error: existingMemberError } =
    await adminClient.rpc("get_beast_admin_auth_user_id_by_email", {
      selected_email: invitation.email,
    });

  if (existingMemberError) {
    return jsonError(
      "BeastAdmin could not verify whether this email already has an account.",
      503
    );
  }
  if (existingMemberId) {
    return jsonError(
      "That email already belongs to a Beast account. Open the existing member instead.",
      409
    );
  }

  if (invitation.householdId) {
    const { data: household, error: householdError } = await adminClient
      .from("beast_households")
      .select("id")
      .eq("id", invitation.householdId)
      .eq("owner_id", actor.id)
      .maybeSingle();

    if (householdError || !household) {
      return jsonError("The selected household is not available.", 400);
    }
  }

  if (invitation.betaFlagIds.length) {
    const { data: flags, error: flagsError } = await adminClient
      .from("beast_admin_feature_flags")
      .select("id")
      .eq("owner_id", actor.id)
      .in("id", invitation.betaFlagIds);

    if (flagsError || (flags || []).length !== invitation.betaFlagIds.length) {
      return jsonError("One or more beta assignments are not available.", 400);
    }
  }

  const sentAt = new Date();
  const expiresAt = new Date(
    sentAt.getTime() + invitationExpiryHours() * 60 * 60 * 1000
  );
  const redirectTo = buildBeastInvitationCallbackUrl(
    new URL(request.url).origin,
    process.env.NEXT_PUBLIC_BEAST_SITE_URL
  );
  const { data: authData, error: invitationError } =
    await adminClient.auth.admin.inviteUserByEmail(invitation.email, {
      redirectTo,
      data: {
        display_name: invitation.displayName,
        invitation_message: invitation.invitationMessage,
      },
    });
  const authUser = authData?.user;

  if (invitationError || !authUser) {
    return jsonError(getBeastInvitationErrorMessage(invitationError), 409);
  }

  const { data: persisted, error: persistenceError } = await adminClient.rpc(
    "create_beast_admin_member_invitation",
    {
      selected_actor_id: actor.id,
      selected_member_id: authUser.id,
      selected_email: invitation.email,
      selected_display_name: invitation.displayName,
      selected_role: invitation.role,
      selected_household_id: invitation.householdId,
      selected_relationship: invitation.relationship,
      selected_module_ids: invitation.moduleAccess,
      selected_beta_flag_ids: invitation.betaFlagIds,
      selected_invitation_message: invitation.invitationMessage,
      selected_sent_at: sentAt.toISOString(),
      selected_expires_at: expiresAt.toISOString(),
    }
  );

  if (persistenceError) {
    const { error: rollbackError } =
      await adminClient.auth.admin.deleteUser(authUser.id);
    if (rollbackError) {
      return jsonError(
        "The invitation email was sent, but member setup and Auth rollback failed. Inspect this account before retrying.",
        500
      );
    }
    return jsonError(
      "The invitation could not be saved, so the newly created Auth identity was removed. Retry when the database is available.",
      500
    );
  }

  const invitationId =
    persisted &&
    typeof persisted === "object" &&
    !Array.isArray(persisted) &&
    "invitationId" in persisted
      ? String(persisted.invitationId)
      : "";
  const auditEventId =
    persisted &&
    typeof persisted === "object" &&
    !Array.isArray(persisted) &&
    "auditEventId" in persisted
      ? String(persisted.auditEventId)
      : "";

  if (!invitationId || !auditEventId) {
    return jsonError(
      "The invitation was sent, but BeastAdmin could not verify its lifecycle and audit records.",
      500
    );
  }

  const result: BeastAdminMemberInvitationResult = {
    invitationId,
    memberId: authUser.id,
    state: "sent",
    auditEventId,
    message: `Invitation sent to ${invitation.email}.`,
  };

  return NextResponse.json(result, {
    status: 201,
    headers: { "Cache-Control": "no-store" },
  });
}
