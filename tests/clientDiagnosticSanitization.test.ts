import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  classifyClientDiagnosticError,
  reportClientOperationFailure,
} from "../src/lib/clientDiagnostics";

const auditedClientFiles = [
  "src/app/dashboard/money/cashflow/useCashFlow.ts",
  "src/app/dashboard/money/cashflow/hooks/useCashFlowPaymentActions.ts",
  "src/app/dashboard/money/cashflow/page.tsx",
  "src/app/dashboard/money/debts/page.tsx",
  "src/app/dashboard/money/settings/page.tsx",
  "src/app/dashboard/onboarding/page.tsx",
];

test("PLAT-001D production diagnostics exclude financial and member payloads", () => {
  const logs: unknown[][] = [];
  const originalConsoleError = console.error;
  console.error = (...values: unknown[]) => {
    logs.push(values);
  };

  try {
    reportClientOperationFailure({
      module: "beastmoney",
      operation: "funding_source_save",
      error: {
        code: "23505",
        message: "duplicate account for member@example.com",
        id: "funding-source-internal-id",
        name: "Private HELOC",
        current_balance: 12850.42,
        interest_rate: 12.75,
        credit_limit: 30000,
      },
    });
  } finally {
    console.error = originalConsoleError;
  }

  assert.deepEqual(logs, [
    [
      "Client operation failed.",
      {
        module: "beastmoney",
        operation: "funding_source_save",
        errorCategory: "conflict_error",
      },
    ],
  ]);

  const serializedLogs = JSON.stringify(logs);
  for (const sensitiveValue of [
    "member@example.com",
    "funding-source-internal-id",
    "Private HELOC",
    "12850.42",
    "12.75",
    "30000",
    "23505",
  ]) {
    assert.doesNotMatch(serializedLogs, new RegExp(sensitiveValue));
  }
});

test("PLAT-001D classifies provider failures without returning raw details", () => {
  assert.equal(
    classifyClientDiagnosticError({ status: 401, token: "secret" }),
    "authentication_error"
  );
  assert.equal(
    classifyClientDiagnosticError({ code: "42501", details: "member record" }),
    "authorization_error"
  );
  assert.equal(
    classifyClientDiagnosticError(new TypeError("Failed to fetch private account")),
    "network_error"
  );
  assert.equal(
    classifyClientDiagnosticError({ code: "PGRST116", hint: "private row" }),
    "database_error"
  );
  assert.equal(
    classifyClientDiagnosticError({
      code: "22023",
      message: "bill_occurrence_already_paid",
    }),
    "validation_error"
  );
  assert.equal(
    classifyClientDiagnosticError(new Error("unexpected private provider detail")),
    "unknown_error"
  );
});

test("PLAT-001D audited client paths do not dump raw payloads or provider errors", () => {
  const source = auditedClientFiles
    .map((file) => readFileSync(file, "utf8"))
    .join("\n");

  for (const removedDiagnostic of [
    "FUNDING SOURCE SAVE DIAGNOSTICS",
    "Funding Source ID:",
    "Payload being sent to Supabase:",
    "Supabase response data:",
    "Supabase response error:",
    "BeastEducation onboarding completion update result.",
  ]) {
    assert.doesNotMatch(source, new RegExp(removedDiagnostic));
  }

  assert.doesNotMatch(
    source,
    /console\.(?:log|debug|info|warn|error)\([^\n]*(?:error|err|userId|updatePayload|updateData)/
  );
  assert.match(source, /reportClientOperationFailure/);
});

test("PLAT-001D existing development-only diagnostics remain production-guarded", () => {
  const velocity = readFileSync(
    "src/app/dashboard/money/velocity/page.tsx",
    "utf8"
  );
  const entitlements = readFileSync("src/lib/hooks/useEntitlements.ts", "utf8");

  assert.match(
    velocity,
    /process\.env\.NODE_ENV !== "production"[\s\S]{0,100}console\.error/
  );
  assert.match(
    entitlements,
    /process\.env\.NODE_ENV !== "production"[\s\S]{0,300}console\.warn/
  );
});
