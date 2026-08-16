import { requireProfessionalConfig } from "./config";
import { inferProductNavigationTarget, validateNavigationTarget } from "./navigation";
import { buildRuntimeInput, buildRuntimeInstructions, runtimeJsonSchema } from "./prompt";
import { applyDigitalStaffInteractionPolicy, requestsConsequentialAction } from "./interactionPolicy";
import { requestOpenAIResponseStream } from "./provider";
import { deidentifyResearchQuery, validateToolCalls } from "./tools";
import type { RuntimeContext, RuntimeObserver, RuntimePlan, RuntimeResult } from "./types";

type ResponsesPayload = { output_text?: string; output?: Array<{ content?: Array<{ type?: string; text?: string; annotations?: Array<{ type?: string; title?: string; url?: string }> }> }> };

async function executeResearch(
  model: string,
  instructions: string,
  query: string,
  domains: string[],
  observer: RuntimeObserver,
  requestId?: string,
  signal?: AbortSignal
) {
  const payload = await requestOpenAIResponseStream<ResponsesPayload>({ model, store: false, instructions: `${instructions}\nAnswer only from retrieved authoritative evidence. State limitations and never fabricate a citation.`, input: query, tools: [{ type: "web_search", filters: { allowed_domains: domains }, search_context_size: "high" }], tool_choice: "required" }, {
    requestId,
    signal,
    onFirstOutput: observer.onFirstModelOutput,
    onOutputTextDelta: observer.onResponseDelta,
  });
  const content = payload.output?.flatMap((item) => item.content || []) || [];
  const answer = payload.output_text || content.find((item) => item.type === "output_text")?.text || "";
  const retrievedAt = new Date().toISOString();
  const sources = Array.from(new Map(content.flatMap((item) => item.annotations || []).filter((item) => item.type === "url_citation" && item.url).map((item) => [item.url as string, { title: item.title || new URL(item.url as string).hostname, url: item.url as string, supportedClaim: "Supports the researched response.", retrievedAt }])).values());
  if (!answer || sources.length === 0) throw new Error("Authoritative research returned no attributable evidence.");
  return { answer, sources };
}

export function requiresDeterministicResearch(context: Pick<RuntimeContext, "professionalId" | "message">) {
  const text = context.message.text;
  if (isDeclarativeMemberStatement(text)) return false;
  if (!/\b(?:current|currently|latest|today|now|official|according to)\b/i.test(text)) return false;
  if (/\bcurrent\s+(?:medications?|debts?|goals?|priorit(?:y|ies)|records?|plan)\b/i.test(text)) return false;
  const externalAuthority = context.professionalId === "beastmoney.money-coach"
    ? /\b(?:irs|tax|contribution|deduction|credit|limit|law|rule|guidance)\b/i
    : context.professionalId === "beasteducation.guidance-counselor"
      ? /\b(?:opm|federal\s+series|certifications?|qualifications?|requirements?|accreditation|rule|guidance)\b/i
      : context.professionalId === "beasthealth.health-advisor"
        ? /\b(?:fda|cdc|nih|medication|drug|treatment|warning|guidance|recommendation|evidence)\b/i
        : /\b(?:law|rule|requirements?|guidance|standard)\b/i;
  return externalAuthority.test(text);
}

/** A disclosed member fact is not itself a request for external research. */
export function isDeclarativeMemberStatement(text: string) {
  return !text.includes("?") && /^\s*(?:i|we|my)\b/i.test(text) && /\b(?:hold|have|take|work|served|graduated|prefer|priority|live|currently)\b/i.test(text);
}

export function isCanonicalContextQuestion(context: Pick<RuntimeContext, "professionalId" | "message">) {
  const text = context.message.text;
  if (requiresDeterministicResearch(context)) return false;
  return context.professionalId === "beastmoney.money-coach"
    ? /\b(?:can|could|should)\s+i\s+afford\b|\bmy\s+(?:cash|cash flow|finances?|debts?|bills?|income|budget|plan|records?)\b/i.test(text)
    : /\b(?:my|our)\s+(?:saved|current|existing)\s+(?:records?|context|plan|profile|goals?)\b/i.test(text);
}

export type DigitalStaffModelTier = "ordinary" | "strong";

export const defaultOrdinaryDigitalStaffModel = "gpt-5.6-luna";
export const defaultStrongDigitalStaffModel = "gpt-5";

type DigitalStaffModelEnvironment = {
  OPENAI_DIGITAL_STAFF_MODEL?: string;
  OPENAI_DIGITAL_STAFF_FAST_MODEL?: string;
  OPENAI_DIGITAL_STAFF_STRONG_MODEL?: string;
};

/**
 * Route deterministically from the member's request. This must stay cheaper than
 * the work it routes: no provider call, hidden classifier, or mutable member
 * state is involved.
 */
export function digitalStaffModelTier(context: RuntimeContext): DigitalStaffModelTier {
  const text = context.message.text;
  if (
    context.executionMode === "historical_reconciliation"
    || context.professionalId === "beastfusion.fusion-director"
    || requestsConsequentialAction(text)
    || requiresDeterministicResearch(context)
  ) {
    return "strong";
  }

  if (
    /\b(?:multi[-\s]?stage|multi[-\s]?step|deep(?:ly)?|authoritative|longitudinal)\b/i.test(text)
    || /\b(?:build|create|develop)\b.{0,80}\b(?:payoff|transition|career|financial)\b.{0,60}\b(?:strategy|plan)\b/i.test(text)
    || /\bcompare\b.{0,160}\b(?:avalanche|snowball|scenario|tradeoffs?)\b/i.test(text)
  ) {
    return "strong";
  }

  if (context.professionalId === "beasthealth.health-advisor") {
    const higherRiskHealthWork = /\b(?:chest\s+(?:pain|pressure)|shortness\s+of\s+breath|difficulty\s+breathing|faint(?:ing|ed)?|unresponsive|severe\s+(?:headache|bleeding|pain)|sudden\s+(?:weakness|confusion|vision\s+change)|overdose|suicid(?:e|al)|stroke|emergency|urgent|newly\s+prescribed|drug\s+interaction|medication\s+interaction|interact\s+with|change\s+(?:my\s+)?(?:medication|dose|treatment)|stop\s+(?:taking|my\s+medication)|start\s+(?:taking|a\s+medication)|analy[sz]e\s+(?:the\s+)?pattern|prioriti[sz]ed\s+clinician\s+discussion|intermittent\s+dizziness)\b/i;
    if (higherRiskHealthWork.test(text)) return "strong";
  }

  return "ordinary";
}

export function selectDigitalStaffModel(
  context: RuntimeContext,
  environment: DigitalStaffModelEnvironment = {
    OPENAI_DIGITAL_STAFF_MODEL: process.env.OPENAI_DIGITAL_STAFF_MODEL,
    OPENAI_DIGITAL_STAFF_FAST_MODEL: process.env.OPENAI_DIGITAL_STAFF_FAST_MODEL,
    OPENAI_DIGITAL_STAFF_STRONG_MODEL: process.env.OPENAI_DIGITAL_STAFF_STRONG_MODEL,
  }
) {
  const legacyOverride = environment.OPENAI_DIGITAL_STAFF_MODEL;
  return digitalStaffModelTier(context) === "strong"
    ? environment.OPENAI_DIGITAL_STAFF_STRONG_MODEL || legacyOverride || defaultStrongDigitalStaffModel
    : environment.OPENAI_DIGITAL_STAFF_FAST_MODEL || legacyOverride || defaultOrdinaryDigitalStaffModel;
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
  const productNavigation = plan.intent === "product_support"
    ? navigation || inferProductNavigationTarget(config, context.message.text)
    : navigation;
  const proposals = plan.intent === "clarification" || context.message.text.trim().endsWith("?")
    ? []
    : plan.proposals.filter((proposal) => proposal.sourceMessageId === context.message.id && proposal.approvalStatus === "proposed");
  if (proposals.length !== plan.proposals.length) validationFailures.push("Rejected one or more unsafe structured proposals.");
  const explicitlyRequestsAuthoritativeResearch = config.researchDomains.length > 0
    && (requiresDeterministicResearch(context) || /\b(?:authoritative|according to|what does .{0,40} say)\b/i.test(context.message.text));
  const canonicalContextQuestion = isCanonicalContextQuestion(context);
  const requestedResearch = explicitlyRequestsAuthoritativeResearch
    ? {
        query: context.message.text,
        reason: "The member explicitly requested current or authoritative evidence.",
        domains: config.researchDomains,
      }
    : isDeclarativeMemberStatement(context.message.text) || canonicalContextQuestion ? null : plan.research;
  if (plan.research && canonicalContextQuestion) {
    validationFailures.push("Rejected unnecessary external research for a context-answerable turn.");
  }
  const research = requestedResearch && config.researchDomains.length
    ? { ...requestedResearch, query: deidentifyResearchQuery(requestedResearch.query), domains: requestedResearch.domains.filter((domain) => config.researchDomains.includes(domain)) }
    : null;
  if (requestedResearch && (!research || research.domains.length === 0)) validationFailures.push("Rejected research outside the professional source policy.");
  const handoff = plan.handoff && config.handoffs.includes(plan.handoff.professionalId) ? plan.handoff : null;
  if (plan.handoff && !handoff) validationFailures.push("Rejected an unauthorized professional handoff.");
  const governed = applyDigitalStaffInteractionPolicy(context, {
    ...plan,
    proposals,
    navigationTarget: productNavigation?.href || null,
    toolCalls: tools.accepted,
    research,
    handoff,
  });
  const { policyFailures, ...governedPlan } = governed;
  return {
    ...governedPlan,
    validationFailures: [...validationFailures, ...policyFailures],
  };
}

export async function runDigitalStaffRuntime(
  context: RuntimeContext,
  observer: RuntimeObserver = {},
  options: { modelOverride?: string } = {}
): Promise<RuntimeResult> {
  const startedAt = Date.now();
  const config = requireProfessionalConfig(context.professionalId);
  const model = options.modelOverride || selectDigitalStaffModel(context);
  await observer.onActivity?.("thinking");
  let firstModelOutputMs: number | null = null;
  let providerResponseHeadersMs: number | null = null;
  let providerFirstEventMs: number | null = null;
  let providerCompleteMs: number | null = null;
  const promptStartedAt = Date.now();
  const runtimeInput = buildRuntimeInput(config, context);
  const promptConstructionMs = Date.now() - promptStartedAt;
  const modelStartedAt = Date.now();
  const payload = await requestOpenAIResponseStream<ResponsesPayload>({
      model, store: false, instructions: buildRuntimeInstructions(config), input: runtimeInput,
      text: { format: { type: "json_schema", name: "digital_staff_runtime_plan", strict: true, schema: runtimeJsonSchema } },
  }, {
      requestId: context.requestId,
      signal: context.signal,
      onResponseHeaders: () => { providerResponseHeadersMs = Date.now() - startedAt; },
      onFirstEvent: () => {
        if (providerFirstEventMs === null) providerFirstEventMs = Date.now() - startedAt;
      },
      onFirstOutput: () => {
        if (firstModelOutputMs === null) firstModelOutputMs = Date.now() - startedAt;
        observer.onFirstModelOutput?.();
      },
      onComplete: () => { providerCompleteMs = Date.now() - startedAt; },
  });
  const initialModelMs = Date.now() - modelStartedAt;
  const validationStartedAt = Date.now();
  const validated = validateRuntimePlan(context, parseRuntimePlan(payload));
  const validationMs = Date.now() - validationStartedAt;
  let researchMs = 0;
  let researchValidationMs = 0;
  let research: Awaited<ReturnType<typeof executeResearch>> | null = null;
  if (validated.research && context.executionMode !== "historical_reconciliation") {
    await observer.onActivity?.("researching");
    const researchStartedAt = Date.now();
    research = await executeResearch(model, buildRuntimeInstructions(config), validated.research.query, validated.research.domains, observer, context.requestId, context.signal);
    researchMs = Date.now() - researchStartedAt;
    await observer.onActivity?.("validating_sources");
    const validationStartedAt = Date.now();
    if (research.sources.length === 0) throw new Error("Research sources could not be validated.");
    researchValidationMs = Date.now() - validationStartedAt;
  } else {
    await observer.onActivity?.("preparing_answer");
    await observer.onResponseDelta?.(validated.response);
  }
  const totalMs = Date.now() - startedAt;
  return {
    ...validated,
    response: research?.answer || validated.response,
    model,
    latencyMs: totalMs,
    timings: { totalMs, contextAssemblyMs: 0, initialModelMs, firstModelOutputMs, firstUsefulOutputMs: null, researchMs, researchValidationMs, persistenceMs: 0, providerResponseHeadersMs, providerFirstEventMs, providerCompleteMs, validationMs, promptConstructionMs, promptCharacters: runtimeInput.length },
    researchSources: research?.sources || [],
  };
}
