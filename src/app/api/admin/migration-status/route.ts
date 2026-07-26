import { NextResponse } from "next/server";
import {
  buildBeastAdminMigrationStatusSnapshot,
  getBeastAdminMigrationEnvironment,
  normalizeBeastAdminDatabaseMigrationSnapshot,
} from "@/lib/beastAdminMigrationStatus";
import { createRouteClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function jsonError(
  message: string,
  status: number,
  diagnostic?: Record<string, unknown>
) {
  return NextResponse.json(
    { error: message, diagnostic: diagnostic || null },
    {
      status,
      headers: {
        "cache-control": "private, no-cache, no-store, must-revalidate",
      },
    }
  );
}

function safeDatabaseError(error: {
  code?: string;
  message?: string;
  details?: string;
  hint?: string;
}) {
  const clean = (value: string | undefined) =>
    value?.replace(/\s+/g, " ").trim().slice(0, 500) || null;
  return {
    code: clean(error.code),
    message: clean(error.message),
    details: clean(error.details),
    hint: clean(error.hint),
  };
}

function requestSiteOrigin(request: Request) {
  const configured = process.env.NEXT_PUBLIC_BEAST_SITE_URL?.trim();
  if (configured) {
    try {
      return new URL(configured).origin;
    } catch {
      // Fall back to the actual protected request origin.
    }
  }
  return new URL(request.url).origin;
}

export async function GET(request: Request) {
  const supabase = createRouteClient();
  const {
    data: { user },
    error: authenticationError,
  } = await supabase.auth.getUser();

  if (authenticationError || !user) {
    return jsonError("Authentication required.", 401);
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();
  if (profileError) {
    return jsonError(
      "Migration Status could not verify owner access.",
      503
    );
  }
  if (profile?.role !== "admin") {
    return jsonError("BeastAdmin owner access required.", 403);
  }

  const environment = getBeastAdminMigrationEnvironment({
    supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
    siteOrigin: requestSiteOrigin(request),
    vercelEnvironment: process.env.VERCEL_ENV,
    branch: process.env.VERCEL_GIT_COMMIT_REF,
    nodeEnvironment: process.env.NODE_ENV,
  });
  const { data, error: migrationError } = await supabase.rpc(
    "get_beast_admin_migration_status"
  );

  if (migrationError) {
    const databaseError = safeDatabaseError(migrationError);
    return jsonError(
      "Migration Status could not read the authoritative database history.",
      /permission|owner access|required|42501/i.test(
        migrationError.message || ""
      )
        ? 403
        : 503,
      {
        kind:
          migrationError.code === "PGRST202"
            ? "diagnostic_rpc_unavailable"
            : "database_history_unavailable",
        projectRef: environment.projectRef,
        expectedObject: "public.get_beast_admin_migration_status()",
        requiredMigration:
          "20260726001500_add_beast_admin_migration_status.sql",
        actualError: databaseError,
      }
    );
  }

  const databaseSnapshot =
    normalizeBeastAdminDatabaseMigrationSnapshot(data);
  if (!databaseSnapshot) {
    return jsonError(
      "Migration Status received an invalid database-history response.",
      503,
      {
        kind: "invalid_database_history",
        projectRef: environment.projectRef,
        expectedObject: "public.get_beast_admin_migration_status()",
      }
    );
  }

  const { error: executiveMetricsError } = await supabase.rpc(
    "get_beast_admin_executive_metrics",
    { window_days: 7 }
  );
  const snapshot = buildBeastAdminMigrationStatusSnapshot({
    databaseSnapshot,
    environment,
    actualErrors: executiveMetricsError
      ? { executive_metrics: executiveMetricsError }
      : {},
  });

  return NextResponse.json(snapshot, {
    headers: {
      "cache-control": "private, no-cache, no-store, must-revalidate",
    },
  });
}
