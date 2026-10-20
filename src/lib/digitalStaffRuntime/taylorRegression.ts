/** October 20 owner-authorized regression. Both prior receipts are read-only. */
import { createHash } from "node:crypto";
import { readFileSync, realpathSync, lstatSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, resolve } from "node:path";
import { regressionBudget } from "./evaluationSpendGuard";

export const taylorRegressionRunId = "taylor-20261020-regression-pr271";
export const taylorRegressionScenarioIds = ["health-longitudinal-escalation", "health-veterans-original"] as const;
export const taylorRegressionTurns = {
  "health-longitudinal-escalation": ["trend", "new-symptom"],
  "health-veterans-original": ["read-original", "research-in-context"],
} as const;
export function verifyTaylorPriorReceipt(bytes: Buffer, expected: {sha256: string; runId: string; accounted: number; settledCalls?: number}) {
  if (createHash("sha256").update(bytes).digest("hex") !== expected.sha256) throw new Error("Prior receipt hash changed");
  const ledger = JSON.parse(bytes.toString("utf8"));
  const accounted = ledger.entries.reduce((sum: number, e: {status: string; estimatedNanoUsd: number; maximumNanoUsd: number}) => sum + (e.status === "settled" ? e.estimatedNanoUsd : e.maximumNanoUsd), 0);
  if (ledger.runId !== expected.runId || accounted !== expected.accounted || (expected.settledCalls !== undefined && (ledger.halted || ledger.entries.length !== expected.settledCalls || ledger.entries.some((e: {status: string}) => e.status !== "settled")))) throw new Error("Prior receipt identity/spending mismatch");
  return accounted;
}
export function loadTaylorRegression(priorFile: string, nextFile: string, runId: string) {
  const root = resolve(homedir(), ".config/seangworld/evaluations");
  const original = resolve(root, "taylor-20261018/spend.json");
  const continuation = resolve(root, "taylor-20261019-continuation/spend.json");
  const expectedNext = resolve(root, "taylor-20261020-regression/spend.json");
  if (resolve(priorFile) !== original || resolve(nextFile) !== expectedNext || runId !== taylorRegressionRunId || realpathSync(dirname(nextFile)) !== dirname(expectedNext)) throw new Error("Fixed regression ledger identity required");
  function bytes(file: string) {
    const stat=lstatSync(file);
    if (!stat.isFile() || stat.isSymbolicLink() || (stat.mode & 0o077) || realpathSync(file) !== file) throw new Error("Private original receipt required");
    return readFileSync(file);
  }
  const prior = verifyTaylorPriorReceipt(bytes(original), {sha256: regressionBudget.priorLedgerSha256, runId:"taylor-20261018-pr271", accounted:3_416_366_950});
  const additional = verifyTaylorPriorReceipt(bytes(continuation), {sha256: regressionBudget.continuationLedgerSha256!, runId:"taylor-20261019-continuation-pr271", accounted:133_460_420, settledCalls:11});
  if (prior+additional !== regressionBudget.priorAccountedNanoUsd || prior+additional+regressionBudget.capNanoUsd > 10_000_000_000) throw new Error("Cumulative authorization unavailable");
  return {budget: regressionBudget};
}
