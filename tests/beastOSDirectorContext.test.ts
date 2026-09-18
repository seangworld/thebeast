import assert from "node:assert/strict";
import test from "node:test";
import type { User } from "@supabase/supabase-js";
let allowed = true;
const Module = require("node:module");
const originalLoad = Module._load;
Module._load = function (id: string, ...args: unknown[]) {
  if (id === "./memberAgeServer")
    return {
      requireMemberModuleEntitlement: async () => ({
        ok: allowed,
        status: allowed ? 200 : 403,
      }),
    };
  return originalLoad.call(this, id, ...args);
};
const { loadDirectorContext } =
  require("../src/lib/directorContext") as typeof import("../src/lib/directorContext");
Module._load = originalLoad;
function client(failGoals = false) {
  const reads: string[] = [];
  const queries: Array<{ table: string; key: string; value: unknown }> = [];
  const records: Record<string, Record<string, unknown>[]> = {
    beast_goals: [
      {
        id: "current",
        owner_id: "member",
        title: "Earn a degree",
        category: "Education",
        status: "Active",
        deleted_at: null,
        archived_at: null,
      },
      {
        id: "deleted",
        owner_id: "member",
        title: "Deleted goal",
        status: "Active",
        deleted_at: "2026-09-18",
        archived_at: null,
      },
      {
        id: "other",
        owner_id: "another",
        title: "Other member goal",
        status: "Active",
        deleted_at: null,
        archived_at: null,
      },
    ],
    debts: [
      { id: "debt", user_id: "member", name: "Card", is_archived: false },
    ],
    beast_health_records: [
      {
        id: "health",
        owner_id: "member",
        title: "Visit",
        status: "active",
        record_type: "appointment",
      },
    ],
    agent_conversations: [
      {
        owner_id: "member",
        agent_id: "beasthealth.health-advisor",
        archived: false,
        summary: { overview: "Health history" },
        updated_at: "2026-09-18T12:00:00Z",
      },
      {
        owner_id: "member",
        agent_id: "beasteducation.guidance-counselor",
        archived: false,
        summary: { overview: "Career direction" },
        updated_at: "2026-09-18T12:00:00Z",
      },
    ],
  };
  const db = {
    from: (table: string) => {
      reads.push(table);
      let rows = records[table] || [];
      const chain: any = {
        select: () => chain,
        order: () => chain,
        limit: () => chain,
        eq: (key: string, value: unknown) => {
          queries.push({ table, key, value });
          rows = rows.filter((row) => row[key] === value);
          return chain;
        },
        is: (key: string, value: unknown) => {
          queries.push({ table, key, value });
          rows = rows.filter((row) => row[key] === value);
          return chain;
        },
        neq: (key: string, value: unknown) => {
          queries.push({ table, key, value });
          rows = rows.filter((row) => row[key] !== value);
          return chain;
        },
        in: (key: string, values: unknown[]) => {
          rows = rows.filter((row) => values.includes(row[key]));
          return chain;
        },
        then: (resolve: (value: unknown) => unknown) =>
          resolve({
            data: rows,
            error:
              failGoals && table === "beast_goals"
                ? { message: "Unavailable" }
                : null,
          }),
      };
      return chain;
    },
  };
  return { db, reads, queries };
}
const user = { id: "member" } as User;
test("Director excludes deleted and other-member goals and keeps aspirations explicit", async () => {
  allowed = true;
  const { db, queries } = client();
  const result = await loadDirectorContext(db as any, user);
  assert.equal(
    result.signals.filter((item) => item.source === "BeastGoals").length,
    1,
  );
  assert.equal(result.signals[0].label, "Earn a degree");
  assert.match(result.signals[0].detail, /not an achieved fact/);
  assert.ok(
    queries.some(
      (item) =>
        item.table === "beast_documents" &&
        item.key === "status" &&
        item.value === "Deleted",
    ),
  );
});
test("Director skips unavailable Money/Health records and their specialist summaries", async () => {
  allowed = false;
  const { db, reads } = client();
  const result = await loadDirectorContext(db as any, user);
  assert.ok(!reads.includes("debts"));
  assert.ok(!reads.includes("beast_health_records"));
  assert.deepEqual(
    result.specialistSummaries.map((item) => item.professionalId),
    ["beasteducation.guidance-counselor"],
  );
  assert.ok(result.unavailableSources.includes("BeastHealth"));
  assert.ok(result.unavailableSources.includes("BeastMoney"));
});
test("Director reports source failures without claiming there are no goals", async () => {
  allowed = true;
  const { db } = client(true);
  const result = await loadDirectorContext(db as any, user);
  assert.ok(result.unavailableSources.includes("BeastGoals"));
  assert.ok(result.signals.some((item) => item.domain === "health"));
  assert.ok(!result.signals.some((item) => item.source === "BeastGoals"));
});
