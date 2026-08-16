import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  buildRuntimeInput,
  buildMoneyCoachStructuredRecords,
  digitalStaffProviderTimeoutMs,
  digitalStaffActivityLabels,
  guidanceCounselorCareerProfileItemColumns,
  guidanceCounselorEducationProfileColumns,
  isProductSupportQuestion,
  moneyCoachCashSettingsColumns,
  moneyCoachFundingSourceColumns,
  requireProfessionalConfig,
  requiresDeterministicResearch,
  isDeclarativeMemberStatement,
  requestOpenAIResponseStream,
  type RuntimeContext,
} from "../src/lib/digitalStaffRuntime";

const message = (text: string) => ({ id: "message", role: "user" as const, text, createdAt: "2026-08-08T12:00:00Z" });

test("AP-105 deterministic research boundaries distinguish current authorities from current member records", () => {
  assert.equal(requiresDeterministicResearch({ professionalId: "beasteducation.guidance-counselor", message: message("What are the current OPM requirements for this federal series?") }), true);
  assert.equal(requiresDeterministicResearch({ professionalId: "beastmoney.money-coach", message: message("What are the current IRS contribution limits?") }), true);
  assert.equal(requiresDeterministicResearch({ professionalId: "beasthealth.health-advisor", message: message("What does the FDA currently say about this medication?") }), true);
  assert.equal(requiresDeterministicResearch({ professionalId: "beasthealth.health-advisor", message: message("Where do I update my current medications?") }), false);
  assert.equal(requiresDeterministicResearch({ professionalId: "beastmoney.money-coach", message: message("What did I tell you my current priority was?") }), false);
  assert.equal(requiresDeterministicResearch({ professionalId: "beastmoney.money-coach", message: message("Can I afford to buy a new laptop today?") }), false);
});

test("DS-PERF-01 keeps disclosed member facts out of external research", () => {
  assert.equal(isDeclarativeMemberStatement("I hold a SECRET clearance."), true);
  assert.equal(isDeclarativeMemberStatement("I currently take Medication X."), true);
  assert.equal(isDeclarativeMemberStatement("I work at Employer X."), true);
  assert.equal(isDeclarativeMemberStatement("What are the current FDA warnings?"), false);
});

test("AP-105 product navigation omits unrelated private records while preserving bounded continuity", () => {
  assert.equal(isProductSupportQuestion("Where do I upload my transcript?"), true);
  const context = {
    ownerId: "owner", professionalId: "beasteducation.guidance-counselor", conversationId: "conversation",
    message: message("Where do I upload my transcript?"), recentMessages: Array.from({ length: 12 }, (_, index) => message(`history-${index}`)),
    state: { currentTopic: null, currentWorkspace: null, lastProfessionalQuestion: null, unresolvedQuestions: [], corrections: [], pendingApprovals: [], currentGoal: null, previousDecisions: [] },
    memories: [{ key: "private", value: "not needed", updatedAt: "2026-08-08T12:00:00Z" }],
    structuredRecords: [{ domain: "education", record: { private: "not needed" } }], workspace: null,
  } satisfies RuntimeContext;
  const input = JSON.parse(buildRuntimeInput(requireProfessionalConfig(context.professionalId), context));
  assert.equal(input.recentConversation.length, 4);
  assert.deepEqual(input.relevantMemory, []);
  assert.deepEqual(input.structuredRecords, []);
});

test("AP-105 OpenAI stream parser forwards text deltas and returns the completed response", async () => {
  const originalFetch = globalThis.fetch;
  const completed = { id: "response", output_text: "Hello" };
  const body = [
    `data: ${JSON.stringify({ type: "response.output_text.delta", delta: "Hel" })}`,
    `data: ${JSON.stringify({ type: "response.output_text.delta", delta: "lo" })}`,
    `data: ${JSON.stringify({ type: "response.completed", response: completed })}`,
    "data: [DONE]",
  ].join("\n\n") + "\n\n";
  globalThis.fetch = async () => new Response(body, { status: 200, headers: { "Content-Type": "text/event-stream" } });
  const deltas: string[] = [];
  let responseHeadersSeen = false;
  let completedSeen = false;
  try {
    const result = await requestOpenAIResponseStream<typeof completed>({ model: "test" }, { apiKey: "sk-proj-SINGLE_TEST_TOKEN_1234567890", onOutputTextDelta: (delta) => { deltas.push(delta); }, onResponseHeaders: () => { responseHeadersSeen = true; }, onComplete: () => { completedSeen = true; } });
    assert.equal(result.output_text, "Hello");
    assert.equal(deltas.join(""), "Hello");
    assert.equal(responseHeadersSeen, true);
    assert.equal(completedSeen, true);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("DS-PERF-01 aborts a stalled provider call at the configured bound without retrying", async () => {
  let calls = 0;
  let sawAbort = false;
  const originalError = console.error;
  console.error = () => undefined;
  try {
    await assert.rejects(
      requestOpenAIResponseStream(
        { model: "test" },
        {
          apiKey: "sk-proj-SINGLE_TEST_TOKEN_1234567890",
          timeoutMs: 5,
          fetchImpl: async (_input, init) => {
            calls += 1;
            return await new Promise<Response>((_resolve, reject) => {
              init?.signal?.addEventListener("abort", () => {
                sawAbort = true;
                reject(init.signal?.reason || new Error("aborted"));
              }, { once: true });
            });
          },
        }
      ),
      /temporarily unavailable/i
    );
  } finally {
    console.error = originalError;
  }
  assert.equal(calls, 1);
  assert.equal(sawAbort, true);
  assert.equal(digitalStaffProviderTimeoutMs, 60_000);
});

test("DS-PERF-01 supplies canonical affordability context without starving supporting records", () => {
  const records = buildMoneyCoachStructuredRecords({
    debts: [{ id: "debt", name: "Card", balance: 1_000, minimum_payment: 100, is_archived: false }],
    bills: [{ id: "bill", name: "Rent", amount: 1_000, frequency: "monthly", due_date: 20, is_archived: false }],
    incomes: [{ id: "income", name: "Pay", amount: 3_000, frequency: "monthly", next_date: "2026-08-20", is_active: true }],
    cashSettings: { starting_balance: 4_000, checking_buffer: 500 },
    fundingSources: [],
    goals: [{ id: "goal", title: "Laptop", status: "Active" }],
  }, new Date("2026-08-15T12:00:00Z"));
  const summary = records[0]?.record as Record<string, unknown>;
  assert.equal(summary.monthlyIncome, 3_000);
  assert.equal(summary.monthlyBills, 1_000);
  assert.equal(summary.monthlyDebtMinimums, 100);
  assert.equal(summary.currentCash, 4_000);
  assert.equal(summary.cashBuffer, 500);
  assert.equal(typeof summary.safeToSpendToday, "number");
  assert.ok(records.some((record) => record.domain.endsWith(":income")));
  assert.ok(records.some((record) => record.domain.endsWith(":goal")));
  assert.ok(records.length <= 20);
});

test("DS-PERF-01 Money context selects only columns present in the canonical DEV schema", () => {
  const schema = readFileSync("supabase/migrations/20260531000000_dev_schema.sql", "utf8");
  const cashSettingsDefinition = schema.slice(schema.indexOf("create table if not exists public.cash_settings"), schema.indexOf("alter table public.cash_settings"));
  const fundingSourceDefinition = schema.slice(schema.indexOf("create table if not exists public.funding_sources"), schema.indexOf("create index if not exists funding_sources"));
  for (const column of moneyCoachCashSettingsColumns.split(", ")) {
    assert.match(cashSettingsDefinition, new RegExp(`\\b${column}\\b`));
  }
  for (const column of moneyCoachFundingSourceColumns.split(", ")) {
    assert.match(fundingSourceDefinition, new RegExp(`\\b${column}\\b`));
  }
  assert.doesNotMatch(moneyCoachCashSettingsColumns, /updated_at/);
  assert.doesNotMatch(moneyCoachFundingSourceColumns, /max_utilization_percent/);
});

test("DS-PERF-01 Guidance context selects only columns present in the canonical Education schema", () => {
  const educationProfileMigration = readFileSync("supabase/migrations/20260724000200_add_education_profiles.sql", "utf8");
  const educationProfileDefinition = educationProfileMigration.slice(
    educationProfileMigration.indexOf("create table if not exists public.education_profiles"),
    educationProfileMigration.indexOf("alter table public.education_profiles")
  );
  const careerIntelligenceMigration = readFileSync("supabase/migrations/20260801000600_add_education_career_intelligence.sql", "utf8");
  const careerProfileItemDefinition = careerIntelligenceMigration.slice(
    careerIntelligenceMigration.indexOf("create table if not exists public.education_career_profile_items"),
    careerIntelligenceMigration.indexOf("create index if not exists education_career_profile_items_owner_phase_idx")
  );

  for (const column of guidanceCounselorEducationProfileColumns.split(", ")) {
    assert.match(educationProfileDefinition, new RegExp(`\\b${column}\\b`));
  }
  for (const column of guidanceCounselorCareerProfileItemColumns.split(", ")) {
    assert.match(careerProfileItemDefinition, new RegExp(`\\b${column}\\b`));
  }
  assert.doesNotMatch(guidanceCounselorEducationProfileColumns, /(?:^|, )id(?:,|$)/);
});

test("AP-105 shared client and route expose acknowledged activity streaming and safe retry contracts", () => {
  const client = readFileSync("src/lib/digitalStaffRuntime/client.ts", "utf8");
  const route = readFileSync("src/app/api/digital-staff/runtime/route.ts", "utf8");
  assert.match(client, /application\/x-ndjson/);
  assert.match(client, /onAcknowledged/);
  assert.match(client, /onResponseDelta/);
  assert.match(client, /onFirstUsefulContent/);
  assert.match(client, /onStreamComplete/);
  assert.match(route, /type: "acknowledged"/);
  assert.match(route, /reportDigitalStaffLifecycle/);
  assert.match(route, /providerResponseHeadersMs/);
  assert.match(route, /providerFirstEventMs/);
  assert.match(route, /providerCompleteMs/);
  assert.match(route, /validationMs/);
  assert.match(route, /contextPromise/);
  assert.match(route, /incomeLoadMs/);
  assert.match(route, /otherFinancialContextLoadMs/);
  assert.match(route, /signal: request\.signal/);
  assert.match(route, /await contextObserverActivity\(observer, "loading_context"\)/);
  assert.match(route, /Promise\.all\(\[/);
  assert.doesNotMatch(route, /console\.(?:log|info).*message/);
  assert.equal(digitalStaffActivityLabels.researching, "Checking current sources…");
});

test("AP-105 specialist surfaces render optimistic turns and stop using Sending for the whole turn", () => {
  for (const file of [
    "src/app/dashboard/money/components/MoneyCoachExperience.tsx",
    "src/app/dashboard/learning/GuidanceCounselorConversation.tsx",
    "src/app/dashboard/health/HealthAdvisorWorkspace.tsx",
    "src/app/dashboard/director/DirectorExperience.tsx",
  ]) {
    const source = readFileSync(file, "utf8");
    assert.match(source, /Working…/);
    assert.match(source, /Try again/);
  }
});
