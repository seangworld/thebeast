import { NextResponse } from "next/server";
import { acquireDigitalStaffRequestLease, applyApprovedKnowledgeProposal, buildMoneyCoachStructuredRecords, classifyDigitalStaffFailure, guidanceCounselorCareerProfileItemColumns, guidanceCounselorEducationProfileColumns, moneyCoachCashSettingsColumns, moneyCoachFundingSourceColumns, reportDigitalStaffLifecycle, runDigitalStaffRuntime, requireProfessionalConfig, safeDigitalStaffFailure, type ConversationState, type DigitalStaffActivity, type ProfessionalId, type RuntimeMessage, type RuntimeObserver, type StructuredKnowledgeProposal } from "@/lib/digitalStaffRuntime";
import { digitalStaffTelemetryRecord, firstPartyErrorCategoryFromDigitalStaff, recordServerFirstPartyTelemetry } from "@/lib/server/firstPartyTelemetry";
import { createRouteClient } from "@/lib/supabase/server";
import { requireProfessionalEntitlement } from "@/lib/memberAgeServer";

export const dynamic = "force-dynamic";
const maxMessageLength = 4_000;
const emptyState: ConversationState = { currentTopic: null, currentWorkspace: null, lastProfessionalQuestion: null, unresolvedQuestions: [], corrections: [], pendingApprovals: [], currentGoal: null, previousDecisions: [] };

type MessageRow = { id: string; sender: { kind?: string }; content: string | { text?: string; runtime?: { proposals?: StructuredKnowledgeProposal[] } }; created_at: string };

function messageText(content: MessageRow["content"]) { return typeof content === "string" ? content : typeof content?.text === "string" ? content.text : ""; }

async function loadStructuredRecords(supabase: ReturnType<typeof createRouteClient>, ownerId: string, professionalId: string) {
  const timed = async <T,>(promise: PromiseLike<T>) => {
    const startedAt = Date.now();
    const result = await promise;
    return { result, durationMs: Date.now() - startedAt };
  };
  if (professionalId === "beastmoney.money-coach") {
    const [debts, bills, incomes, cashSettings, fundingSources, goals] = await Promise.all([
      timed(supabase.from("debts").select("id, name, balance, minimum_payment, interest_rate, due_date, next_due_date_after_payment, payment_behavior, lifecycle_status, paid_off_at, is_archived, created_at").eq("user_id", ownerId).order("created_at", { ascending: false }).limit(200)),
      timed(supabase.from("bill_events").select("id, name, amount, frequency, due_date, next_due_date_after_payment, assigned_income_date, is_archived, created_at").eq("user_id", ownerId).order("created_at", { ascending: false }).limit(200)),
      timed(supabase.from("income_events").select("id, name, amount, frequency, next_date, is_active, is_archived, created_at").eq("user_id", ownerId).order("next_date", { ascending: true }).limit(200)),
      timed(supabase.from("cash_settings").select(moneyCoachCashSettingsColumns).eq("user_id", ownerId).maybeSingle()),
      timed(supabase.from("funding_sources").select(moneyCoachFundingSourceColumns).eq("user_id", ownerId).eq("is_active", true).order("created_at", { ascending: true }).limit(200)),
      timed(supabase.from("beast_goals").select("id, title, status, target_date, updated_at").eq("owner_id", ownerId).eq("category", "Money").neq("status", "Archived").order("updated_at", { ascending: false }).limit(100)),
    ]);
    const results = [debts, bills, incomes, cashSettings, fundingSources, goals];
    const error = results.find((item) => item.result.error)?.result.error || null;
    return {
      queryCount: results.length,
      error,
      timings: {
        debtLoadMs: debts.durationMs,
        billLoadMs: bills.durationMs,
        incomeLoadMs: incomes.durationMs,
        otherFinancialContextLoadMs: Math.max(cashSettings.durationMs, fundingSources.durationMs, goals.durationMs),
      },
      records: error ? [] : buildMoneyCoachStructuredRecords({
        debts: (debts.result.data || []) as Record<string, unknown>[],
        bills: (bills.result.data || []) as Record<string, unknown>[],
        incomes: (incomes.result.data || []) as Record<string, unknown>[],
        cashSettings: cashSettings.result.data as Record<string, unknown> | null,
        fundingSources: (fundingSources.result.data || []) as Record<string, unknown>[],
        goals: (goals.result.data || []) as Record<string, unknown>[],
      }),
    };
  }
  const queries = professionalId === "beasteducation.guidance-counselor"
      ? [supabase.from("education_profiles").select(guidanceCounselorEducationProfileColumns).eq("owner_id", ownerId).limit(1), supabase.from("education_career_profile_items").select(guidanceCounselorCareerProfileItemColumns).eq("owner_id", ownerId).order("updated_at", { ascending: false }).limit(19)]
      : professionalId === "beasthealth.health-advisor"
        ? [supabase.from("beast_health_records").select("id, record_type, title, status, occurred_on, source, details, updated_at").eq("owner_id", ownerId).neq("status", "archived").order("updated_at", { ascending: false }).limit(20)]
        : [supabase.from("beast_goals").select("id, title, category, status, target_date, current_step, updated_at").eq("owner_id", ownerId).order("updated_at", { ascending: false }).limit(20)];
  const results = await Promise.all(queries);
  return {
    queryCount: queries.length,
    error: results.find((result) => result.error)?.error || null,
    timings: { debtLoadMs: null, billLoadMs: null, incomeLoadMs: null, otherFinancialContextLoadMs: null },
    records: results.flatMap((result, index) => result.error ? [] : (result.data || []).map((record) => { const row = record as Record<string, unknown>; return { domain: `${professionalId}:${index}`, record, updatedAt: typeof row.updated_at === "string" ? row.updated_at : undefined }; })),
  };
}

export async function POST(request: Request) {
  const requestStartedAt = Date.now();
  const requestId = crypto.randomUUID();
  const supabase = createRouteClient();
  const authenticationStartedAt = Date.now();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  const authenticationMs = Date.now() - authenticationStartedAt;
  if (authError || !user) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  const requestParsingStartedAt = Date.now();
  let body: { professionalId?: unknown; conversationId?: unknown; message?: unknown; workspace?: unknown; proposalId?: unknown; decision?: unknown; editedFields?: unknown };
  try { body = (await request.json()) as typeof body; } catch { return NextResponse.json({ error: "A valid request is required." }, { status: 400 }); }
  const professionalId = typeof body.professionalId === "string" ? body.professionalId : "";
  const conversationId = typeof body.conversationId === "string" ? body.conversationId : "";
  const text = typeof body.message === "string" ? body.message.trim() : "";
  const requestParsingMs = Date.now() - requestParsingStartedAt;
  try { requireProfessionalConfig(professionalId); } catch { return NextResponse.json({ error: "Unknown Digital Staff professional." }, { status: 400 }); }
  if (!conversationId) return NextResponse.json({ error: "Conversation is required." }, { status: 400 });
  const isProposalDecision = body.decision === "approve" || body.decision === "reject";
  if (!isProposalDecision && (!text || text.length > maxMessageLength)) return NextResponse.json({ error: "A message is required." }, { status: 400 });

  const entitlementStartedAt = Date.now();
  const entitlementPromise = requireProfessionalEntitlement(professionalId, { supabase, user })
    .then((result) => ({ result, durationMs: Date.now() - entitlementStartedAt }));
  const conversationAccessStartedAt = Date.now();
  const conversationPromise = supabase.from("agent_conversations").select("id, agent_id, summary, message_count").eq("id", conversationId).eq("owner_id", user.id).eq("agent_id", professionalId).maybeSingle()
    .then((result) => ({ result, durationMs: Date.now() - conversationAccessStartedAt }));

  const entitlement = await entitlementPromise;
  const ageEntitlement = entitlement.result;
  if (!ageEntitlement.ok) return NextResponse.json({ error: ageEntitlement.status === 428 ? "Add your birthday before opening this workspace." : "This Digital Staff professional is unavailable for the current member profile." }, { status: ageEntitlement.status });
  const contextPromise = !isProposalDecision
    ? (() => {
        const startedAt = Date.now();
        const timed = async <T,>(promise: PromiseLike<T>) => {
          const queryStartedAt = Date.now();
          const result = await promise;
          return { result, durationMs: Date.now() - queryStartedAt };
        };
        return Promise.all([
          timed(supabase.from("agent_conversation_messages").select("id, sender, content, created_at").eq("conversation_id", conversationId).eq("owner_id", user.id).order("created_at", { ascending: false }).limit(12)),
          timed(supabase.from("agent_memories").select("memory_key, value, updated_at").eq("owner_id", user.id).eq("agent_id", professionalId).order("updated_at", { ascending: false }).limit(8)),
          timed(loadStructuredRecords(supabase, user.id, professionalId)),
        ]).then(([history, memory, structured]) => ({ history, memory, structured, durationMs: Date.now() - startedAt }));
      })()
    : null;
  const conversationAccess = await conversationPromise;
  const conversationResult = conversationAccess.result;
  if (conversationResult.error || !conversationResult.data) return NextResponse.json({ error: "Conversation is not available for this member and professional." }, { status: 404 });
  const conversation = conversationResult.data;

  if (isProposalDecision) {
    const proposalId = typeof body.proposalId === "string" ? body.proposalId : "";
    if (!proposalId) return NextResponse.json({ error: "A proposal ID is required." }, { status: 400 });
    const proposalMessages = await supabase.from("agent_conversation_messages").select("id, sender, content, created_at").eq("conversation_id", conversationId).eq("owner_id", user.id).eq("sender->>kind", "agent").order("created_at", { ascending: false }).limit(50);
    const proposalMessage = (proposalMessages.data || []).find((message) => {
      const content = message.content;
      const runtime = content && typeof content === "object" && !Array.isArray(content) ? (content as { runtime?: { proposals?: StructuredKnowledgeProposal[] } }).runtime : null;
      return runtime?.proposals?.some((item) => item.id === proposalId);
    });
    const latest = proposalMessage || null;
    const runtime = latest?.content && typeof latest.content === "object" && !Array.isArray(latest.content) ? (latest.content as { runtime?: { proposals?: StructuredKnowledgeProposal[] } }).runtime : null;
    const proposal = runtime?.proposals?.find((item) => item.id === proposalId);
    if (!proposal) return NextResponse.json({ error: "That proposal is not available for this owner-scoped conversation." }, { status: 404 });
    if (body.decision === "reject") {
      if (latest?.id && latest.content && typeof latest.content === "object" && !Array.isArray(latest.content)) {
        const content = latest.content as { runtime?: { proposals?: StructuredKnowledgeProposal[]; [key: string]: unknown } };
        const updatedContent = { ...content, runtime: { ...(content.runtime || {}), proposals: (content.runtime?.proposals || []).map((item: StructuredKnowledgeProposal) => item.id === proposalId ? { ...item, approvalStatus: "rejected" as const } : item) } };
        await supabase.from("agent_conversation_messages").update({ content: updatedContent }).eq("id", latest.id).eq("owner_id", user.id);
      }
      return NextResponse.json({ proposalId, status: "rejected" });
    }
    const editedFields = body.editedFields && typeof body.editedFields === "object" && !Array.isArray(body.editedFields) ? body.editedFields as Record<string, string | number | boolean | null> : undefined;
    try {
      const result = await applyApprovedKnowledgeProposal({ client: supabase, ownerId: user.id, professionalId: professionalId as ProfessionalId, proposal, editedFields });
      if (latest?.id && latest.content && typeof latest.content === "object" && !Array.isArray(latest.content)) {
        const content = latest.content as { text?: string; runtime?: { proposals?: StructuredKnowledgeProposal[]; [key: string]: unknown } };
        const updatedContent = { ...content, runtime: { ...(content.runtime || {}), proposals: (content.runtime?.proposals || []).map((item) => item.id === proposalId ? { ...item, approvalStatus: "approved" as const, approvedRecordId: result.recordId } : item) } };
        await supabase.from("agent_conversation_messages").update({ content: updatedContent }).eq("id", latest.id).eq("owner_id", user.id);
      }
      return NextResponse.json({ result });
    } catch (error) {
      return NextResponse.json(safeDigitalStaffFailure("proposal-decision", error, requestId), { status: 422 });
    }
  }
  const requestLease = acquireDigitalStaffRequestLease(user.id, professionalId);
  if (!requestLease.ok) {
    return NextResponse.json(
      { error: "Another Digital Staff request is already being handled. Please retry shortly." },
      { status: 429, headers: { "Retry-After": String(requestLease.retryAfterSeconds) } }
    );
  }
  const contextObserverActivity = async (observer: RuntimeObserver, activity: DigitalStaffActivity) => observer.onActivity?.(activity);
  // These reads are independent and intentionally overlap the conversation authorization read.
  const now = new Date().toISOString();
  const message: RuntimeMessage = { id: crypto.randomUUID(), role: "user", text, createdAt: now };
  const summary = conversation.summary as { runtimeState?: ConversationState } | null;
  const executeTurn = async (observer: RuntimeObserver = {}) => {
    await contextObserverActivity(observer, "loading_context");
    const contextResult = contextPromise ? await contextPromise : null;
    if (!contextResult) throw new Error("Relevant conversation context is temporarily unavailable.");
    const historyResult = contextResult.history.result;
    const memoryResult = contextResult.memory.result;
    const structuredResult = contextResult.structured.result;
    const structuredRecords = structuredResult.records;
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
      ownerId: user.id, professionalId: professionalId as ProfessionalId, conversationId, message, requestId, signal: request.signal,
      recentMessages: ([...(historyResult.data || [])] as MessageRow[]).reverse().map((row) => ({ id: row.id, role: row.sender?.kind === "user" ? "user" : "assistant", text: messageText(row.content), createdAt: row.created_at })),
      state: summary?.runtimeState || emptyState,
      memories: (memoryResult.data || []).map((row) => ({ key: String(row.memory_key), value: row.value, updatedAt: String(row.updated_at) })),
      structuredRecords, workspace: typeof body.workspace === "string" ? body.workspace : null,
    }, runtimeObserver);
    await observer.onActivity?.("persisting");
    const persistenceStartedAt = Date.now();
    const assistantMessageId = crypto.randomUUID();
    const persistedAt = new Date().toISOString();
    const { error: messageError } = await supabase.from("agent_conversation_messages").insert([
      { id: message.id, owner_id: user.id, conversation_id: conversationId, sender: { kind: "user", id: user.id }, recipient: { kind: "agent", id: professionalId }, content: text, created_at: message.createdAt },
      { id: assistantMessageId, owner_id: user.id, conversation_id: conversationId, sender: { kind: "agent", id: professionalId }, recipient: { kind: "module", id: professionalId.split(".")[0] }, content: { text: result.response, runtime: { intent: result.intent, proposals: result.proposals, navigationTarget: result.navigationTarget, toolCalls: result.toolCalls, researchSources: result.researchSources, handoff: result.handoff, validationFailures: result.validationFailures, model: result.model, latencyMs: result.latencyMs } }, created_at: persistedAt },
    ]);
    if (messageError) throw new Error("The generated response could not be persisted.");
    const previousSummary = conversation.summary as Record<string, unknown> | null;
    const { error: summaryError } = await supabase.from("agent_conversations").update({
      message_count: Number(conversation.message_count || 0) + 2,
      summary: { ...(previousSummary || {}), overview: result.response.slice(0, 500), decisions: result.state.previousDecisions, unresolvedFollowUps: result.state.unresolvedQuestions, runtimeState: result.state, updatedAt: persistedAt },
      related_action_ids: [result.navigationTarget, ...result.toolCalls.map((call) => call.name)].filter(Boolean), updated_at: persistedAt,
    }).eq("id", conversationId).eq("owner_id", user.id).eq("agent_id", professionalId);
    if (summaryError) throw new Error("The conversation continuity state could not be persisted.");
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
      databaseQueryCount: 6 + structuredResult.queryCount,
      initialModelMs: result.timings.initialModelMs,
      firstModelOutputMs: result.timings.firstModelOutputMs,
      providerResponseHeadersMs: result.timings.providerResponseHeadersMs || null,
      providerFirstEventMs: result.timings.providerFirstEventMs || null,
      providerCompleteMs: result.timings.providerCompleteMs || null,
      validationMs: result.timings.validationMs || null,
      promptConstructionMs: result.timings.promptConstructionMs || null,
      promptCharacters: result.timings.promptCharacters || null,
      firstUsefulOutputMs,
      providerInvocationCount: result.timings.researchMs > 0 ? 2 : 1,
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
          send({ type: "error", ...safeDigitalStaffFailure("runtime-stream", error, requestId) });
        } finally {
          requestLease.release();
          controller.close();
        }
      },
    });
    return new Response(stream, {
      headers: { "Content-Type": "application/x-ndjson; charset=utf-8", "Cache-Control": "no-cache, no-transform" },
    });
  }

  try {
    return NextResponse.json(await executeTurn());
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
    return NextResponse.json(safeDigitalStaffFailure("runtime-route", error, requestId), { status: 502 });
  } finally {
    requestLease.release();
  }
}
