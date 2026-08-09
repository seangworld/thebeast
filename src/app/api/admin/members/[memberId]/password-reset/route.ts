import { NextResponse } from "next/server";
import { normalizeBeastAdminAccountAuditReason } from "@/lib/beastAdminAccountAudit";
import {
  buildPasswordRecoveryCallbackUrl,
  getBeastAuthOrigin,
} from "@/lib/auth/experience";
import { isProtectedBeastAdminAccount } from "@/lib/beastAdminMemberEditing";
import { createAdminClient } from "@/lib/supabase/admin";
import { createRouteClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{
    memberId: string;
  }>;
};

function jsonError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

export async function POST(request: Request, { params }: RouteContext) {
  const { memberId } = await params;
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

  let body: unknown = {};
  try {
    body = await request.json();
  } catch {
    return jsonError("The password-reset request is not valid JSON.", 400);
  }
  const reason =
    body && typeof body === "object" && "reason" in body
      ? normalizeBeastAdminAccountAuditReason(body.reason)
      : null;
  if (reason === undefined) {
    return jsonError("Keep the optional reason under 500 characters.", 400);
  }

  const adminClient = createAdminClient();
  if (!adminClient) {
    return jsonError(
      "Server-side Auth administration is not configured.",
      503
    );
  }

  const [
    { data: authData, error: authError },
    { data: profile, error: profileError },
  ] = await Promise.all([
    adminClient.auth.admin.getUserById(memberId),
    adminClient
      .from("profiles")
      .select("account_kind")
      .eq("id", memberId)
      .maybeSingle(),
  ]);
  const member = authData?.user;
  if (authError || !member) {
    return jsonError("The selected Auth account is not available.", 404);
  }
  if (profileError) {
    return jsonError("The member profile could not be verified.", 503);
  }
  if (
    !profile ||
    isProtectedBeastAdminAccount({
      accountKind: profile.account_kind,
      appMetadata: member.app_metadata,
    })
  ) {
    return jsonError(
      "System, demo, and unmanaged accounts are protected from this action.",
      403
    );
  }
  if (!member.email) {
    return jsonError(
      "This Auth account has no sign-in email for password recovery.",
      409
    );
  }

  const redirectTo = buildPasswordRecoveryCallbackUrl(
    getBeastAuthOrigin(
      new URL(request.url).origin,
      process.env.NEXT_PUBLIC_BEAST_SITE_URL
    ),
    "/dashboard/today"
  );
  const { error: resetError } =
    await adminClient.auth.resetPasswordForEmail(member.email, {
      redirectTo,
    });

  const { data: auditEventId, error: auditError } = await adminClient.rpc(
    "record_beast_admin_account_audit_event",
    {
      selected_actor_id: actor.id,
      selected_member_id: memberId,
      selected_action: "password_reset_triggered",
      selected_previous_value: { resetRequested: false },
      selected_new_value: { resetRequested: !resetError },
      selected_outcome: resetError ? "failed" : "succeeded",
      selected_reason: reason,
      selected_changes: resetError
        ? {
            providerErrorCode:
              typeof resetError.code === "string"
                ? resetError.code
                : "provider_error",
          }
        : {},
    }
  );

  if (auditError || !auditEventId) {
    return jsonError(
      resetError
        ? "The password-reset request failed and BeastAdmin could not record the outcome."
        : "The password-reset email was requested, but BeastAdmin could not record its audit event.",
      500
    );
  }
  if (resetError) {
    return jsonError(
      "Supabase Auth could not send the password-reset email. The failed outcome was recorded.",
      502
    );
  }

  return NextResponse.json(
    {
      auditEventId,
      message:
        "Password-reset email requested. The successful outcome was recorded without storing the link or token.",
    },
    { headers: { "Cache-Control": "no-store" } }
  );
}
