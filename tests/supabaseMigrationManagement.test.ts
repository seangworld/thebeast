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
