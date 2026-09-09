import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import ts from "typescript";

test("actual public route shares one period and awaits a new report after rollover or idle", async () => {
  let clock = Date.parse("2026-09-09T17:00:01Z"), reports = 0;
  const cache = new Map<string, unknown>();
  const exports: { GET?: () => Promise<Response> } = {};
  const source = readFileSync("src/app/public/news-traffic/route.ts", "utf8");
  const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
  runInNewContext(code, { exports, Date: class extends Date { static now() { return clock; } }, require: (name: string) => {
    if (name === "next/cache") return { unstable_cache: (load: () => Promise<unknown>, keys: string[]) => async () => {
      // Retain expired entries, as a stale-while-revalidate cache can do.
      const key = keys.join(":"); if (!cache.has(key)) cache.set(key, await load()); return cache.get(key);
    } };
    if (name === "next/server") return { NextResponse: Response };
    if (name === "@/lib/server/publicNewsTraffic") return { loadPublicNewsTraffic: async () => ({ status: "ready", pageViews: ++reports }) };
    throw new Error("Unexpected dependency " + name);
  } });
  const first = await exports.GET!(); assert.equal(first.headers.get("cache-control"), "no-store");
  assert.equal((await first.json()).pageViews, 1);
  clock += 1000; assert.equal((await (await exports.GET!()).json()).pageViews, 1);
  clock = Date.parse("2026-09-09T17:05:00Z"); assert.equal((await (await exports.GET!()).json()).pageViews, 2);
  clock += 3_600_000; assert.equal((await (await exports.GET!()).json()).pageViews, 3);
  assert.equal(reports, 3);
});
