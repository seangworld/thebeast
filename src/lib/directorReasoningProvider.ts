import { requestOpenAIResponse } from "./digitalStaffRuntime/provider";
import { acquireDigitalStaffRequestLease } from "./digitalStaffRuntime/requestBudget";
import { defaultStrongDigitalStaffModel } from "./digitalStaffRuntime/runtime";
import { directorExecutionInstructions, directorExecutionSchema, reasoningInput, validateDirectorReasoning, type DirectorReasoningContext } from "./directorReasoning";

/** Disabled until explicitly configured. Tests inject transport; never silently substitute a script for AI. */
export function directorReasoningAvailable() {
  return process.env.BEAST_DIRECTOR_REASONING_ENABLED === "true" && Boolean(process.env.OPENAI_API_KEY);
}

export async function reasonAboutDirectorObjective(ownerId: string, context: DirectorReasoningContext, signal?: AbortSignal, transport = requestOpenAIResponse) {
  if (!directorReasoningAvailable()) throw new Error("Director AI planning is not enabled. Real-model evaluation and spending authorization remain required.");
  const input = reasoningInput(context);
  if (input.length > 24_000) throw new Error("Director evidence exceeds the planning budget. Narrow the objective.");
  const lease = acquireDigitalStaffRequestLease(ownerId, "beastfusion.fusion-director");
  if (!lease.ok) throw new Error("Another Director request is active or the request budget was reached.");
  try {
    const payload = await transport<{ status?: string; incomplete_details?: { reason?: string }; output_text?: string; output?: Array<{ content?: Array<{ type?: string; text?: string }> }> }>({
      model: process.env.OPENAI_DIGITAL_STAFF_STRONG_MODEL || process.env.OPENAI_DIGITAL_STAFF_MODEL || defaultStrongDigitalStaffModel,
      store: false, max_output_tokens: 2400, reasoning: { effort: "low" },
      instructions: directorExecutionInstructions, input,
      text: { format: { type: "json_schema", name: "director_objective_plan", strict: true, schema: directorExecutionSchema } },
    }, { signal: AbortSignal.any([signal || new AbortController().signal, AbortSignal.timeout(60_000)]) });
    if (payload.status !== "completed") throw new Error("Director response incomplete or refused. No plan or assignment was saved; no automatic retry.");
    const text = payload.output_text || payload.output?.flatMap((item) => item.content || []).find((item) => item.type === "output_text")?.text;
    if (!text) throw new Error("Director returned no plan or refused the request.");
    let value;
    try { value = JSON.parse(text); } catch { throw new Error("Director response was not complete JSON. Nothing was assigned; request a new plan only under authorized inference limits."); }
    return validateDirectorReasoning(value, context);
  } finally { lease.release(); }
}
