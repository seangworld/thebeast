#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { parseSupabaseJsonPayload } from "./supabase-output-parser.mjs";

const allowedEnvironments = new Set(["dev", "production"]);
const allowedActions = new Set([
  "bootstrap-dry-run",
  "bootstrap-push",
  "current",
  "link",
  "list",
  "dry-run",
  "push",
  "verify",
  "release-plan",
]);
const productionProjectRef = "grpyzwvgqiwtxadfdtni";
const productionBootstrapPendingVersions = [
  "20260702000000",
  "20260702000100",
  "20260703000000",
  "20260715000100",
  "20260715000200",
  "20260715000300",
  "20260715000400",
  "20260715000500",
  "20260715000600",
];
const approvedCacheSettingsDrop =
  "drop table if exists public.cache_settings";
const args = process.argv.slice(2);
const action = args[0];
const environment = args[1];

function usage(exitCode = 1) {
  console.error(`Usage:
  node scripts/supabase-migration-guard.mjs current
  node scripts/supabase-migration-guard.mjs link <dev|production> --project-ref <ref>
  node scripts/supabase-migration-guard.mjs list <dev|production> --confirm-env <dev|production>
  node scripts/supabase-migration-guard.mjs dry-run <dev|production> --confirm-env <dev|production>
  node scripts/supabase-migration-guard.mjs push <dev|production> --confirm-env <dev|production> --after-dry-run
  node scripts/supabase-migration-guard.mjs bootstrap-dry-run production --confirm-env production
  node scripts/supabase-migration-guard.mjs bootstrap-push production --confirm-env production --after-bootstrap-dry-run --approve-production-bootstrap
  node scripts/supabase-migration-guard.mjs verify <dev|production> --confirm-env <dev|production>
  node scripts/supabase-migration-guard.mjs release-plan
`);
  process.exit(exitCode);
}

function valueAfter(flag) {
  const index = args.indexOf(flag);
  if (index === -1) return undefined;
  return args[index + 1];
}

function hasFlag(flag) {
  return args.includes(flag);
}

function requireKnownAction() {
  if (!allowedActions.has(action)) usage();
}

function requireKnownEnvironment() {
  if (!allowedEnvironments.has(environment)) {
    console.error("Choose the target environment explicitly: dev or production.");
    usage();
  }
}

function requireConfirmation() {
  const confirmed = valueAfter("--confirm-env");
  if (confirmed !== environment) {
    console.error(`Refusing to continue. Add --confirm-env ${environment} to confirm the target environment.`);
    process.exit(1);
  }
}

function runSupabase(commandArgs) {
  const result = spawnSync("npx", ["supabase", ...commandArgs], {
    stdio: "inherit",
    shell: false,
  });

  process.exit(result.status ?? 1);
}

function runSupabaseCaptured(commandArgs) {
  return spawnSync("npx", ["supabase", ...commandArgs], {
    encoding: "utf8",
    shell: false,
  });
}

function getLinkedProjectRef() {
  const projectRefPath = join(process.cwd(), "supabase", ".temp", "project-ref");

  if (!existsSync(projectRefPath)) {
    return null;
  }

  return readFileSync(projectRefPath, "utf8").trim();
}

function getPendingMigrationVersions() {
  const result = runSupabaseCaptured(["migration", "list"]);

  if (result.stdout) process.stdout.write(result.stdout);
  if (result.stderr) process.stderr.write(result.stderr);

  if (result.status !== 0) {
    throw new Error("Unable to list Supabase migrations.");
  }

  const parsed = parseSupabaseJsonPayload(
    `${result.stdout || ""}\n${result.stderr || ""}`,
    "migrations"
  );
  return parsed.migrations
    .filter((migration) => migration.local && !migration.remote)
    .map((migration) => migration.local);
}

function assertExactPendingMigrations() {
  const pending = getPendingMigrationVersions();
  const expected = productionBootstrapPendingVersions;

  if (pending.length !== expected.length) {
    throw new Error(
      `Unexpected pending migration count. Expected ${expected.join(", ")}, got ${pending.join(", ")}.`
    );
  }

  for (let index = 0; index < expected.length; index += 1) {
    if (pending[index] !== expected[index]) {
      throw new Error(
        `Unexpected pending migrations. Expected ${expected.join(", ")}, got ${pending.join(", ")}.`
      );
    }
  }

  return pending;
}

function assertNoUnexpectedDestructiveSql(pendingVersions) {
  const migrationDir = join(process.cwd(), "supabase", "migrations");
  const destructivePatterns = [
    /\bdrop\s+schema\b/i,
    /\bdrop\s+table\b/i,
    /\bdrop\s+column\b/i,
    /\btruncate\b/i,
    /\bdelete\s+from\b/i,
  ];

  for (const version of pendingVersions) {
    const files = spawnSync("find", [migrationDir, "-type", "f", "-name", `${version}_*.sql`], {
      encoding: "utf8",
      shell: false,
    });

    if (files.status !== 0) {
      throw new Error(`Unable to find migration file for ${version}.`);
    }

    const matches = files.stdout.trim().split("\n").filter(Boolean);
    if (matches.length !== 1) {
      throw new Error(`Expected one migration file for ${version}, found ${matches.length}.`);
    }

    const sql = readFileSync(matches[0], "utf8");
    const normalized = sql.toLowerCase().replace(/\s+/g, " ");

    for (const pattern of destructivePatterns) {
      if (!pattern.test(sql)) continue;

      const isApprovedCacheDrop =
        version === "20260715000600" &&
        normalized.includes(approvedCacheSettingsDrop);

      if (!isApprovedCacheDrop) {
        throw new Error(`Disallowed destructive SQL detected in ${matches[0]}.`);
      }
    }
  }
}

function bootstrapMarkerPath() {
  return join(process.cwd(), "supabase", ".temp", "production-bootstrap-dry-run.json");
}

function writeBootstrapDryRunMarker(pendingVersions) {
  const tempDir = join(process.cwd(), "supabase", ".temp");
  mkdirSync(tempDir, { recursive: true });
  writeFileSync(
    bootstrapMarkerPath(),
    JSON.stringify(
      {
        projectRef: productionProjectRef,
        pendingVersions,
        createdAt: new Date().toISOString(),
      },
      null,
      2
    )
  );
}

function requireBootstrapDryRunMarker() {
  const markerPath = bootstrapMarkerPath();

  if (!existsSync(markerPath)) {
    throw new Error("Refusing bootstrap push. Run bootstrap dry-run first.");
  }

  const marker = JSON.parse(readFileSync(markerPath, "utf8"));
  if (
    marker.projectRef !== productionProjectRef ||
    JSON.stringify(marker.pendingVersions) !== JSON.stringify(productionBootstrapPendingVersions)
  ) {
    throw new Error("Refusing bootstrap push. Bootstrap dry-run marker does not match the approved production plan.");
  }
}

function requireProductionBootstrapPreflight() {
  if (environment !== "production") {
    throw new Error("Bootstrap include-all commands are production-only.");
  }

  const linkedProjectRef = getLinkedProjectRef();
  if (linkedProjectRef !== productionProjectRef) {
    throw new Error(
      `Refusing production bootstrap. Expected linked project ${productionProjectRef}, got ${linkedProjectRef || "none"}.`
    );
  }

  const pending = assertExactPendingMigrations();
  assertNoUnexpectedDestructiveSql(pending);
  return pending;
}

function printReleasePlan() {
  console.log(`Safe Supabase release sequence:

1. Link DEV
   npm run supabase:link:dev -- --project-ref <DEV_PROJECT_REF>
   npm run supabase:current

2. List and dry-run DEV
   npm run supabase:list:dev
   npm run supabase:dry-run:dev

3. Push DEV after reviewing dry-run
   npm run supabase:push:dev -- --after-dry-run

4. Validate application locally
   npm test
   npm run lint
   npx tsc --noEmit
   npm run build

5. Link PRODUCTION
   npm run supabase:link:production -- --project-ref <PRODUCTION_PROJECT_REF>
   npm run supabase:current

6. List and dry-run PRODUCTION
   npm run supabase:list:production
   npm run supabase:dry-run:production

7. Push PRODUCTION after reviewing dry-run
   npm run supabase:push:production -- --after-dry-run

8. Verify PRODUCTION
   npm run supabase:verify:production

9. Return local link to DEV
   npm run supabase:link:dev -- --project-ref <DEV_PROJECT_REF>
   npm run supabase:current
`);
}

function showCurrentLink() {
  const projectRefPath = join(process.cwd(), "supabase", ".temp", "project-ref");

  if (!existsSync(projectRefPath)) {
    console.log("No local Supabase project link found at supabase/.temp/project-ref.");
    console.log("Run an explicit link command for dev or production before listing, dry-running, or pushing.");
    return;
  }

  const projectRef = readFileSync(projectRefPath, "utf8").trim();
  console.log(`Current local Supabase project ref: ${projectRef}`);
  console.log("Verify this project ref belongs to the intended environment before running migration commands.");
}

requireKnownAction();

if (action === "current") {
  showCurrentLink();
  process.exit(0);
}

if (action === "release-plan") {
  printReleasePlan();
  process.exit(0);
}

requireKnownEnvironment();

if (action === "link") {
  const projectRef = valueAfter("--project-ref");

  if (!projectRef) {
    console.error("Refusing to link without an explicit --project-ref value.");
    process.exit(1);
  }

  console.log(`Linking Supabase CLI to ${environment}: ${projectRef}`);
  console.log("No database password is stored by this script.");
  runSupabase(["link", "--project-ref", projectRef]);
}

requireConfirmation();

if (action === "list") {
  runSupabase(["migration", "list"]);
}

if (action === "dry-run") {
  runSupabase(["db", "push", "--dry-run"]);
}

if (action === "bootstrap-dry-run") {
  try {
    const pending = requireProductionBootstrapPreflight();
    console.log(`Approved production bootstrap pending migrations: ${pending.join(", ")}`);
    const result = runSupabaseCaptured(["db", "push", "--dry-run", "--include-all"]);

    if (result.stdout) process.stdout.write(result.stdout);
    if (result.stderr) process.stderr.write(result.stderr);

    if (result.status !== 0) {
      process.exit(result.status ?? 1);
    }

    writeBootstrapDryRunMarker(pending);
    process.exit(0);
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

if (action === "bootstrap-push") {
  try {
    requireProductionBootstrapPreflight();
    requireBootstrapDryRunMarker();

    if (!hasFlag("--after-bootstrap-dry-run") || !hasFlag("--approve-production-bootstrap")) {
      throw new Error(
        "Refusing bootstrap push. Add --after-bootstrap-dry-run and --approve-production-bootstrap."
      );
    }

    runSupabase(["db", "push", "--include-all"]);
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

if (action === "verify") {
  const verificationSql = `
select jsonb_pretty(jsonb_build_object(
  'required_tables_missing', (
    select coalesce(jsonb_agg(required_table order by required_table), '[]'::jsonb)
    from (
      values
        ('beast_document_module_links'),
        ('beast_documents'),
        ('beast_goal_contributions'),
        ('beast_goal_lifecycle_events'),
        ('beast_goal_milestones'),
        ('beast_goal_recommendations'),
        ('beast_goal_references'),
        ('beast_goal_support_items'),
        ('beast_goals'),
        ('bill_events'),
        ('bill_payments'),
        ('cash_settings'),
        ('debt_payments'),
        ('debt_settings'),
        ('debts'),
        ('funding_sources'),
        ('income_events'),
        ('learning_achievements'),
        ('learning_activities'),
        ('learning_certificates'),
        ('learning_courses'),
        ('learning_feedback'),
        ('learning_goals'),
        ('learning_history'),
        ('learning_mastery'),
        ('learning_parent_links'),
        ('learning_plans'),
        ('learning_profiles'),
        ('learning_progress'),
        ('learning_sessions'),
        ('learning_study_habits'),
        ('profiles'),
        ('subscriptions'),
        ('velocity_settings')
    ) as required(required_table)
    where to_regclass('public.' || required_table) is null
  ),
  'cache_settings', to_regclass('public.cache_settings')::text,
  'user_settings', to_regclass('public.user_settings')::text,
  'income_activity_flags', (
    select coalesce(jsonb_agg(column_name order by column_name), '[]'::jsonb)
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'income_events'
      and column_name in ('is_active', 'is_archived')
  ),
  'settings_user_id_unique_indexes', (
    select coalesce(jsonb_agg(table_name order by table_name), '[]'::jsonb)
    from (
      select t.relname as table_name
      from pg_index i
      join pg_class t on t.oid = i.indrelid
      join pg_namespace n on n.oid = t.relnamespace
      where n.nspname = 'public'
        and t.relname in ('cash_settings', 'debt_settings')
        and i.indisunique
        and (
          select array_agg(a.attname order by k.ordinality)
          from unnest(i.indkey) with ordinality as k(attnum, ordinality)
          join pg_attribute a
            on a.attrelid = t.oid
           and a.attnum = k.attnum
        ) = array['user_id'::name]
    ) unique_settings
  )
)) as beast_schema_verification;
`;
  runSupabase(["db", "query", "--linked", verificationSql]);
}

if (action === "push") {
  if (!hasFlag("--after-dry-run")) {
    console.error("Refusing to push. Run and review dry-run first, then add --after-dry-run.");
    process.exit(1);
  }

  console.log(`Pushing migrations to ${environment}. Confirm the linked project one more time before approving CLI prompts.`);
  runSupabase(["db", "push"]);
}
