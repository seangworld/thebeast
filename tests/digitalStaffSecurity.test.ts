import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  createOpenAIRequestHeaders,
  digitalStaffUnavailableMessage,
  requestDigitalStaffResponse,
  requestOpenAIResponse,
  sanitizeSecretText,
} from "../src/lib/digitalStaffRuntime";

const testKey = "sk-proj-SINGLE_TEST_TOKEN_1234567890";

test("SEC-002 constructs exactly one OpenAI Authorization bearer token", () => {
  const headers = createOpenAIRequestHeaders("request-1", testKey);
  const authorizationEntries = Array.from(headers.entries()).filter(
    ([name]) => name.toLowerCase() === "authorization"
  );

  assert.equal(authorizationEntries.length, 1);
  assert.equal(headers.get("authorization"), `Bearer ${testKey}`);
  assert.equal(headers.get("authorization")?.match(/Bearer /g)?.length, 1);
});

test("SEC-002 rejects prefixed, repeated, comma-merged, and multiline key values", () => {
  const invalidKeys = [
    `Bearer ${testKey}`,
    `${testKey}${testKey}`,
    `${testKey},${testKey}`,
    `${testKey}\n${testKey}`,
  ];

  for (const key of invalidKeys) {
    assert.throws(
      () => createOpenAIRequestHeaders("request-invalid", key),
      /not configured safely/
    );
  }
});

test("SEC-002 redacts provider and platform credential forms", () => {
  const raw = [
    `Authorization: Bearer ${testKey}`,
    "Bearer sk-secondary_SECRET_123456",
    "sbp_SUPABASE_ACCESS_SECRET_123456",
    "VERCEL_TOKEN=vercel_PRODUCTION_SECRET_123456",
    "SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiJ9.secret.signature",
    "eyJhbGciOiJIUzI1NiJ9.eyJyb2xlIjoic2VydmljZV9yb2xlIn0.verylongsignaturevalue",
    "sb_secret_SERVER_SIDE_SUPABASE_SECRET_123456",
  ].join("\n");
  const sanitized = sanitizeSecretText(raw);

  assert.doesNotMatch(sanitized, /SINGLE_TEST_TOKEN|secondary_SECRET|SUPABASE_ACCESS_SECRET|PRODUCTION_SECRET|SERVER_SIDE_SUPABASE_SECRET|eyJhbGci/);
  assert.match(sanitized, /REDACTED/);
});

test("SEC-002 provider failures never expose secrets in errors or logs", async (t) => {
  for (const status of [401, 429, 500]) {
    await t.test(String(status), async () => {
      const logs: unknown[][] = [];
      const originalConsoleError = console.error;
      console.error = (...values: unknown[]) => { logs.push(values); };
      try {
        await assert.rejects(
          requestOpenAIResponse(
            { input: "test" },
            {
              apiKey: testKey,
              requestId: `request-${status}`,
              fetchImpl: async () => new Response(
                JSON.stringify({ error: { message: `Authorization: Bearer ${testKey}` } }),
                { status, headers: { "Content-Type": "application/json" } }
              ),
            }
          ),
          (error: unknown) => error instanceof Error
            && error.message === digitalStaffUnavailableMessage
            && !error.message.includes(testKey)
        );
      } finally {
        console.error = originalConsoleError;
      }
      const logged = JSON.stringify(logs);
      assert.doesNotMatch(logged, new RegExp(testKey));
      assert.doesNotMatch(logged, /Authorization: Bearer sk-/);
      assert.match(logged, new RegExp(`request-${status}`));
    });
  }
});

test("SEC-002 sanitizes malformed-header exceptions before logging", async () => {
  const logs: unknown[][] = [];
  const originalConsoleError = console.error;
  console.error = (...values: unknown[]) => { logs.push(values); };
  try {
    await assert.rejects(
      requestOpenAIResponse(
        { input: "test" },
        {
          apiKey: testKey,
          requestId: "request-malformed-header",
          fetchImpl: async () => {
            throw new Error(`Headers.append rejected Authorization: Bearer ${testKey} Bearer ${testKey}`);
          },
        }
      ),
      (error: unknown) => error instanceof Error && error.message === digitalStaffUnavailableMessage
    );
  } finally {
    console.error = originalConsoleError;
  }
  const logged = JSON.stringify(logs);
  assert.doesNotMatch(logged, new RegExp(testKey));
  assert.doesNotMatch(logged, /Bearer sk-/);
});

test("SEC-002 client discards raw provider exceptions", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => new Response(
    JSON.stringify({ error: `Authorization: Bearer ${testKey}`, requestId: "safe-reference" }),
    { status: 502, headers: { "Content-Type": "application/json" } }
  );
  try {
    await assert.rejects(
      requestDigitalStaffResponse({
        professionalId: "beastmoney.money-coach",
        conversationId: "conversation",
        message: "Hello",
        workspace: "/dashboard/money/coach",
      }),
      (error: unknown) => error instanceof Error
        && error.message === digitalStaffUnavailableMessage
        && !error.message.includes(testKey)
    );
  } finally {
    globalThis.fetch = originalFetch;
  }

  globalThis.fetch = async () => ({
    ok: false,
    json: async () => { throw new Error(`Malformed provider payload ${testKey}`); },
  } as unknown as Response);
  try {
    await assert.rejects(
      requestDigitalStaffResponse({
        professionalId: "beastmoney.money-coach",
        conversationId: "conversation",
        message: "Hello",
        workspace: "/dashboard/money/coach",
      }),
      (error: unknown) => error instanceof Error
        && error.message === digitalStaffUnavailableMessage
        && !error.message.includes(testKey)
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("SEC-002 API and member surfaces use the safe correlated error contract", () => {
  const runtimeRoute = readFileSync("src/app/api/digital-staff/runtime/route.ts", "utf8");
  const directorRoute = readFileSync("src/app/api/director/conversations/route.ts", "utf8");
  const reconciliationRoute = readFileSync("src/app/api/digital-staff/reconciliation/route.ts", "utf8");
  const client = readFileSync("src/lib/digitalStaffRuntime/client.ts", "utf8");

  assert.doesNotMatch(runtimeRoute, /error instanceof Error \? error\.message/);
  assert.doesNotMatch(directorRoute, /error instanceof Error \? error\.message/);
  assert.doesNotMatch(reconciliationRoute, /lastError: error instanceof Error/);
  assert.match(runtimeRoute, /safeDigitalStaffFailure/);
  assert.match(directorRoute, /safeDigitalStaffFailure/);
  assert.match(reconciliationRoute, /safeDigitalStaffFailure/);
  assert.match(client, /DigitalStaffClientError/);
  assert.doesNotMatch(client, /payload\.error \|\| "The Digital Staff runtime/);
});
