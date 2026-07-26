import { NextResponse } from "next/server";
import {
  beastAdminAccountAuditActions,
  normalizeBeastAdminAccountAuditSnapshot,
  type BeastAdminAccountAuditAction,
} from "@/lib/beastAdminAccountAudit";
import { createRouteClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function jsonError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

function parseDate(value: string | null) {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed.toISOString();
}

export async function GET(request: Request) {
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

  const url = new URL(request.url);
  const memberId = url.searchParams.get("memberId")?.trim() || null;
  const action = url.searchParams.get("action")?.trim() || null;
  const dateFrom = parseDate(url.searchParams.get("dateFrom"));
  const dateTo = parseDate(url.searchParams.get("dateTo"));
  if (
    (memberId && !uuidPattern.test(memberId)) ||
    (action &&
      !beastAdminAccountAuditActions.includes(
        action as BeastAdminAccountAuditAction
      )) ||
    dateFrom === undefined ||
    dateTo === undefined ||
    (dateFrom &&
      dateTo &&
      new Date(dateTo).getTime() <= new Date(dateFrom).getTime())
  ) {
    return jsonError("Review the audit-log filters and try again.", 400);
  }

  const { data, error } = await routeClient.rpc(
    "get_beast_admin_account_audit_log",
    {
      selected_member_id: memberId,
      selected_action: action,
      selected_date_from: dateFrom,
      selected_date_to: dateTo,
      event_limit: 200,
    }
  );
  if (error) {
    return /permission|owner access|required|42501/i.test(error.message)
      ? jsonError("BeastAdmin owner access required.", 403)
      : jsonError("BeastAdmin could not load the account audit log.", 503);
  }

  const snapshot = normalizeBeastAdminAccountAuditSnapshot(data);
  if (!snapshot) {
    return jsonError(
      "BeastAdmin received an invalid account audit log.",
      503
    );
  }

  return NextResponse.json(snapshot, {
    headers: {
      "cache-control": "private, no-cache, no-store, must-revalidate",
    },
  });
}
