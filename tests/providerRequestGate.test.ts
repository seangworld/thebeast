import assert from "node:assert/strict";
import test from "node:test";
import { createRequestGate, retryDelayMs } from "../src/lib/providerRequestGate";

test("concurrent scopes share capacity and thrown requests release their slot", async () => {
 const gate = createRequestGate(3);
 let active = 0, peak = 0;
 const results = await Promise.allSettled(Array.from({length: 18}, (_, i) => gate(async () => {
   active++; peak = Math.max(peak, active);
   await new Promise(resolve => setTimeout(resolve, 1));
   active--;
   if (i === 0) throw new Error("provider failed");
   return i;
 })));
 assert.equal(peak, 3);
 assert.equal(results.filter(x => x.status === "fulfilled").length, 17);
 assert.equal(await gate(async () => 42), 42);
});

test("quota retry honors seconds or HTTP dates with bounded backoff", () => {
 assert.equal(retryDelayMs(429, null, 0), 2000);
 assert.equal(retryDelayMs(429, "8", 0), 8000);
 assert.equal(retryDelayMs(429, "Wed, 16 Sep 2026 10:00:10 GMT", 0, Date.parse("2026-09-16T10:00:00Z")), 10000);
 assert.equal(retryDelayMs(429, "999", 1), 30000);
 assert.equal(retryDelayMs(503, null, 1), 500);
});
