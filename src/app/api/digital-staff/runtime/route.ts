import { advisorGoalColumns, advisorGoalFilters } from "@/lib/platform/goalConnections";
import { NextResponse } from "next/server";
import { acquireDigitalStaffRequestLease, applyApprovedKnowledgeProposal, saveKnowledgeProposalDecision, buildMoneyCoachStructuredRecords, classifyDigitalStaffFailure, moneyCoachCashSettingsColumns, moneyCoachFundingSourceColumns, reportDigitalStaffLifecycle, runDigitalStaffRuntime, requireProfessionalConfig, safeDigitalStaffFailure, type ConversationState, type DigitalStaffActivity, type ProfessionalId, type RuntimeMessage, type RuntimeObserver, type StructuredKnowledgeProposal } from "@/lib/digitalStaffRuntime";
import { digitalStaffTelemetryRecord, firstPartyErrorCategoryFromDigitalStaff, recordServerFirstPartyTelemetry } from "@/lib/server/firstPartyTelemetry";
import { createRouteClient } from "@/lib/supabase/server";
import { requireProfessionalEntitlement } from "@/lib/memberAgeServer";
import { buildMemberSpecialistContextPacket, isMemberSpecialistId } from "@/lib/memberAgentCapabilityFramework";

import { loadSelectedVeteranClaim } from "@/lib/health/veteranClaimsPersistence";
import { scopeVeteransHistory, type VeteransTurnSelection } from "@/lib/health/veteransContext";
import { VeteransEvidenceUnavailable, veteransEvidenceFailureCode, VeteransSaveUnconfirmed, veteransSaveFailureCode } from "@/lib/health/veteransSave";
import { loadAdvisorDocuments, parseAdvisorDocumentIds } from "@/lib/health/advisorDocuments";
import { guidanceCounselorContextQueries } from "@/lib/digitalStaffRuntime/educationContext";
export const maxDuration = 180;
export const dynamic = "force-dynamic";
const maxMessageLength = 4_000;
const privateResponseHeaders = { "Cache-Control": "private, no-store" } as const;
function privateJson(body: unknown, init?: number | ResponseInit) {
  const responseInit = typeof init === "number" ? { status: init } : init;
  return NextResponse.json(body, { ...responseInit, headers: { ...privateResponseHeaders, ...(responseInit?.headers || {}) } });
}
const emptyState: ConversationState = { currentTopic: null, currentWorkspace: null, lastProfessionalQuestion: null, unresolvedQuestions: [], corrections: [], pendingApprovals: [], currentGoal: null, previousDecisions: [] };

type MessageRow = { id: string; sender: { kind?: string }; content: string | { text?: string; runtime?: { proposals?: StructuredKnowledgeProposal[]; veteransSelection?: VeteransTurnSelection; sourceMessageId?:string } }; created_at: string };

function messageText(content: MessageRow["content"]) { return typeof content === "string" ? content : typeof content?.text === "string" ? content.text : ""; }

async function loadStructuredRecords(supabase: ReturnType<typeof createRouteClient>, ownerId: string, professionalId: string) {
  const timed = async <T,>(promise: PromiseLike<T>) => {
    const startedAt = Date.now();
    const result = await promise;
    return { result, durationMs: Date.now() - startedAt };
  };
  if (professionalId === "beastmoney.money-coach") {
    const [debts, bills, incomes, cashSettings, fundingSources, goals, debtSettings, retirementScenarios] = await Promise.all([
      timed(supabase.from("debts").select("id, name, balance, minimum_payment, interest_rate, due_date, next_due_date_after_payment, payment_behavior, lifecycle_status, paid_off_at, is_archived, created_at").eq("user_id", ownerId).order("created_at", { ascending: false }).limit(200)),
      timed(supabase.from("bill_events").select("id, name, amount, frequency, due_date, next_due_date_after_payment, assigned_income_date, is_archived, created_at").eq("user_id", ownerId).order("created_at", { ascending: false }).limit(200)),
      timed(supabase.from("income_events").select("id, name, amount, frequency, next_date, is_active, is_archived, created_at").eq("user_id", ownerId).order("next_date", { ascending: true }).limit(200)),
      timed(supabase.from("cash_settings").select(moneyCoachCashSettingsColumns).eq("user_id", ownerId).maybeSingle()),
      timed(supabase.from("funding_sources").select(moneyCoachFundingSourceColumns).eq("user_id", ownerId).eq("is_active", true).order("created_at", { ascending: true }).limit(200)),
      timed(supabase.from("beast_goals").select(advisorGoalColumns).eq("owner_id", ownerId).or(advisorGoalFilters.money).is("deleted_at", null).neq("status", "Archived").order("updated_at", { ascending: false }).limit(100)),
      timed(supabase.from("debt_settings").select("strategy, extra_payment, custom_debt_order").eq("user_id", ownerId).maybeSingle()),
      timed(supabase.from("retirement_scenarios").select("id, name, assumptions, updated_at").eq("owner_id", ownerId).order("updated_at", { ascending: false }).limit(3)),
    ]);
    const results = [debts, bills, incomes, cashSettings, fundingSources, goals, debtSettings, retirementScenarios];
    const error = results.find((item) => item.result.error)?.result.error || null;
    return {
      queryCount: results.length,
      error,
      canonicalRecordsComplete: !error
        && (debts.result.data || []).length < 200
        && (bills.result.data || []).length < 200
        && (incomes.result.data || []).length < 200
        && (fundingSources.result.data || []).length < 200
        && (goals.result.data || []).length < 100
        && (retirementScenarios.result.data || []).length < 3,
      timings: {
        debtLoadMs: debts.durationMs,
        billLoadMs: bills.durationMs,
        incomeLoadMs: incomes.durationMs,
        otherFinancialContextLoadMs: Math.max(cashSettings.durationMs, fundingSources.durationMs, goals.durationMs, debtSettings.durationMs, retirementScenarios.durationMs),
      },
      records: error ? [] : buildMoneyCoachStructuredRecords({
        debts: (debts.result.data || []) as Record<string, unknown>[],
        bills: (bills.result.data || []) as Record<string, unknown>[],
        incomes: (incomes.result.data || []) as Record<string, unknown>[],
        cashSettings: cashSettings.result.data as Record<string, unknown> | null,
        fundingSources: (fundingSources.result.data || []) as Record<string, unknown>[],
        goals: (goals.result.data || []) as Record<string, unknown>[],
        debtSettings: debtSettings.result.data as Record<string, unknown> | null,
        retirementScenarios: (retirementScenarios.result.data || []) as Record<string, unknown>[],
      }),
    };
  }
  const queries = professionalId === "beasteducation.guidance-counselor"
      ? guidanceCounselorContextQueries(supabase, ownerId)
      : professionalId === "beasthealth.health-advisor"
        ? [supabase.from("beast_health_records").select("id, record_type, title, status, occurred_on, source, notes, details, updated_at").eq("owner_id", ownerId).neq("status", "archived").order("updated_at", { ascending: false }).limit(200), supabase.from("beast_goals").select(advisorGoalColumns).eq("owner_id", ownerId).or(advisorGoalFilters.health).is("deleted_at", null).neq("status", "Archived").order("updated_at", { ascending: false }).limit(20)]
        : [supabase.from("beast_goals").select("id, title, category, status, target_date, current_step, updated_at").eq("owner_id", ownerId).order("updated_at", { ascending: false }).limit(20)];
  const results = await Promise.all(queries);
  return {
    queryCount: queries.length,
    error: results.find((result) => result.error)?.error || null,
    canonicalRecordsComplete: results.every((result, index) => {
      if (result.error) return false;
      const fetched = (result.data || []).length;
      const limit = professionalId === "beasteducation.guidance-counselor"
        ? (index === 0 ? 1 : index === 1 ? 19 : 20)
        : professionalId === "beasthealth.health-advisor" ? (index === 0 ? 200 : 20) : 20;
      return index === 0 && professionalId === "beasteducation.guidance-counselor"
        ? fetched <= 1
        : fetched < limit;
    }),
    timings: { debtLoadMs: null, billLoadMs: null, incomeLoadMs: null, otherFinancialContextLoadMs: null },
    records: results.flatMap((result, index) => result.error ? [] : (result.data || []).map((record) => { const row = record as Record<string, unknown>; return { domain: ((professionalId === "beasthealth.health-advisor" && index === 1) || (professionalId === "beasteducation.guidance-counselor" && index === 2)) ? `${professionalId}:goals` : `${professionalId}:${index}`, record: ((professionalId === "beasthealth.health-advisor" && index === 1) || (professionalId === "beasteducation.guidance-counselor" && index === 2)) ? { ...row, context_note: "Member goal: an aspiration to consider in advice, not an achieved fact or authorization to change records." } : record, updatedAt: typeof row.updated_at === "string" ? row.updated_at : undefined }; })),
  };
}

export async function POST(request: Request) {
  const requestStartedAt = Date.now();
  const requestId = crypto.randomUUID();
  const supabase = createRouteClient();
  const authenticationStartedAt = Date.now();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  const authenticationMs = Date.now() - authenticationStartedAt;
  if (authError || !user) return privateJson({ error: "Authentication required." }, 401);
  const requestParsingStartedAt = Date.now();
  let body: { professionalId?: unknown; conversationId?: unknown; message?: unknown; workspace?: unknown; veteranClaimId?: unknown; documentIds?: unknown; proposalId?: unknown; decision?: unknown; editedFields?: unknown };
  try { body = (await request.json()) as typeof body; } catch { return privateJson({ error: "A valid request is required." }, 400); }
  const professionalId = typeof body.professionalId === "string" ? body.professionalId : "";
  const conversationId = typeof body.conversationId === "string" ? body.conversationId : "";
  const text = typeof body.message === "string" ? body.message.trim() : "";
  const requestParsingMs = Date.now() - requestParsingStartedAt;
  try { requireProfessionalConfig(professionalId); } catch { return privateJson({ error: "Unknown Digital Staff professional." }, 400); }
  if (!conversationId) return privateJson({ error: "Conversation is required." }, 400);
  const isProposalDecision = body.decision === "approve" || body.decision === "reject";
  if (!isProposalDecision && (!text || text.length > maxMessageLength)) return privateJson({ error: "A message is required." }, 400);

  let documentIds: string[];
  try { documentIds = parseAdvisorDocumentIds(body.documentIds, professionalId); }
  catch { return privateJson({error: "Select up to two Health documents for this message."}, 400); }
  const entitlementStartedAt = Date.now();
  const entitlementPromise = requireProfessionalEntitlement(professionalId, { supabase, user })
    .then((result) => ({ result, durationMs: Date.now() - entitlementStartedAt }));
  const conversationAccessStartedAt = Date.now();
  const conversationPromise = supabase.from("agent_conversations").select("id, agent_id, summary, message_count").eq("id", conversationId).eq("owner_id", user.id).eq("agent_id", professionalId).maybeSingle()
    .then((result) => ({ result, durationMs: Date.now() - conversationAccessStartedAt }));

  const entitlement = await entitlementPromise;
  const ageEntitlement = entitlement.result;
  if (!ageEntitlement.ok) return privateJson({ error: ageEntitlement.status === 428 ? "Add your birthday before opening this workspace." : "This Digital Staff professional is unavailable for the current member profile." }, ageEntitlement.status);
  const contextPromise = !isProposalDecision
    ? (() => {
        const startedAt = Date.now();
        const timed = async <T,>(promise: PromiseLike<T>) => {
          const queryStartedAt = Date.now();
          const result = await promise;
          return { result, durationMs: Date.now() - queryStartedAt };
        };
        return Promise.all([
          timed(supabase.from("agent_conversation_messages").select("id, sender, content, created_at").eq("conversation_id", conversationId).eq("owner_id", user.id).order("created_at", { ascending: false }).limit(professionalId === "beasthealth.health-advisor" ? 32 : 12)),
          timed(supabase.from("agent_memories").select("memory_key, value, updated_at").eq("owner_id", user.id).eq("agent_id", professionalId).order("updated_at", { ascending: false }).limit(professionalId === "beasthealth.health-advisor" ? 16 : 8)),
          timed(loadStructuredRecords(supabase, user.id, professionalId)),
        ]).then(([history, memory, structured]) => ({ history, memory, structured, durationMs: Date.now() - startedAt }));
      })()
    : null;
  const conversationAccess = await conversationPromise;
  const conversationResult = conversationAccess.result;
  if (conversationResult.error || !conversationResult.data) return privateJson({ error: "Conversation is not available for this member and professional." }, 404);
  const conversation = conversationResult.data;

  if (isProposalDecision) {
    const proposalId = typeof body.proposalId === "string" ? body.proposalId : "";
    if (!proposalId) return privateJson({ error: "A proposal ID is required." }, 400);
    const proposalMessages = await supabase.from("agent_conversation_messages").select("id, sender, content, created_at").eq("conversation_id", conversationId).eq("owner_id", user.id).eq("sender->>kind", "agent").order("created_at", { ascending: false }).limit(50);
    const proposalMessage = (proposalMessages.data || []).find((message) => {
      const content = message.content;
      const runtime = content && typeof content === "object" && !Array.isArray(content) ? (content as { runtime?: { proposals?: StructuredKnowledgeProposal[] } }).runtime : null;
      return runtime?.proposals?.some((item) => item.id === proposalId);
    });
    const latest = proposalMessage || null;
    const runtime = latest?.content && typeof latest.content === "object" && !Array.isArray(latest.content) ? (latest.content as { runtime?: { proposals?: StructuredKnowledgeProposal[] } }).runtime : null;
    const proposal = runtime?.proposals?.find((item) => item.id === proposalId);
    if (!proposal) return privateJson({ error: "That proposal is not available for this owner-scoped conversation." }, 404);
    if (proposal.approvalStatus !== "proposed") return privateJson({error: "That proposal already has a decision."}, 409);
    if (body.decision === "reject") {
      try {
        const decision = await saveKnowledgeProposalDecision({client:supabase,ownerId:user.id,conversationId,professionalId:professionalId as ProfessionalId,messageId:latest!.id,content:latest!.content as Parameters<typeof saveKnowledgeProposalDecision>[0]["content"],proposalId,status:"rejected"});
        return privateJson(decision);
      } catch (error) {return privateJson({...safeDigitalStaffFailure("proposal-decision",error,requestId),code:"proposal_decision_unconfirmed"},409);}
    }
    const editedFields = body.editedFields && typeof body.editedFields === "object" && !Array.isArray(body.editedFields) ? body.editedFields as Record<string, string | number | boolean | null> : undefined;
    try {
      const result = await applyApprovedKnowledgeProposal({ client: supabase, ownerId: user.id, professionalId: professionalId as ProfessionalId, proposal, editedFields });
      await saveKnowledgeProposalDecision({client:supabase,ownerId:user.id,conversationId,professionalId:professionalId as ProfessionalId,messageId:latest!.id,content:latest!.content as Parameters<typeof saveKnowledgeProposalDecision>[0]["content"],proposalId,status:"approved",recordId:result.recordId});
      return privateJson({ result });
    } catch (error) {
      return privateJson({...safeDigitalStaffFailure("proposal-decision", error, requestId),code:"proposal_decision_unconfirmed"}, 422);
    }
  }
  const requestLease = acquireDigitalStaffRequestLease(user.id, professionalId);
  if (!requestLease.ok) {
    return privateJson(
      { error: "Another Digital Staff request is already being handled. Please retry shortly." },
      { status: 429, headers: { "Retry-After": String(requestLease.retryAfterSeconds) } }
    );
  }
  const contextObserverActivity = async (observer: RuntimeObserver, activity: DigitalStaffActivity) => observer.onActivity?.(activity);
  // These reads are independent and intentionally overlap the conversation authorization read.
  const now = new Date().toISOString();
  const message: RuntimeMessage = { id: crypto.randomUUID(), role: "user", text, createdAt: now };
  const summary = conversation.summary as { runtimeState?: ConversationState; veteransSelection?:VeteransTurnSelection|null } | null;
  const executeTurn = async (observer: RuntimeObserver = {}) => {
    await contextObserverActivity(observer, "loading_context");
    const contextResult = contextPromise ? await contextPromise : null;
    if (!contextResult) throw new Error("Relevant conversation context is temporarily unavailable.");
    const historyResult = contextResult.history.result;
    const memoryResult = contextResult.memory.result;
    const structuredResult = contextResult.structured.result;
    const structuredRecords = [...structuredResult.records];
    const isVeterans = professionalId === "beasthealth.health-advisor" && (body.workspace === "/dashboard/health/veterans" || Boolean(body.veteranClaimId));
    let selectedDocuments: Awaited<ReturnType<typeof loadAdvisorDocuments>>;
    let selectedClaim: Awaited<ReturnType<typeof loadSelectedVeteranClaim>> | null;
    try {
      selectedDocuments = await loadAdvisorDocuments(supabase, user.id, documentIds);
      selectedClaim = isVeterans && body.veteranClaimId ? await loadSelectedVeteranClaim(supabase,user.id,body.veteranClaimId) : null;
    } catch(error) {
      if(isVeterans)throw new VeteransEvidenceUnavailable();
      throw error;
    }
    const veteransSelection:VeteransTurnSelection|null = isVeterans ? {version:1,
      claim:selectedClaim ? {id:selectedClaim.claim.id,revision:selectedClaim.claim.revision,updatedAt:selectedClaim.updatedAt} : null,
      documents:selectedDocuments.map(doc=>({id:doc.id,sha256:doc.provenance?.sha256 || null,updatedAt:doc.provenance?.updatedAt || null})).sort((a,b)=>a.id.localeCompare(b.id)),
    } : null;
    const scopedHistory = scopeVeteransHistory(([...(historyResult.data || [])] as MessageRow[]).reverse(),veteransSelection,summary?.veteransSelection,summary?.runtimeState || emptyState);
    if (historyResult.error || memoryResult.error) throw new Error("Relevant conversation context is temporarily unavailable.");
    if (structuredResult.error) throw new Error("Canonical context query failed.");
    const contextLoadMs = contextResult.durationMs;
    let firstUsefulOutputMs: number | null = null;
    const runtimeObserver: RuntimeObserver = {
      ...observer,
      onResponseDelta: async (delta) => {
        if (firstUsefulOutputMs === null && delta) firstUsefulOutputMs = Date.now() - requestStartedAt;
        await observer.onResponseDelta?.(delta);
      },
    };
    const result = await runDigitalStaffRuntime({
      ownerId: user.id, professionalId: professionalId as ProfessionalId, conversationId, message, requestId, signal: AbortSignal.any([request.signal, AbortSignal.timeout(170_000)]),
      recentMessages: professionalId === "beasthealth.health-advisor" ? scopedHistory.messages : ([...(historyResult.data || [])] as MessageRow[]).reverse().map((row) => ({ id: row.id, role: row.sender?.kind === "user" ? "user" : "assistant", text: messageText(row.content), createdAt: row.created_at })),
      state: professionalId === "beasthealth.health-advisor" ? scopedHistory.state : summary?.runtimeState || emptyState,
      memories: (veteransSelection ? [] : memoryResult.data || []).map((row) => ({ key: String(row.memory_key), value: row.value, updatedAt: String(row.updated_at) })),
      structuredRecords,
      documents: selectedDocuments,
      ...(veteransSelection ? {veterans:{selection:veteransSelection,memberClaim:selectedClaim?.claim || null}} : {}),
      contextBoundary: isMemberSpecialistId(professionalId)
        ? buildMemberSpecialistContextPacket({
            config: requireProfessionalConfig(professionalId),
            ageBand: ageEntitlement.decision.ageStatus,
            sources: [
              ...structuredRecords.slice(0, 20).map((record) => ({ domain: record.domain, provenance: "canonical-record" as const, updatedAt: record.updatedAt || null })),
              ...(veteransSelection ? scopedHistory.messages.slice(-1).map(record=>({domain:professionalId,provenance:"current-conversation" as const,updatedAt:record.createdAt})) : (historyResult.data || []).slice(-1).map((record) => ({ domain: professionalId, provenance: "current-conversation" as const, updatedAt: String(record.created_at) }))),
              ...(veteransSelection ? [] : (memoryResult.data || []).slice(0, 1).map((record) => ({ domain: professionalId, provenance: "current-agent-memory" as const, updatedAt: String(record.updated_at) }))),
            ],
            canonicalRecordsComplete: structuredResult.canonicalRecordsComplete,
            recentConversationCount: Number(conversation.message_count || 0),
            currentAgentMemoryCount: (memoryResult.data || []).length === 8 ? 9 : (memoryResult.data || []).length,
          })
        : undefined,
      workspace: typeof body.workspace === "string" ? body.workspace : null,
    }, runtimeObserver);
    await observer.onActivity?.("persisting");
    const persistenceStartedAt = Date.now();
    const assistantMessageId = crypto.randomUUID();
    const persistedAt = new Date().toISOString();
    const messageInsert = supabase.from("agent_conversation_messages").insert([
      { id: message.id, owner_id: user.id, conversation_id: conversationId, sender: { kind: "user", id: user.id }, recipient: { kind: "agent", id: professionalId }, content: text, created_at: message.createdAt },
      { id: assistantMessageId, owner_id: user.id, conversation_id: conversationId, sender: { kind: "agent", id: professionalId }, recipient: { kind: "module", id: professionalId.split(".")[0] }, content: { text: result.response, runtime: { ...(veteransSelection ? {veteransSelection,sourceMessageId:message.id} : {}), intent: result.intent, proposals: result.proposals, navigationTarget: result.navigationTarget, toolCalls: result.toolCalls, researchSources: result.researchSources, handoff: result.handoff, validationFailures: result.validationFailures, ...(professionalId === "beastmoney.money-coach" ? { financialAnalysis: result.financialAnalysis, financialEvidenceAsOf: (structuredRecords.find(record => record.domain === "beastmoney.money-coach:canonical-affordability")?.record as {asOf?:string} | undefined)?.asOf || null } : {}), model: result.model, latencyMs: result.latencyMs } }, created_at: persistedAt },
    ]);
    const messageSave = veteransSelection ? await messageInsert.select("id,owner_id,conversation_id") : await messageInsert;
    if (messageSave.error || (veteransSelection && (!messageSave.data || messageSave.data.length!==2 || new Set(messageSave.data.map(row=>row.id)).size!==2 || messageSave.data.some(row=>![message.id,assistantMessageId].includes(row.id) || row.owner_id!==user.id || row.conversation_id!==conversationId)))) {
      if(veteransSelection)throw new VeteransSaveUnconfirmed();
      throw new Error("The generated response could not be persisted.");
    }
    let confirmedMessageCount = Number(conversation.message_count || 0) + 2;
    if(veteransSelection){
      // A previous interrupted save may already have inserted messages. Recount,
      // rather than fabricating an old summary count + two as the actual total.
      const countResult=await supabase.from("agent_conversation_messages").select("id",{count:"exact",head:true}).eq("owner_id",user.id).eq("conversation_id",conversationId);
      if(countResult.error || !Number.isSafeInteger(countResult.count) || countResult.count! < confirmedMessageCount)throw new VeteransSaveUnconfirmed();
      confirmedMessageCount=countResult.count!;
    }
    const previousSummary = conversation.summary as Record<string, unknown> | null;
    const summaryUpdate = supabase.from("agent_conversations").update({
      message_count: confirmedMessageCount,
      summary: { ...(previousSummary || {}), ...(professionalId === "beasthealth.health-advisor" ? {veteransSelection} : {}), overview: result.response.slice(0, 500), decisions: result.state.previousDecisions, unresolvedFollowUps: result.state.unresolvedQuestions, runtimeState: result.state, updatedAt: persistedAt },
      related_action_ids: [result.navigationTarget, ...result.toolCalls.map((call) => call.name)].filter(Boolean), updated_at: persistedAt,
    }).eq("id", conversationId).eq("owner_id", user.id).eq("agent_id", professionalId);
    if(veteransSelection){
      const saved = await summaryUpdate.eq("message_count",Number(conversation.message_count || 0)).select("id,message_count").maybeSingle();
      if(saved.error || !saved.data || saved.data.id!==conversationId || saved.data.message_count!==confirmedMessageCount)throw new VeteransSaveUnconfirmed();
    } else {
      const {error:summaryError}=await summaryUpdate;
      if(summaryError)throw new Error("The conversation continuity state could not be persisted.");
    }
    result.timings.contextAssemblyMs = contextLoadMs;
    result.timings.persistenceMs = Date.now() - persistenceStartedAt;
    result.timings.totalMs = Date.now() - requestStartedAt;
    result.timings.firstUsefulOutputMs = firstUsefulOutputMs;
    result.latencyMs = result.timings.totalMs;
    reportDigitalStaffLifecycle(requestId, professionalId, {
      totalMs: result.timings.totalMs,
      authenticationMs,
      requestParsingMs,
      entitlementMs: entitlement.durationMs,
      conversationAccessMs: conversationAccess.durationMs,
      contextLoadMs,
      historyLoadMs: contextResult.history.durationMs,
      memoryLoadMs: contextResult.memory.durationMs,
      structuredRecordLoadMs: contextResult.structured.durationMs,
      debtLoadMs: structuredResult.timings.debtLoadMs || null,
      billLoadMs: structuredResult.timings.billLoadMs || null,
      incomeLoadMs: structuredResult.timings.incomeLoadMs || null,
      otherFinancialContextLoadMs: structuredResult.timings.otherFinancialContextLoadMs || null,
      historyCount: (historyResult.data || []).length,
      memoryCount: (memoryResult.data || []).length,
      structuredRecordCount: structuredRecords.length,
      databaseQueryCount: 6 + structuredResult.queryCount + (veteransSelection ? 1 : 0),
      initialModelMs: result.timings.initialModelMs,
      firstModelOutputMs: result.timings.firstModelOutputMs,
      providerResponseHeadersMs: result.timings.providerResponseHeadersMs || null,
      providerFirstEventMs: result.timings.providerFirstEventMs || null,
      providerCompleteMs: result.timings.providerCompleteMs || null,
      validationMs: result.timings.validationMs || null,
      promptConstructionMs: result.timings.promptConstructionMs || null,
      promptCharacters: result.timings.promptCharacters || null,
      firstUsefulOutputMs,
      providerInvocationCount: result.timings.providerInvocationCount,
      semanticVerifierInvocationCount: result.timings.semanticVerifierInvocationCount,
      semanticVerifierMs: result.timings.semanticVerifierMs,
      semanticVerifierFailureCount: result.timings.semanticVerifierFailureCount,
      toolCallCount: result.toolCalls.length,
      researchMs: result.timings.researchMs,
      researchValidationMs: result.timings.researchValidationMs,
      persistenceMs: result.timings.persistenceMs,
    });
    const completedTelemetry = digitalStaffTelemetryRecord({
      professionalId,
      status: "completed",
      latencyMs: result.timings.totalMs,
      model: result.model,
    });
    if (completedTelemetry) {
      void recordServerFirstPartyTelemetry({
        actorId: user.id,
        record: completedTelemetry,
      });
    }
    await observer.onActivity?.("complete");
    return { message, assistantMessageId, result };
  };

  if (request.headers.get("accept")?.includes("application/x-ndjson")) {
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        const send = (event: unknown) => controller.enqueue(encoder.encode(`${JSON.stringify(event)}\n`));
        const observer: RuntimeObserver = {
          onActivity: (activity: DigitalStaffActivity) => send({ type: "activity", activity }),
          onResponseDelta: (delta: string) => send({ type: "response_delta", delta }),
        };
        try {
          send({ type: "acknowledged", message });
          const payload = await executeTurn(observer);
          send({ type: "complete", payload });
        } catch (error) {
          const failedTelemetry = digitalStaffTelemetryRecord({
            professionalId,
            status: "failed",
            latencyMs: Date.now() - requestStartedAt,
            errorCategory: firstPartyErrorCategoryFromDigitalStaff(
              classifyDigitalStaffFailure("runtime-stream", error)
            ),
          });
          if (failedTelemetry) {
            void recordServerFirstPartyTelemetry({
              actorId: user.id,
              record: failedTelemetry,
            });
          }
          send({ type: "error", ...safeDigitalStaffFailure("runtime-stream", error, requestId), ...(error instanceof VeteransSaveUnconfirmed ? {code:veteransSaveFailureCode} : error instanceof VeteransEvidenceUnavailable ? {code:veteransEvidenceFailureCode} : {}) });
        } finally {
          requestLease.release();
          controller.close();
        }
      },
    });
    return new Response(stream, {
      headers: { "Content-Type": "application/x-ndjson; charset=utf-8", "Cache-Control": "private, no-store, no-transform" },
    });
  }

  try {
    return privateJson(await executeTurn());
  } catch (error) {
    const failedTelemetry = digitalStaffTelemetryRecord({
      professionalId,
      status: "failed",
      latencyMs: Date.now() - requestStartedAt,
      errorCategory: firstPartyErrorCategoryFromDigitalStaff(
        classifyDigitalStaffFailure("runtime-route", error)
      ),
    });
    if (failedTelemetry) {
      void recordServerFirstPartyTelemetry({
        actorId: user.id,
        record: failedTelemetry,
      });
    }
    return privateJson({...safeDigitalStaffFailure("runtime-route", error, requestId), ...(error instanceof VeteransSaveUnconfirmed ? {code:veteransSaveFailureCode} : error instanceof VeteransEvidenceUnavailable ? {code:veteransEvidenceFailureCode} : {})}, 502);
  } finally {
    requestLease.release();
  }
}
