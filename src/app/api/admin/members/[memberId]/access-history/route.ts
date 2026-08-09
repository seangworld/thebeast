import { NextResponse } from "next/server";
import {
  normalizeBeastAdminAccountAccessAction,
  normalizeBeastAdminAccountAccessSnapshot,
} from "@/lib/beastAdminAccountAccess";
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

async function requireOwner() {
  const routeClient = createRouteClient();
  const {
    data: { user: actor },
    error: authenticationError,
  } = await routeClient.auth.getUser();
  if (authenticationError || !actor) {
    return { error: jsonError("Authentication required.", 401) };
  }

  const { data: actorProfile, error: actorProfileError } = await routeClient
    .from("profiles")
    .select("role")
    .eq("id", actor.id)
    .maybeSingle();
  if (actorProfileError) {
    return {
      error: jsonError("BeastAdmin could not verify owner access.", 503),
    };
  }
  if (actorProfile?.role !== "admin") {
    return {
      error: jsonError("BeastAdmin owner access required.", 403),
    };
  }

  return { actor, routeClient };
}

export async function GET(_request: Request, { params }: RouteContext) {
  const { memberId } = await params;
  const owner = await requireOwner();
  if ("error" in owner) return owner.error;

  const { data, error } = await owner.routeClient.rpc(
    "get_beast_admin_member_access_history",
    {
      selected_member_id: memberId,
      event_limit: 100,
    }
  );
  if (error) {
    if (/not available|P0002/i.test(error.message)) {
      return jsonError("The selected Auth account is not available.", 404);
    }
    return jsonError(
      "BeastAdmin could not load authentication history.",
      503
    );
  }

  const snapshot = normalizeBeastAdminAccountAccessSnapshot(data);
  if (!snapshot) {
    return jsonError(
      "BeastAdmin received invalid authentication history.",
      503
    );
  }

  return NextResponse.json(snapshot, {
    headers: {
      "cache-control": "private, no-cache, no-store, must-revalidate",
    },
  });
}

export async function POST(request: Request, { params }: RouteContext) {
  const { memberId } = await params;
  const owner = await requireOwner();
  if ("error" in owner) return owner.error;

  let requestBody: unknown;
  try {
    requestBody = await request.json();
  } catch {
    return jsonError("The authentication action is not valid JSON.", 400);
  }

  const action = normalizeBeastAdminAccountAccessAction(requestBody);
  if (!action) {
    return jsonError(
      "Choose a supported authentication action and provide a review reason when required.",
      400
    );
  }

  const adminClient = createAdminClient();
  if (!adminClient) {
    return jsonError(
      "Server-side Auth administration is not configured.",
      503
    );
  }

  const { data: targetData, error: targetError } =
    await adminClient.auth.admin.getUserById(memberId);
  if (targetError || !targetData.user) {
    return jsonError("The selected Auth account is not available.", 404);
  }

  const { data: result, error: actionError } = await adminClient.rpc(
    "apply_beast_admin_member_auth_control",
    {
      selected_actor_id: owner.actor.id,
      selected_member_id: memberId,
      selected_action: action.action,
      selected_reason: action.reason,
    }
  );
  if (actionError) {
    if (/managed member|P0002/i.test(actionError.message)) {
      return jsonError(
        "Session controls are unavailable for protected, demo, or unmanaged accounts.",
        403
      );
    }
    if (/invalid|required|22023/i.test(actionError.message)) {
      return jsonError(
        "Review the authentication action and try again.",
        400
      );
    }
    return jsonError(
      "BeastAdmin could not complete the authentication action. The current control state was preserved.",
      503
    );
  }

  const messages = {
    revoke_sessions:
      "Every current BeastOS session now requires a fresh sign-in. Supabase Auth will perform global sign-out when a current session next reaches BeastOS; existing access tokens still expire on the provider’s normal schedule.",
    require_fresh_sign_in:
      "A fresh sign-in is now required across BeastOS.",
    flag_suspicious:
      "Authentication activity was flagged for owner review.",
    clear_suspicious:
      "The authentication activity review flag was cleared.",
  };

  return NextResponse.json({
    result,
    message: messages[action.action],
  });
}
