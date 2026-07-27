import { NextResponse } from "next/server";
import {
  BEAST_VERIFICATION_REMINDER_SUBJECT,
  canCreateBeastEmailVerificationException,
} from "@/lib/beastEmailVerificationPolicy";
import { getBeastAdminMigrationEnvironment } from "@/lib/beastAdminMigrationStatus";
import { createRouteClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type RouteContext = {
  params: {
    memberId: string;
  };
};

type OutreachAction =
  | {
      action: "send_reminder";
    }
  | {
      action: "add_exception" | "remove_exception";
      policyKey?: string;
      expiresAt?: string;
      reason?: string;
    };

function environmentForRequest(request: Request) {
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
  request: Request,
  technicalError?: { code?: string | null; message?: string | null }
) {
  return NextResponse.json(
    {
      error: message,
      diagnostic: {
        environment: environmentForRequest(request),
        ...(technicalError
          ? {
              databaseError: {
                code: technicalError.code || "Not provided",
                message: technicalError.message || "Not provided",
              },
            }
          : {}),
      },
    },
    { status }
  );
}

export async function POST(request: Request, { params }: RouteContext) {
  const routeClient = createRouteClient();
  const {
    data: { user: actor },
    error: authenticationError,
  } = await routeClient.auth.getUser();
  if (authenticationError || !actor) {
    return jsonError("Authentication required.", 401, request);
  }

  const { data: actorProfile, error: actorProfileError } = await routeClient
    .from("profiles")
    .select("role")
    .eq("id", actor.id)
    .maybeSingle();
  if (actorProfileError) {
    return jsonError(
      "BeastAdmin could not verify owner access.",
      503,
      request,
      actorProfileError
    );
  }
  if (actorProfile?.role !== "admin") {
    return jsonError("BeastAdmin owner access required.", 403, request);
  }

  const payload: unknown = await request.json().catch(() => null);
  if (
    !payload ||
    typeof payload !== "object" ||
    !("action" in payload) ||
    typeof payload.action !== "string"
  ) {
    return jsonError("Choose a supported verification action.", 400, request);
  }
  const action = payload as OutreachAction;

  if (action.action === "send_reminder") {
    const { error } = await routeClient.rpc(
      "send_beast_admin_verification_reminder",
      { selected_member_id: params.memberId }
    );
    if (error) {
      const status = /permission|owner access|required|42501/i.test(
        error.message
      )
        ? 403
        : /unverified individual Beast member|invalid|22023/i.test(
              `${error.message} ${error.code || ""}`
            )
          ? 409
          : 503;
      return jsonError(
        status === 409
          ? "A private reminder can only be sent to an unverified individual Beast member."
          : "BeastAdmin could not send the private verification reminder.",
        status,
        request,
        error
      );
    }

    return NextResponse.json(
      {
        message:
          "Private verification reminder sent. The member must still use the official Supabase verification email.",
        subject: BEAST_VERIFICATION_REMINDER_SUBJECT,
        diagnostic: {
          environment: environmentForRequest(request),
          delivery: "BeastOS private Admin messaging",
          verifiesEmail: false,
        },
      },
      {
        headers: {
          "cache-control": "private, no-cache, no-store, must-revalidate",
        },
      }
    );
  }

  if (
    action.action !== "add_exception" &&
    action.action !== "remove_exception"
  ) {
    return jsonError("Choose a supported verification action.", 400, request);
  }

  const policyKey = action.policyKey?.trim() || "";
  if (!canCreateBeastEmailVerificationException(policyKey)) {
    return jsonError(
      "No owner-approved verification exception policy exists for this feature. BeastAdmin did not change member access.",
      409,
      request
    );
  }

  const expiresAt =
    action.action === "remove_exception"
      ? new Date(Date.now() + 60_000).toISOString()
      : action.expiresAt || "";
  const { data, error } = await routeClient.rpc(
    "set_beast_admin_email_verification_exception",
    {
      selected_member_id: params.memberId,
      selected_policy_key: policyKey,
      selected_expires_at: expiresAt,
      selected_reason: action.reason || "Owner removed the exception.",
      selected_remove: action.action === "remove_exception",
    }
  );
  if (error) {
    return jsonError(
      "BeastAdmin could not update the verification exception.",
      /permission|owner access|required|42501/i.test(error.message) ? 403 : 503,
      request,
      error
    );
  }

  return NextResponse.json(
    {
      message:
        action.action === "remove_exception"
          ? "Temporary verification exception removed."
          : "Temporary verification exception added.",
      exception: data,
      diagnostic: {
        environment: environmentForRequest(request),
      },
    },
    {
      headers: {
        "cache-control": "private, no-cache, no-store, must-revalidate",
      },
    }
  );
}
