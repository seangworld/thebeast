import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { getConfigurationBoundary, resolveSupabasePublicConfiguration } from "../src/lib/supabase/config";
import { classifyMemberError, memberSafeMessage, toMemberSafeError } from "../src/lib/memberSafeError";

const valid = { url: "https://project.supabase.co", publicKey: "public-key-with-sufficient-length" };

test("PLAT-001E validates required Supabase configuration without exposing values", () => {
  assert.deepEqual(resolveSupabasePublicConfiguration({ ...valid, url: "" }), { ok: false, reason: "missing_url" });
  assert.deepEqual(resolveSupabasePublicConfiguration({ ...valid, publicKey: "" }), { ok: false, reason: "missing_key" });
  assert.deepEqual(resolveSupabasePublicConfiguration({ ...valid, url: "not a url" }), { ok: false, reason: "invalid_url" });
  assert.deepEqual(resolveSupabasePublicConfiguration({ ...valid, url: "http://project.supabase.co" }), { ok: false, reason: "unusable_url" });
  assert.deepEqual(resolveSupabasePublicConfiguration({ ...valid, url: "https://example.supabase.co" }), { ok: false, reason: "unusable_url" });
  assert.deepEqual(resolveSupabasePublicConfiguration({ ...valid, publicKey: "placeholder" }), { ok: false, reason: "unusable_key" });
  assert.equal(resolveSupabasePublicConfiguration(valid).ok, true);
});

test("PLAT-001E fails closed only for protected route groups", () => {
  assert.equal(getConfigurationBoundary("/dashboard"), "dashboard");
  assert.equal(getConfigurationBoundary("/dashboard/admin"), "dashboard");
  assert.equal(getConfigurationBoundary("/api/money/payments"), "api");
  assert.equal(getConfigurationBoundary("/api/admin/members"), "api");
  assert.equal(getConfigurationBoundary("/api/auth/start"), "public");
  assert.equal(getConfigurationBoundary("/api/session/status"), "public");
  assert.equal(getConfigurationBoundary("/login"), "public");

  const source = readFileSync("src/middleware.ts", "utf8");
  assert.match(source, /status: 503/);
  assert.match(source, /private, no-cache, no-store, must-revalidate, max-age=0/);
  assert.match(source, /response\.cookies\.getAll/);
  assert.match(source, /is_current_beast_session_allowed/);
  assert.match(source, /isDisabledBeastUser/);
  assert.match(source, /resolveMemberModuleEntitlement/);
  assert.match(source, /profile\?\.role === "admin"/);
});

test("PLAT-001F maps operation categories to fixed actionable member copy", () => {
  const cases = [
    [{ status: 422, message: "invalid input" }, "validation"],
    [{ status: 403, message: "policy owner_only denied" }, "unauthorized"],
    [{ status: 404 }, "not_found"],
    [{ status: 503 }, "temporarily_unavailable"],
    [{ code: "23505", message: "unique constraint users_email_key" }, "conflict"],
    [{ status: 504, message: "provider timeout" }, "retryable"],
    [{ message: "storage bucket rejected file" }, "upload"],
    [{ message: "unexpected database failure" }, "internal"],
  ] as const;
  for (const [error, category] of cases) assert.equal(classifyMemberError(error), category);
});

test("PLAT-001F never returns provider, schema, secret, or identifier diagnostics", () => {
  const raw = [
    "relation public.beast_documents column owner_id violates constraint beast_documents_owner_id_fkey",
    "new row violates row-level security policy owner_only_policy",
    "Authorization: Bearer sk-secret-value provider payload member 123e4567-e89b-12d3-a456-426614174000",
    "Error: stack trace at internal/database.ts:12",
  ];
  for (const message of raw) {
    const safe = toMemberSafeError({ message }, { correlationId: "safe-reference" });
    assert.equal(safe.correlationId, "safe-reference");
    assert.doesNotMatch(safe.message, /beast_documents|owner_id|constraint|policy|schema|bearer|secret|123e4567|stack|database/i);
  }
});

test("PLAT-001F preserves only explicitly approved member guidance", () => {
  const guidance = "Complete Learning Setup before adding a learning goal.";
  assert.equal(memberSafeMessage(new Error(guidance), "create", [guidance]), guidance);
  assert.notEqual(
    memberSafeMessage(new Error("relation learning_goals violates owner_policy"), "create", [guidance]),
    "relation learning_goals violates owner_policy"
  );
});

test("PLAT-001F audited member surfaces use the mapper and specialized boundaries remain", () => {
  const adopted = [
    "src/app/dashboard/money/income/IncomeWorkspace.tsx",
    "src/app/dashboard/money/debts/page.tsx",
    "src/app/dashboard/money/cashflow/useCashFlow.ts",
    "src/app/dashboard/money/settings/page.tsx",
    "src/app/dashboard/goals/LifePlanningHub.tsx",
    "src/app/dashboard/uploads/DocumentUploadDropzone.tsx",
    "src/app/dashboard/learning/goals/LearningGoalsManager.tsx",
    "src/app/dashboard/money/import/SmartFinancialImport.tsx",
    "src/app/dashboard/money/components/MoneyWorkspacePage.tsx",
    "src/app/dashboard/learning/LearningGoalDiscovery.tsx",
    "src/app/dashboard/learning/LearningGoalBuilder.tsx",
    "src/app/dashboard/learning/activities/[activityId]/page.tsx",
  ];
  adopted.forEach((file) => assert.match(readFileSync(file, "utf8"), /memberSafeMessage/));
  assert.doesNotMatch(readFileSync("src/app/dashboard/money/import/SmartFinancialImport.tsx", "utf8"), /setStatus\(error\.message\)/);
  assert.doesNotMatch(readFileSync("src/app/dashboard/money/components/MoneyWorkspacePage.tsx", "utf8"), /setLoadError\([\s\S]{0,120}error\.message/);
  assert.doesNotMatch(readFileSync("src/app/dashboard/learning/LearningGoalDiscovery.tsx", "utf8"), /setMessage\([\s\S]{0,120}error\.message/);
  assert.doesNotMatch(readFileSync("src/app/dashboard/learning/activities/[activityId]/page.tsx", "utf8"), /setMessage\([\s\S]{0,120}error\.message/);
  assert.doesNotMatch(readFileSync("src/app/dashboard/education/[workspace]/error.tsx", "utf8"), /error\.message/);
  assert.match(readFileSync("src/app/dashboard/money/import/SmartFinancialImport.tsx", "utf8"), /Imported \$\{rows\.length\} confirmed/);
  assert.match(readFileSync("src/app/dashboard/learning/LearningGoalDiscovery.tsx", "utf8"), /Great choice\. I will build your learning plan/);
  assert.match(readFileSync("src/lib/digitalStaffRuntime/security.ts", "utf8"), /safeDigitalStaffFailure/);
  assert.match(readFileSync("src/lib/auth/experience.ts", "utf8"), /getAuthErrorMessage/);
  assert.match(readFileSync("src/app/dashboard/health/HealthAdvisorWorkspace.tsx", "utf8"), /Health Advisor/);
  assert.match(readFileSync("src/app/dashboard/admin/migrations/BeastAdminMigrationStatusWorkspace.tsx", "utf8"), /actualError/);
});
