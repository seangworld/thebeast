import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const root = process.cwd();
const migrationsDir = join(root, "supabase", "migrations");
const docsPath = join(root, "docs", "SUPABASE_MIGRATIONS.md");
const packageJsonPath = join(root, "package.json");
const guardScriptPath = join(root, "scripts", "supabase-migration-guard.mjs");
const parserPath = join(root, "scripts", "supabase-output-parser.mjs");

const expectedCliMigrations = [
  "20260531000000_dev_schema.sql",
  "20260602000000_add_assignment_columns.sql",
  "20260628000000_add_profiles.sql",
  "20260628000100_add_velocity_settings.sql",
  "20260702000000_add_subscriptions.sql",
  "20260702000100_subscription_billing_customer_updates.sql",
  "20260703000000_add_income_activity_flags.sql",
  "20260703000100_add_profile_identity_fields.sql",
  "20260704000000_add_beastlearning_private_beta.sql",
  "20260705000000_fix_learning_feedback_rls.sql",
  "20260706000000_add_learning_courses_and_activities.sql",
  "20260706000100_add_profile_learning_context.sql",
  "20260713000000_add_learning_session_outcomes.sql",
  "20260714000000_add_beast_goals.sql",
  "20260714000100_add_beast_goal_milestones.sql",
  "20260714000200_add_beast_documents.sql",
  "20260715000000_add_beast_goal_support_items.sql",
  "20260715000100_add_beast_goal_references.sql",
  "20260715000200_add_beast_goal_contributions.sql",
  "20260715000300_add_beast_goal_recommendations.sql",
  "20260715000400_add_beast_goal_lifecycle_events.sql",
  "20260715000500_add_beast_document_module_links.sql",
  "20260715000600_reconcile_canonical_runtime_schema.sql",
  "20260715000700_add_beast_document_storage_bucket.sql",
  "20260715000800_add_beast_document_organization.sql",
  "20260715000900_add_beast_document_access_grants.sql",
  "20260715001000_add_beast_document_calendar_links.sql",
  "20260718000100_add_retirement_scenarios.sql",
  "20260718000200_add_retirement_timeline_reports.sql",
  "20260721000100_add_payment_automation_preferences.sql",
  "20260721000200_link_velocity_to_canonical_debt.sql",
  "20260722000100_add_agent_conversations_and_memory.sql",
  "20260723000100_add_payment_configuration.sql",
  "20260724000000_add_learning_course_lifecycle.sql",
  "20260724000100_fix_learning_course_lifecycle_schema.sql",
  "20260724000200_add_education_profiles.sql",
  "20260724000300_add_guidance_discovery_profile_fields.sql",
  "20260726000000_add_beast_admin_product_roadmap.sql",
  "20260726000100_add_beast_admin_ai_analytics.sql",
  "20260726000200_add_beast_admin_member_timeline.sql",
  "20260726000300_add_beast_admin_beta_feedback.sql",
  "20260726000400_add_beast_admin_feature_flags.sql",
  "20260726000500_add_beast_admin_prompt_library.sql",
  "20260726000600_add_beast_admin_release_center.sql",
  "20260726000700_add_beast_admin_executive_metrics.sql",
  "20260726000800_add_beast_admin_knowledge_inspector.sql",
  "20260726000900_add_authoritative_beast_admin_member_directory.sql",
  "20260726000950_ensure_beast_admin_updated_at_trigger.sql",
  "20260726001000_add_beast_admin_member_account_editing.sql",
  "20260726001100_add_beast_auth_email_workflows.sql",
  "20260726001200_add_beast_admin_member_invitations.sql",
  "20260726001300_add_beast_admin_account_access_history.sql",
  "20260726001400_add_immutable_beast_admin_account_audit_log.sql",
  "20260726001500_add_beast_admin_migration_status.sql",
  "20260726001600_add_beast_admin_member_usage_summary.sql",
  "20260726001700_add_beast_admin_private_messaging.sql",
  "20260726001800_harden_beast_admin_private_messaging.sql",
  "20260726001900_add_email_verification_outreach_policy.sql",
  "20260726002000_reconcile_beast_auth_email_workflows.sql",
  "20260726002100_reconcile_beast_admin_member_invitations.sql",
  "20260726002200_reconcile_beast_admin_account_access_history.sql",
  "20260728000000_add_execution_history.sql",
  "20260728010000_add_beast_health_foundation.sql",
  "20260728020000_activate_health_advisor.sql",
  "20260801000100_restore_debt_management_workflow.sql",
  "20260801000200_add_google_oauth_connections.sql",
  "20260801000300_track_debt_interest_changes.sql",
  "20260801000400_add_beast_health_discovery.sql",
  "20260801000500_add_health_document_extractions.sql",
  "20260801000600_add_education_career_intelligence.sql",
  "20260801000700_transform_beast_goals_life_planning_hub.sql",
  "20260808000100_add_debt_lifecycle.sql",
  "20260809000100_restore_member_health_record_rls.sql",
  "20260809000200_prepare_member_health_rls.sql",
  "20260809000300_define_member_age_entitlements.sql",
  "20260810000100_add_atomic_financial_commands.sql",
  "20260811000100_add_beastmoney_payment_write_gate.sql",
  "20260821000100_add_beast_hunter_foundation.sql",
  "20260821000200_add_beast_hunter_tracking.sql",
  "20260821000300_complete_beast_hunter_v1.sql",
];

test("Supabase CLI migrations exist in dependency-safe order", () => {
  assert.equal(existsSync(migrationsDir), true);

  const actual = readdirSync(migrationsDir).filter((file) => file.endsWith(".sql"));

  assert.deepEqual(actual, expectedCliMigrations);
});

test("legacy one-off SQL and dev seed files are excluded from CLI migrations", () => {
  const actual = readdirSync(migrationsDir);

  assert.equal(actual.includes("dev_seed_placeholders.sql"), false);
  assert.equal(actual.includes("20260526_add_debt_payment_behavior.sql"), false);
  assert.equal(actual.includes("debt_payments_migration.sql"), false);
});

test("BM-35 timeline and report migration keeps records owner-scoped with RLS", () => {
  const migration = readFileSync(join(migrationsDir, "20260718000200_add_retirement_timeline_reports.sql"), "utf8");
  assert.match(migration, /retirement_timeline_runs/);
  assert.match(migration, /retirement_report_exports/);
  assert.match(migration, /enable row level security/);
  assert.match(migration, /auth\.uid\(\) = owner_id/);
});

test("trigger helpers exist before every reference in the full migration chain", () => {
  const definedFunctions = new Set<string>();

  for (const file of expectedCliMigrations) {
    const sql = readFileSync(join(migrationsDir, file), "utf8");
    const events = [
      ...Array.from(
        sql.matchAll(
          /create\s+(?:or\s+replace\s+)?function\s+public\.([a-z0-9_]+)\s*\(/gi
        ),
        (match) => ({
          kind: "definition" as const,
          name: match[1],
          index: match.index,
        })
      ),
      ...Array.from(
        sql.matchAll(
          /execute\s+(?:function|procedure)\s+public\.([a-z0-9_]+)\s*\(/gi
        ),
        (match) => ({
          kind: "reference" as const,
          name: match[1],
          index: match.index,
        })
      ),
    ].sort((left, right) => left.index - right.index);

    for (const event of events) {
      if (event.kind === "definition") {
        definedFunctions.add(event.name);
      } else {
        assert.equal(
          definedFunctions.has(event.name),
          true,
          `${file} references public.${event.name}() before the migration chain defines it`
        );
      }
    }
  }
});

test("BA-103 updated-at preflight is idempotent and heals partial application", () => {
  const featureFlags = readFileSync(
    join(
      migrationsDir,
      "20260726000400_add_beast_admin_feature_flags.sql"
    ),
    "utf8"
  );
  const correction = readFileSync(
    join(
      migrationsDir,
      "20260726000950_ensure_beast_admin_updated_at_trigger.sql"
    ),
    "utf8"
  );
  const accountEditing = readFileSync(
    join(
      migrationsDir,
      "20260726001000_add_beast_admin_member_account_editing.sql"
    ),
    "utf8"
  );

  assert.ok(
    featureFlags.indexOf(
      "create or replace function public.set_beast_admin_feature_flag_updated_at"
    ) <
      featureFlags.indexOf(
        "execute function public.set_beast_admin_feature_flag_updated_at"
      )
  );
  assert.match(
    correction,
    /create or replace function public\.set_beast_admin_feature_flag_updated_at\(\)/
  );
  assert.match(correction, /security invoker/);
  assert.match(correction, /set search_path = public/);
  assert.match(correction, /new\.updated_at = now\(\)/);
  assert.match(
    correction,
    /to_regclass\('public\.beast_admin_member_module_access'\)/
  );
  assert.match(correction, /drop trigger if exists/);
  assert.match(
    accountEditing,
    /execute function public\.set_beast_admin_feature_flag_updated_at\(\)/
  );
});

test("Supabase migration documentation records stop conditions and bootstrap commands", () => {
  const docs = readFileSync(docsPath, "utf8");

  assert.match(docs, /Forward-Only Canonical Reconciliation/);
  assert.match(docs, /20260715000600_reconcile_canonical_runtime_schema\.sql/);
  assert.match(docs, /npx supabase migration repair --status applied 20260531000000/);
  assert.match(docs, /npm run supabase:dry-run:production/);
});

test("Supabase command scripts require explicit environments and dry-run acknowledgement", () => {
  const packageJson = JSON.parse(readFileSync(packageJsonPath, "utf8"));
  const guardScript = readFileSync(guardScriptPath, "utf8");

  assert.equal(packageJson.scripts["supabase:current"], "node scripts/supabase-migration-guard.mjs current");
  assert.match(packageJson.scripts["supabase:list:dev"], /--confirm-env dev/);
  assert.match(packageJson.scripts["supabase:list:production"], /--confirm-env production/);
  assert.match(packageJson.scripts["supabase:verify:production"], /verify production --confirm-env production/);
  assert.equal(packageJson.scripts["supabase:release-plan"], "node scripts/supabase-migration-guard.mjs release-plan");
  assert.match(guardScript, /Refusing to link without an explicit --project-ref value/);
  assert.match(guardScript, /Refusing to push\. Run and review dry-run first/);
  assert.match(guardScript, /required_tables_missing/);
});

test("Supabase output parser tolerates CLI status lines around JSON", async () => {
  const { parseSupabaseJsonPayload } = await import(parserPath);
  const output = `Initialising login role...
Connecting to remote database...
{"migrations":[{"local":"20260702000000","remote":""}],"message":"Migrations listed"}
Warning: Docker Desktop is unavailable for local catalog caching.`;

  const parsed = parseSupabaseJsonPayload(output, "migrations");

  assert.deepEqual(parsed.migrations, [
    { local: "20260702000000", remote: "" },
  ]);
});

test("Supabase output parser can read JSON from stderr-shaped combined output", async () => {
  const { parseSupabaseJsonPayload } = await import(parserPath);
  const output = `Initialising login role...
{"migrations":[{"local":"20260715000600","remote":""}],"message":"Migrations listed"}
Connecting to remote database...`;

  const parsed = parseSupabaseJsonPayload(output, "migrations");

  assert.equal(parsed.migrations[0].local, "20260715000600");
});
