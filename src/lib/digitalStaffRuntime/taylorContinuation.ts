/** Fixed owner authorization for one new DEV run. Prior ledger is READ ONLY. */
import { createHash } from "node:crypto";
import { readFileSync, realpathSync, lstatSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, resolve } from "node:path";
import { continuationBudget } from "./evaluationSpendGuard";
import type { ConversationState, RuntimeMessage } from "./types";

export const taylorContinuationRunId = "taylor-20261019-continuation-pr271";
export const taylorContinuationScenarios = ["health-veterans-original", "health-injection-privacy"] as const;
export function loadTaylorContinuation(priorFile: string, nextFile: string, runId: string) {
  const fixedPrior = resolve(homedir(), ".config/seangworld/evaluations/taylor-20261018/spend.json");
  if (resolve(priorFile) !== fixedPrior || realpathSync(priorFile) !== fixedPrior) throw new Error("Original prior ledger location required");
  const prior = fixedPrior;
  const expectedNext = resolve(dirname(prior), "../taylor-20261019-continuation/spend.json");
  // One fixed ledger path: changing a run ID or choosing another file cannot
  // create another $6.58 authorization. Reject symlinked ledger directories.
  if (runId !== taylorContinuationRunId || resolve(nextFile) !== expectedNext || realpathSync(dirname(nextFile)) !== dirname(expectedNext)) throw new Error("Continuation ledger identity mismatch");
  const stat = lstatSync(priorFile);
  if (!stat.isFile() || stat.isSymbolicLink() || (stat.mode & 0o077)) throw new Error("Private prior ledger required");
  const bytes = readFileSync(priorFile);
  if (createHash("sha256").update(bytes).digest("hex") !== continuationBudget.priorLedgerSha256) throw new Error("Prior ledger changed; cumulative authorization unavailable");
  const old = JSON.parse(bytes.toString("utf8"));
  const accounted = old.entries.reduce((sum: number, e: { status: string; estimatedNanoUsd: number; maximumNanoUsd: number }) => sum + (e.status === "settled" ? e.estimatedNanoUsd : e.maximumNanoUsd), 0);
  if (old.runId !== "taylor-20261018-pr271" || accounted !== continuationBudget.priorAccountedNanoUsd || !old.halted || continuationBudget.priorAccountedNanoUsd + continuationBudget.capNanoUsd > 10_000_000_000) throw new Error("Prior spending mismatch");
  // Recover the exact already-supplied synthetic history/state, not a rewritten
  // successful answer or an unfinished research result. No provider retry ID used.
  const plan = old.entries.find((e: { requestId: string }) => e.requestId.endsWith("-research-in-context-plan"));
  const originalInput = JSON.parse(plan.request.input[0].content[0].text);
  if (originalInput.currentMessage.id !== "health-veterans-original-research-in-context" || originalInput.recentConversation.length !== 2) throw new Error("Original H-C history unavailable");
  return { budget: continuationBudget, recentMessages: originalInput.recentConversation as RuntimeMessage[], state: originalInput.conversationState as ConversationState };
}
