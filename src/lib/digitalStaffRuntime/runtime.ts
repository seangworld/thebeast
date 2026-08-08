import { requireProfessionalConfig } from "./config";
import { validateNavigationTarget } from "./navigation";
import { buildRuntimeInput, buildRuntimeInstructions, runtimeJsonSchema } from "./prompt";
import { deidentifyResearchQuery, validateToolCalls } from "./tools";
import type { RuntimeContext, RuntimePlan, RuntimeResult } from "./types";

type ResponsesPayload = { output_text?: string; output?: Array<{ content?: Array<{ type?: string; text?: string; annotations?: Array<{ type?: string; title?: string; url?: string }> }> }> };

async function executeResearch(model: string, instructions: string, query: string, domains: string[]) {
  const response = await fetch("https://api.openai.com/v1/responses", { method: "POST", headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}`, "Content-Type": "application/json" }, body: JSON.stringify({ model, store: false, instructions: `${instructions}\nAnswer only from retrieved authoritative evidence. State limitations and never fabricate a citation.`, input: query, tools: [{ type: "web_search", filters: { allowed_domains: domains }, search_context_size: "high" }], tool_choice: "required" }) });
  if (!response.ok) throw new Error(`Authoritative research failed (${response.status}).`);
  const payload = (await response.json()) as ResponsesPayload;
  const content = payload.output?.flatMap((item) => item.content || []) || [];
  const answer = payload.output_text || content.find((item) => item.type === "output_text")?.text || "";
  const retrievedAt = new Date().toISOString();
  const sources = Array.from(new Map(content.flatMap((item) => item.annotations || []).filter((item) => item.type === "url_citation" && item.url).map((item) => [item.url as string, { title: item.title || new URL(item.url as string).hostname, url: item.url as string, supportedClaim: "Supports the researched response.", retrievedAt }])).values());
  if (!answer || sources.length === 0) throw new Error("Authoritative research returned no attributable evidence.");
  return { answer, sources };
}

export function parseRuntimePlan(payload: ResponsesPayload): RuntimePlan {
  const text = payload.output_text || payload.output?.flatMap((item) => item.content || []).find((item) => item.type === "output_text")?.text;
  if (!text) throw new Error("The model returned no structured runtime plan.");
  const raw = JSON.parse(text) as RuntimePlan & { proposals?: Array<RuntimePlan["proposals"][number] & { fields: Array<{ name: string; value: string | number | boolean | null }> }>; toolCalls?: Array<{ name: string; arguments: Array<{ name: string; value: unknown }> }> };
  if (!raw || typeof raw.response !== "string" || !Array.isArray(raw.proposals) || !Array.isArray(raw.toolCalls)) {
    throw new Error("The model returned a malformed runtime plan.");
  }
  const proposals = raw.proposals.map((proposal) => {
    if (!Array.isArray(proposal.fields)) throw new Error("The model returned malformed structured fields.");
    return { ...proposal, fields: Object.fromEntries(proposal.fields.map((field) => [field.name, field.value])) };
  });
  const toolCalls = raw.toolCalls.map((call) => {
    if (!Array.isArray(call.arguments)) throw new Error("The model returned malformed tool arguments.");
    return { name: call.name, arguments: Object.fromEntries(call.arguments.map((argument) => [argument.name, argument.value])) };
  });
  return { ...raw, proposals, toolCalls };
}

export function validateRuntimePlan(context: RuntimeContext, plan: RuntimePlan) {
  const config = requireProfessionalConfig(context.professionalId);
  const validationFailures: string[] = [];
  const tools = validateToolCalls(config, plan.toolCalls);
  validationFailures.push(...tools.failures);
  const navigation = validateNavigationTarget(config, plan.navigationTarget);
  if (plan.navigationTarget && !navigation) validationFailures.push(`Rejected unknown navigation target ${plan.navigationTarget}.`);
  const proposals = plan.intent === "clarification" || context.message.text.trim().endsWith("?")
    ? []
    : plan.proposals.filter((proposal) => proposal.sourceMessageId === context.message.id && proposal.approvalStatus === "proposed");
  if (proposals.length !== plan.proposals.length) validationFailures.push("Rejected one or more unsafe structured proposals.");
  const research = plan.research && config.researchDomains.length
    ? { ...plan.research, query: deidentifyResearchQuery(plan.research.query), domains: plan.research.domains.filter((domain) => config.researchDomains.includes(domain)) }
    : null;
  if (plan.research && (!research || research.domains.length === 0)) validationFailures.push("Rejected research outside the professional source policy.");
  const handoff = plan.handoff && config.handoffs.includes(plan.handoff.professionalId) ? plan.handoff : null;
  if (plan.handoff && !handoff) validationFailures.push("Rejected an unauthorized professional handoff.");
  return { ...plan, proposals, navigationTarget: navigation?.href || null, toolCalls: tools.accepted, research, handoff, validationFailures };
}

export async function runDigitalStaffRuntime(context: RuntimeContext): Promise<RuntimeResult> {
  const startedAt = Date.now();
  const config = requireProfessionalConfig(context.professionalId);
  const model = process.env.OPENAI_DIGITAL_STAFF_MODEL || "gpt-5";
  if (!process.env.OPENAI_API_KEY) throw new Error("Digital Staff model runtime is not configured.");
  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model, store: false, instructions: buildRuntimeInstructions(config), input: buildRuntimeInput(config, context),
      text: { format: { type: "json_schema", name: "digital_staff_runtime_plan", strict: true, schema: runtimeJsonSchema } },
    }),
  });
  if (!response.ok) throw new Error(`Digital Staff model request failed (${response.status}).`);
  const validated = validateRuntimePlan(context, parseRuntimePlan((await response.json()) as ResponsesPayload));
  const research = validated.research ? await executeResearch(model, buildRuntimeInstructions(config), validated.research.query, validated.research.domains) : null;
  return { ...validated, response: research?.answer || validated.response, model, latencyMs: Date.now() - startedAt, researchSources: research?.sources || [] };
}
