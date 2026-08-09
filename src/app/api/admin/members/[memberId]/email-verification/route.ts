import { NextResponse } from "next/server";
import {
  buildEmailVerificationCallbackUrl,
  getEmailWorkflowErrorMessage,
} from "@/lib/auth/emailWorkflows";
import { getBeastAdminMigrationEnvironment } from "@/lib/beastAdminMigrationStatus";
import { isProtectedBeastAdminAccount } from "@/lib/beastAdminMemberEditing";
import { createAdminClient } from "@/lib/supabase/admin";
import { createRouteClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{
    memberId: string;
  }>;
};

function getEnvironment(request: Request) {
  return getBeastAdminMigrationEnvironment({
    supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
    siteOrigin: new URL(request.url).origin,
    vercelEnvironment: process.env.VERCEL_ENV,
    branch: process.env.VERCEL_GIT_COMMIT_REF,
    nodeEnvironment: process.env.NODE_ENV,
  });
}

function jsonError(
  message: string,
  status: number,
  diagnostic?: Record<string, unknown>
) {
  return NextResponse.json(
    { error: message, ...(diagnostic ? { diagnostic } : {}) },
    { status }
  );
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

  const adminClient = createAdminClient();
  if (!adminClient) {
    return jsonError(
      "Server-side Auth administration is not configured.",
      503
    );
  }

  const [{ data: authData, error: authError }, { data: profile, error: profileError }] =
    await Promise.all([
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

  const pendingEmail = member.new_email?.trim().toLowerCase() || null;
  const currentEmail = member.email?.trim().toLowerCase() || null;
  const targetEmail = pendingEmail || currentEmail;

  if (!targetEmail) {
    return jsonError("This Auth account has no email to verify.", 409);
  }
  if (!pendingEmail && member.email_confirmed_at) {
    return jsonError("This Auth email is already verified.", 409);
  }

  const redirectTo = buildEmailVerificationCallbackUrl(
    new URL(request.url).origin,
    process.env.NEXT_PUBLIC_BEAST_SITE_URL
  );
  const { error: resendError } = await adminClient.auth.resend({
    type: pendingEmail ? "email_change" : "signup",
    email: targetEmail,
    options: { emailRedirectTo: redirectTo },
  });

  if (resendError) {
    const { error: auditError } = await adminClient
      .from("beast_admin_member_account_audit_events")
      .insert({
        actor_id: actor.id,
        member_id: memberId,
        action: "email_verification_resent",
        changes: {
          emailVerification: {
            kind: pendingEmail ? "email_change" : "account",
            providerCode: resendError.code || null,
          },
        },
        outcome: "failed",
        reason: "The authentication provider rejected the verification resend.",
      });
    return jsonError(getEmailWorkflowErrorMessage(resendError), 502, {
      environment: getEnvironment(request),
      providerError: {
        code: resendError.code || "Not provided",
        message: resendError.message,
        status: resendError.status || null,
      },
      auditRecorded: !auditError,
    });
  }

  const { error: auditError } = await adminClient
    .from("beast_admin_member_account_audit_events")
    .insert({
      actor_id: actor.id,
      member_id: memberId,
      action: "email_verification_resent",
      changes: {
        emailVerification: {
          kind: pendingEmail ? "email_change" : "account",
          targetEmail,
        },
      },
    });

  if (auditError) {
    return jsonError(
      "Verification was sent, but BeastAdmin could not record its audit event. Inspect the member before retrying.",
      500
    );
  }

  return NextResponse.json(
    {
      message: pendingEmail
        ? "Email-change verification sent and owner audit recorded."
        : "Account verification sent and owner audit recorded.",
      diagnostic: {
        environment: getEnvironment(request),
        provider: "Supabase Auth",
        verificationType: pendingEmail ? "email_change" : "signup",
        targetEmail,
        result: "sent",
      },
    },
    { headers: { "Cache-Control": "no-store" } }
  );
}
