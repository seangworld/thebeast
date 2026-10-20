/** One owner-approved quality regression: 20 attempts / $6.28, no retries. */
import { readFileSync, realpathSync, lstatSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, resolve } from "node:path";
import { qualityRegressionBudget } from "./evaluationSpendGuard";
import { verifyTaylorPriorReceipt, taylorRegressionTurns } from "./taylorRegression";

export const taylorQualityRegressionRunId = "taylor-20261020-quality-regression-pr271";
export const taylorQualityRegressionTurns = taylorRegressionTurns;
export const taylorQualityPriorReceipts = Object.freeze([
  { directory:"taylor-20261018", runId:"taylor-20261018-pr271", sha256:qualityRegressionBudget.priorLedgerSha256, accounted:3_416_366_950 },
  { directory:"taylor-20261019-continuation", runId:"taylor-20261019-continuation-pr271", sha256:qualityRegressionBudget.continuationLedgerSha256!, accounted:133_460_420, settledCalls:11 },
  { directory:"taylor-20261020-regression", runId:"taylor-20261020-regression-pr271", sha256:qualityRegressionBudget.regressionLedgerSha256!, accounted:166_414_870, settledCalls:14 },
]);

export function verifyTaylorQualityPriorReceipts() {
  const root = resolve(homedir(), ".config/seangworld/evaluations");
  const receipts=taylorQualityPriorReceipts.map(expected=>{
    const file=resolve(root,expected.directory,"spend.json");const stat=lstatSync(file);
    if (!stat.isFile() || stat.isSymbolicLink() || (stat.mode & 0o077) || realpathSync(file)!==file) throw new Error("Private original receipt required");
    verifyTaylorPriorReceipt(readFileSync(file),expected);
    return {...expected};
  });
  const accounted=receipts.reduce((sum,r)=>sum+r.accounted,0);
  if (accounted!==qualityRegressionBudget.priorAccountedNanoUsd || accounted+qualityRegressionBudget.capNanoUsd>10_000_000_000) throw new Error("Cumulative authorization unavailable");
  return {receipts,budget:qualityRegressionBudget};
}

export function loadTaylorQualityRegression(nextFile:string,runId:string) {
  const expectedNext=resolve(homedir(),".config/seangworld/evaluations/taylor-20261020-quality-regression/spend.json");
  if (runId!==taylorQualityRegressionRunId || resolve(nextFile)!==expectedNext || realpathSync(dirname(nextFile))!==dirname(expectedNext)) throw new Error("Fixed quality-regression ledger identity required");
  return verifyTaylorQualityPriorReceipts();
}
