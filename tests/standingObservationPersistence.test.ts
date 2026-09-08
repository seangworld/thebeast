import assert from "node:assert/strict";
import test from "node:test";
import { persistStandingObservationCycle, type ObservationCycleStore } from "../src/lib/standingObservationPersistence";
import { evidenceDigest, type ObservationSourceResult, type StandingObservationResult } from "../src/lib/standingObservation";

type Row = { digest: string; status: string; proposals: number };
function memoryStore() {
  const rows: Row[] = [];
  const proposals = new Set<string>();
  let failAfter: number | null = null;
  let failRecording = false;
  function enforceUnique(digest: string, status: string) {
    if (["clean", "findings"].includes(status) && rows.some((row) => row.digest === digest && ["clean", "findings"].includes(row.status))) throw new Error("unique owner/digest");
  }
  const store: ObservationCycleStore<Row> = {
    async hasAcceptedDigest(digest) { return rows.some((row) => row.digest === digest && ["clean", "findings"].includes(row.status)); },
    async insert(result, status) { enforceUnique(result.evidenceDigest, status); const row = { digest: result.evidenceDigest, status, proposals: 0 }; rows.push(row); return row; },
    async createProposals(_run, findings) {
      let created = 0;
      for (const finding of findings) {
        if (failAfter !== null && created === failAfter) throw new Error("proposal history unavailable");
        const key = evidenceDigest([finding]);
        if (!proposals.has(key)) { proposals.add(key); created++; }
      }
      return created;
    },
    async finish(row, status, count) { enforceUnique(row.digest, status); row.status = status; row.proposals = count; return row; },
    async fail(row) { if (failRecording) throw new Error("failure persistence unavailable"); row.status = "failed"; },
  };
  return { rows, proposals, store, setFailure(after: number | null) { failAfter = after; }, failRecording() { failRecording = true; } };
}
const clean: ObservationSourceResult = { source: "github_repository_evidence", available: true, changed: false, summary: "Current evidence", confidence: "high", impact: "none", fingerprint: "clean" };
const material: ObservationSourceResult = { ...clean, changed: true, summary: "Needs review", impact: "medium", fingerprint: "attention" };

test("persisted A to B to A keeps recovery evidence without violating historical digest uniqueness", async () => {
  const db = memoryStore();
  await persistStandingObservationCycle([clean], [], db.store);
  await persistStandingObservationCycle([material], [], db.store);
  const recovery = await persistStandingObservationCycle([clean], ["Earlier attention no longer observed"], db.store);
  assert.equal(recovery.status, "duplicate_skipped");
  assert.deepEqual(db.rows.map((row) => row.status), ["clean", "findings", "duplicate_skipped"]);
  await persistStandingObservationCycle([material], [], db.store);
  assert.equal(db.proposals.size, 1);
});

test("proposal lookup failure does not accept a digest and a recovered cycle retries", async () => {
  const db = memoryStore(); db.setFailure(0);
  await assert.rejects(persistStandingObservationCycle([material], [], db.store), /proposal history/);
  assert.equal(db.rows[0].status, "failed");
  db.setFailure(null);
  assert.equal((await persistStandingObservationCycle([material], [], db.store)).status, "findings");
  assert.equal(db.proposals.size, 1);
});

test("partial intake survives a failed cycle and retry creates only the missing proposal", async () => {
  const db = memoryStore(); db.setFailure(1);
  const evidence = [material, { ...material, source: "vercel_deployment_evidence" }];
  await assert.rejects(persistStandingObservationCycle(evidence, [], db.store));
  assert.equal(db.proposals.size, 1);
  db.setFailure(null);
  const retry = await persistStandingObservationCycle(evidence, [], db.store);
  assert.equal(retry.proposals, 1);
  assert.equal(db.proposals.size, 2);
  assert.equal(retry.status, "findings");
});

test("failure recording outage leaves an unaccepted running cycle", async () => {
  const db = memoryStore(); db.setFailure(0); db.failRecording();
  await assert.rejects(persistStandingObservationCycle([material], [], db.store), /failure persistence/);
  assert.equal(db.rows[0].status, "running");
  assert.equal(await db.store.hasAcceptedDigest(db.rows[0].digest), false);
});

test("recurring material attention remains actionable as existing intake, not a healthy all-clear", async () => {
  const db = memoryStore();
  await persistStandingObservationCycle([material], [], db.store);
  let observed: StandingObservationResult | undefined;
  const original = db.store.insert;
  db.store.insert = async (result, status) => { observed = result; return original(result, status); };
  await persistStandingObservationCycle([material], ["attention persists"], db.store);
  assert.match(observed!.nextStep, /Previously recorded attention/);
  assert.deepEqual(observed!.changes, ["attention persists"]);
  assert.equal(observed!.investigationCount, 0);
});
