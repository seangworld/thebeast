/** Local, owner-authenticated synthetic evaluation only. Never a billing estimate alone:
 * the full worst-case reservation is durably written BEFORE dispatch. */
import { registerEvaluationReservation } from "./evaluationProviderHook";
import { AsyncLocalStorage } from "node:async_hooks";
import { closeSync, existsSync, fsyncSync, lstatSync, openSync, readFileSync, renameSync, unlinkSync, writeFileSync } from "node:fs";
import { dirname, isAbsolute } from "node:path";

const usd = 1_000_000_000; // integer nanodollars; round UP, never discount cache
export const taylorEvaluationScenarioIds: readonly string[] = ["health-medication-discrepancy", "health-longitudinal-escalation", "health-veterans-original", "health-injection-privacy"];
export const evaluationCapNanoUsd = 10 * usd;
// Luna ceilings include long-context, cache-write and regional uplifts; these
// deliberately over-account rather than claim exact invoice charges.
export const evaluationPricing = {
  reviewedAt: "2026-10-19",
  expiresAt: "2026-10-20T04:00:00Z",
  sources: ["https://developers.openai.com/api/docs/models/gpt-5", "https://developers.openai.com/api/docs/models/gpt-5.6-luna", "https://developers.openai.com/api/docs/pricing"],
  models: {
    "gpt-5": { inputNano: 1250, outputNano: 10000, context: 400000, output: 128000, returned: ["gpt-5", "gpt-5-2025-08-07"] },
    "gpt-5.6-luna": { inputNano: 550, outputNano: 1980, context: 1050000, output: 128000, returned: ["gpt-5.6-luna"] },
  },
  searchNano: 10_000_000,
} as const;

type Entry = { requestId: string; model: string; maximumNanoUsd: number; status: "reserved" | "settled" | "unknown"; estimatedNanoUsd?: number; inputTokens?: number; outputTokens?: number; toolCalls?: number; returnedModel?: string; latencyMs?: number; request?: Record<string, unknown>; response?: unknown };
type Ledger = { version: 1; runId: string; capNanoUsd: number; pricing: typeof evaluationPricing; halted: string | null; entries: Entry[]; results: unknown[]; scenariosStarted: string[] };
function integer(value: unknown): value is number { return typeof value === "number" && Number.isSafeInteger(value) && value >= 0; }
export function evaluationCallBound(body: Record<string, unknown>, now = Date.now()) {
  if (now >= Date.parse(evaluationPricing.expiresAt)) throw new Error("Evaluation pricing review expired");
  const model = body.model as keyof typeof evaluationPricing.models;
  const rate = evaluationPricing.models[model];
  if (!rate) throw new Error("Unknown evaluation model/pricing");
  if (body.service_tier !== undefined && body.service_tier !== "default") throw new Error("Unbounded service tier");
  if (body.background || body.previous_response_id || body.conversation) throw new Error("Unbounded provider history/background");
  const output = body.max_output_tokens ?? rate.output;
  if (!integer(output) || output === 0 || output > rate.output) throw new Error("Unknown output token limit");
  if (body.audio || body.modalities || body.include_obfuscation) throw new Error("Unknown additional provider charges");
  const tools = body.tools ?? [];
  if (!Array.isArray(tools) || tools.some(t => !t || typeof t !== "object" || t.type !== "web_search")) throw new Error("Unknown tool pricing");
  const calls = tools.length ? body.max_tool_calls : 0;
  if (!integer(calls) || calls > 3 || (tools.length && calls === 0)) throw new Error("Unbounded tool calls");
  // Each bounded search step may refill the entire context. Include every such
  // inference pass, all retrieved content, PDF/image input, and reasoning output.
  const maximumNanoUsd = rate.context * (calls + 1) * rate.inputNano + output * rate.outputNano + calls * evaluationPricing.searchNano;
  if (!Number.isSafeInteger(maximumNanoUsd)) throw new Error("Unsafe cost arithmetic");
  return { model, rate, output, calls, maximumNanoUsd };
}

export class EvaluationSpendGuard {
  private state: Ledger;
  private closed = false;
  constructor(private file: string, runId: string) {
    if (!isAbsolute(file) || !/^[a-zA-Z0-9_-]{1,100}$/.test(runId)) throw new Error("Private absolute ledger and fixed run ID required");
    const dir = lstatSync(dirname(file));
    if (!dir.isDirectory() || dir.isSymbolicLink() || (dir.mode & 0o077)) throw new Error("Ledger directory must be private (0700)");
    const lock = openSync(file + ".lock", "wx", 0o600); closeSync(lock);
    try {
      if (existsSync(file)) {
        const stat = lstatSync(file);
        if (!stat.isFile() || stat.isSymbolicLink() || (stat.mode & 0o077)) throw new Error("Ledger must be private (0600)");
        this.state = JSON.parse(readFileSync(file, "utf8"));
        if (this.state.version !== 1 || this.state.runId !== runId || this.state.capNanoUsd !== evaluationCapNanoUsd || JSON.stringify(this.state.pricing) !== JSON.stringify(evaluationPricing) || !Array.isArray(this.state.entries) || !Array.isArray(this.state.results) || !Array.isArray(this.state.scenariosStarted)) throw new Error("Ledger identity/pricing mismatch");
        for (const e of this.state.entries) {
          if (!integer(e.maximumNanoUsd) || !["reserved", "unknown", "settled"].includes(e.status) || (e.status === "settled" && (!integer(e.estimatedNanoUsd) || e.estimatedNanoUsd > e.maximumNanoUsd))) throw new Error("Corrupt ledger");
        }
      } else {
        this.state = { version: 1, runId, capNanoUsd: evaluationCapNanoUsd, pricing: evaluationPricing, halted: null, entries: [], results: [], scenariosStarted: [] };
        this.save();
      }
      this.assertReady();
    } catch (error) { unlinkSync(file + ".lock"); throw error; }
  }
  private save() {
    const temporary = this.file + ".tmp";
    const fd = openSync(temporary, "w", 0o600);
    try { writeFileSync(fd, JSON.stringify(this.state, null, 2) + "\n"); fsyncSync(fd); } finally { closeSync(fd); }
    renameSync(temporary, this.file);
    const dir = openSync(dirname(this.file), "r"); try { fsyncSync(dir); } finally { closeSync(dir); }
  }
  assertReady() {
    if (this.closed || this.state.halted || this.state.entries.some(e => e.status !== "settled")) throw new Error("Evaluation halted: unresolved cost or active reservation");
    if (this.summary().accountedNanoUsd > evaluationCapNanoUsd) throw new Error("Ledger exceeds authorization");
  }
  summary() {
    return { runId: this.state.runId, capNanoUsd: this.state.capNanoUsd, accountedNanoUsd: this.state.entries.reduce((n,e) => n + (e.status === "settled" ? e.estimatedNanoUsd! : e.maximumNanoUsd), 0), attemptedCalls: this.state.entries.length, halted: this.state.halted, entries: structuredClone(this.state.entries) };
  }
  reserve(body: Record<string, unknown>, requestId: string) {
    this.assertReady();
    let bound: ReturnType<typeof evaluationCallBound>;
    try { bound = evaluationCallBound(body); }
    catch (error) { this.state.halted = "Call pricing/token/tool bounds unavailable"; this.save(); throw error; }
    if (this.summary().accountedNanoUsd + bound.maximumNanoUsd > evaluationCapNanoUsd) {
      this.state.halted = "Next call worst-case cost exceeds remaining authorization"; this.save(); throw new Error(this.state.halted);
    }
    if (this.state.entries.some(e => e.requestId === requestId)) throw new Error("Duplicate provider dispatch/retry ID");
    const entry: Entry = { requestId, model: bound.model, maximumNanoUsd: bound.maximumNanoUsd, status: "reserved", request: structuredClone({ ...body, max_output_tokens: bound.output, service_tier: "default" }) };
    this.state.entries.push(entry); this.save();
    return { bound, entry, started: Date.now() };
  }
  settle(ticket: ReturnType<EvaluationSpendGuard["reserve"]>, payload: unknown) {
    const p = payload as { model?: string; service_tier?: string; usage?: { input_tokens?: number; output_tokens?: number }; output?: Array<{ type?: string }> };
    const { bound, entry } = ticket;
    entry.response = structuredClone(payload);
    const input = p?.usage?.input_tokens, output = p?.usage?.output_tokens;
    if (!Array.isArray(p?.output) || p.output.some(x => x.type?.endsWith("_call") && x.type !== "web_search_call")) { this.unknown(ticket); throw new Error("Unknown provider tool usage"); }
    const tools = p?.output?.filter(x => x.type === "web_search_call").length ?? 0;
    if (!integer(input) || !integer(output) || input > bound.rate.context * (bound.calls + 1) || output > bound.output || tools > bound.calls || !bound.rate.returned.some(m => m === p?.model) || (p.service_tier !== undefined && p.service_tier !== "default")) {
      this.unknown(ticket); throw new Error("Missing/unbounded provider usage, model, tier or tools; reservation retained");
    }
    entry.inputTokens = input; entry.outputTokens = output; entry.toolCalls = tools; entry.returnedModel = p.model; entry.latencyMs = Date.now() - ticket.started;
    // No cache discount. Retain the maximum tool charge because provider action
    // records need not expose every billable search operation.
    entry.estimatedNanoUsd = input * bound.rate.inputNano + output * bound.rate.outputNano + bound.calls * evaluationPricing.searchNano;
    if (entry.estimatedNanoUsd > entry.maximumNanoUsd) { this.unknown(ticket); throw new Error("Provider exceeded reservation"); }
    entry.status = "settled"; this.save();
  }
  unknown(ticket: ReturnType<EvaluationSpendGuard["reserve"]>) {
    ticket.entry.status = "unknown"; delete ticket.entry.estimatedNanoUsd; this.state.halted = "Provider outcome/usage uncertain; full reservation retained"; this.save();
  }
  startScenario(id: string) {
    this.assertReady();
    if (!taylorEvaluationScenarioIds.includes(id) || this.state.scenariosStarted.includes(id)) throw new Error("Unapproved or already-started evaluation scenario; no replay");
    this.state.scenariosStarted.push(id); this.save();
  }
  recordScenario(result: unknown) { if (this.closed) throw new Error("Closed evaluation ledger"); this.state.results.push(structuredClone(result)); this.save(); }
  close() { if (!this.closed) { this.closed = true; unlinkSync(this.file + ".lock"); } }
}

export const evaluationSpendScope = new AsyncLocalStorage<EvaluationSpendGuard>();

registerEvaluationReservation((body, requestId) => {
  const guard = evaluationSpendScope.getStore();
  if (!guard) return undefined;
  const ticket = guard.reserve(body, requestId);
  const prepared = ticket.entry.request!;
  return { body: prepared, settle: payload => guard.settle(ticket, payload), unknown: () => guard.unknown(ticket) };
});
