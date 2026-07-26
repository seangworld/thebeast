import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { NextResponse } from "next/server";
import {
  inspectBeastAdminMigrationSql,
  type BeastAdminMigrationSqlMetadata,
} from "@/lib/beastAdminMigrationSqlExplorer";
import {
  beastAdminRepositoryMigrationFiles,
  buildBeastAdminMigrationInventory,
  getBeastAdminMigrationEnvironment,
  normalizeBeastAdminDatabaseMigrationSnapshot,
  type BeastAdminMigrationState,
} from "@/lib/beastAdminMigrationStatus";
import { createRouteClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const migrationDirectory = join(process.cwd(), "supabase", "migrations");

function jsonError(message: string, status: number) {
  return NextResponse.json(
    { error: message },
    {
      status,
      headers: {
        "cache-control": "private, no-cache, no-store, must-revalidate",
      },
    }
  );
}

function requestSiteOrigin(request: Request) {
  const configured = process.env.NEXT_PUBLIC_BEAST_SITE_URL?.trim();
  if (configured) {
    try {
      return new URL(configured).origin;
    } catch {
      // Fall back to the protected request origin.
    }
  }
  return new URL(request.url).origin;
}

function cleanDatabaseError(error: {
  code?: string;
  message?: string;
}) {
  const code = error.code?.replace(/\s+/g, " ").trim().slice(0, 80);
  const message = error.message
    ?.replace(/\s+/g, " ")
    .trim()
    .slice(0, 400);
  return [code, message].filter(Boolean).join(" · ");
}

async function readMigrationSql(filename: string) {
  return readFile(join(migrationDirectory, filename), "utf8");
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
      "Migration SQL Explorer could not verify owner access.",
      503
    );
  }
  if (profile?.role !== "admin") {
    return jsonError("BeastAdmin owner access required.", 403);
  }

  const requestUrl = new URL(request.url);
  const requestedFilename =
    requestUrl.searchParams.get("filename") ||
    beastAdminRepositoryMigrationFiles.at(-1) ||
    "";
  if (
    !beastAdminRepositoryMigrationFiles.includes(
      requestedFilename as (typeof beastAdminRepositoryMigrationFiles)[number]
    )
  ) {
    return jsonError("Migration filename is not in the repository registry.", 400);
  }

  let selectedSql: string;
  try {
    selectedSql = await readMigrationSql(requestedFilename);
  } catch {
    return jsonError(
      "The selected repository migration source is unavailable.",
      503
    );
  }

  if (requestUrl.searchParams.get("format") === "source") {
    return new Response(selectedSql, {
      status: 200,
      headers: {
        "content-type": "text/plain; charset=utf-8",
        "cache-control": "private, no-cache, no-store, must-revalidate",
        "content-disposition": `inline; filename="${requestedFilename}"`,
      },
    });
  }

  const environment = getBeastAdminMigrationEnvironment({
    supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
    siteOrigin: requestSiteOrigin(request),
    vercelEnvironment: process.env.VERCEL_ENV,
    branch: process.env.VERCEL_GIT_COMMIT_REF,
    nodeEnvironment: process.env.NODE_ENV,
  });
  const { data: databaseData, error: databaseError } = await supabase.rpc(
    "get_beast_admin_migration_status"
  );
  const databaseSnapshot =
    normalizeBeastAdminDatabaseMigrationSnapshot(databaseData);
  const inventory = databaseSnapshot
    ? buildBeastAdminMigrationInventory({
        repositoryFiles: beastAdminRepositoryMigrationFiles,
        databaseMigrations: databaseSnapshot.migrations,
        historyAvailable: databaseSnapshot.historySource.available,
      })
    : null;
  const stateByFilename = new Map<string, BeastAdminMigrationState>(
    inventory?.migrations.map((migration) => [
      migration.filename,
      migration.state,
    ]) || []
  );
  const expectedObjectsByMigration = new Map<string, string[]>();
  for (const object of databaseSnapshot?.objects || []) {
    const current =
      expectedObjectsByMigration.get(object.requiredMigration) || [];
    current.push(object.identity);
    expectedObjectsByMigration.set(object.requiredMigration, current);
  }

  let migrations: BeastAdminMigrationSqlMetadata[];
  try {
    migrations = await Promise.all(
      beastAdminRepositoryMigrationFiles.map(async (filename) =>
        inspectBeastAdminMigrationSql({
          filename,
          sql:
            filename === requestedFilename
              ? selectedSql
              : await readMigrationSql(filename),
          environmentState: stateByFilename.get(filename) || "unknown",
          expectedObjects: expectedObjectsByMigration.get(filename),
        })
      )
    );
  } catch {
    return jsonError(
      "One or more repository migration sources could not be inspected.",
      503
    );
  }

  const selectedMetadata = migrations.find(
    (migration) => migration.filename === requestedFilename
  );
  if (!selectedMetadata) {
    return jsonError("The selected migration could not be inspected.", 503);
  }

  const statusFailure = databaseError
    ? cleanDatabaseError(databaseError)
    : !databaseSnapshot
      ? "Migration Status returned an invalid database response."
      : "";
  return NextResponse.json(
    {
      generatedAt: new Date().toISOString(),
      environment,
      environmentStatusAvailable: Boolean(databaseSnapshot),
      environmentStatusMessage: databaseSnapshot
        ? `Compared with ${databaseSnapshot.historySource.schema}.${databaseSnapshot.historySource.table}.`
        : `Environment status unavailable. ${statusFailure}`.trim(),
      migrations,
      selectedMigration: {
        ...selectedMetadata,
        sql: selectedSql,
        sourceUrl: `/api/admin/migration-sql-explorer?filename=${encodeURIComponent(
          requestedFilename
        )}&format=source`,
      },
    },
    {
      headers: {
        "cache-control": "private, no-cache, no-store, must-revalidate",
      },
    }
  );
}
