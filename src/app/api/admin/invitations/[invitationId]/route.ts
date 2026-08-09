import { NextResponse } from "next/server";
import {
  buildBeastInvitationCallbackUrl,
  getBeastInvitationErrorMessage,
  normalizeBeastAdminInvitationAction,
  type BeastAdminMemberInvitationResult,
} from "@/lib/beastAdminMemberInvitations";
import { createAdminClient } from "@/lib/supabase/admin";
import { createRouteClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{
    invitationId: string;
  }>;
};

function jsonError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

function invitationExpiryHours() {
  const configured = Number(process.env.BEAST_INVITATION_EXPIRY_HOURS || "1");
  return Number.isInteger(configured) && configured >= 1 && configured <= 168
    ? configured
    : 1;
}

export async function POST(request: Request, { params }: RouteContext) {
  const { invitationId } = await params;
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
    return jsonError("The invitation action is not valid JSON.", 400);
  }

  const action = normalizeBeastAdminInvitationAction(body);
  if (!action) {
    return jsonError("Choose a supported invitation action.", 400);
  }

  const adminClient = createAdminClient();
  if (!adminClient) {
    return jsonError(
      "Server-side Auth administration is not configured.",
      503
    );
  }

  const { data: invitation, error: invitationLookupError } = await adminClient
    .from("beast_admin_member_invitations")
    .select(
      "id,invited_by,member_id,email,display_name,invitation_message,status"
    )
    .eq("id", invitationId)
    .eq("invited_by", actor.id)
    .maybeSingle();

  if (invitationLookupError) {
    return jsonError("BeastAdmin could not load this invitation.", 503);
  }
  if (!invitation) {
    return jsonError("The selected invitation is not available.", 404);
  }
  if (invitation.status === "accepted") {
    return jsonError("Accepted invitations cannot be changed.", 409);
  }
  if (invitation.status === "revoked") {
    return jsonError("Revoked invitations cannot be changed.", 409);
  }

  const { data: authData, error: authError } =
    await adminClient.auth.admin.getUserById(invitation.member_id);
  const authUser = authData?.user;
  if (authError || !authUser) {
    return jsonError("The invited Auth identity is not available.", 404);
  }
  if (authUser.last_sign_in_at) {
    return jsonError(
      "This member has already accepted the invitation. Refresh the directory.",
      409
    );
  }

  let sentAt: Date | null = null;
  let expiresAt: Date | null = null;

  if (action === "resend") {
    sentAt = new Date();
    expiresAt = new Date(
      sentAt.getTime() + invitationExpiryHours() * 60 * 60 * 1000
    );
    const redirectTo = buildBeastInvitationCallbackUrl(
      new URL(request.url).origin,
      process.env.NEXT_PUBLIC_BEAST_SITE_URL
    );
    const { data, error } =
      await adminClient.auth.admin.inviteUserByEmail(invitation.email, {
        redirectTo,
        data: {
          display_name: invitation.display_name,
          invitation_message: invitation.invitation_message,
        },
      });

    if (error) {
      return jsonError(getBeastInvitationErrorMessage(error), 409);
    }
    if (!data.user || data.user.id !== invitation.member_id) {
      return jsonError(
        "Supabase Auth did not preserve the invited member identity. No Beast records were changed.",
        500
      );
    }
  } else {
    const { error } = await adminClient.auth.admin.updateUserById(
      invitation.member_id,
      { ban_duration: "876000h" }
    );
    if (error) {
      return jsonError(
        "Supabase Auth could not revoke this invitation. No Beast records were changed.",
        502
      );
    }
  }

  const { data: persisted, error: persistenceError } = await adminClient.rpc(
    "record_beast_admin_invitation_action",
    {
      selected_actor_id: actor.id,
      selected_invitation_id: invitation.id,
      selected_action: action,
      selected_sent_at: sentAt?.toISOString() || null,
      selected_expires_at: expiresAt?.toISOString() || null,
    }
  );

  if (persistenceError) {
    if (action === "revoke") {
      const { error: rollbackError } =
        await adminClient.auth.admin.updateUserById(invitation.member_id, {
          ban_duration: "none",
        });
      if (rollbackError) {
        return jsonError(
          "The invitation audit failed and Auth access could not be restored. Inspect this account before retrying.",
          500
        );
      }
    }
    return jsonError(
      action === "resend"
        ? "The invitation email was resent, but BeastAdmin could not record the resend. Inspect the invitation before retrying."
        : "The invitation could not be revoked. Auth access was restored.",
      500
    );
  }

  const auditEventId =
    persisted &&
    typeof persisted === "object" &&
    !Array.isArray(persisted) &&
    "auditEventId" in persisted
      ? String(persisted.auditEventId)
      : "";

  if (!auditEventId) {
    return jsonError(
      "The invitation changed, but BeastAdmin could not verify its audit event.",
      500
    );
  }

  const result: BeastAdminMemberInvitationResult = {
    invitationId: invitation.id,
    memberId: invitation.member_id,
    state: action === "resend" ? "resent" : "revoked",
    auditEventId,
    message:
      action === "resend"
        ? `Invitation resent to ${invitation.email}.`
        : `Invitation to ${invitation.email} revoked.`,
  };

  return NextResponse.json(result, {
    headers: { "Cache-Control": "no-store" },
  });
}
