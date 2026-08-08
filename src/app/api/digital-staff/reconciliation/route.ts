import { NextResponse } from "next/server";
import {
  applyApprovedKnowledgeProposal,
  assertHistoricalMessagesOwnerScoped,
  createHistoricalReconciliationState,
  historicalReconciliationBatchSize,
  reconcileHistoricalProposals,
  requireProfessionalConfig,
  resolvedNeedKeysFromProposals,
  runDigitalStaffRuntime,
  safeDigitalStaffFailure,
  safeHistoricalReconciliationTelemetry,
  transitionHistoricalReconciliationState,
  type CanonicalKnowledgeRecord,
  type ConversationState,
  type HistoricalConversationMessage,
  type HistoricalKnowledgeProposal,
  type HistoricalReconciliationState,
  type ProfessionalId,
  type RuntimeMessage,
} from "@/lib/digitalStaffRuntime";
import { createRouteClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const professionalIds: ProfessionalId[] = [
  "beastfusion.fusion-director",
  "beastmoney.money-coach",
  "beasteducation.guidance-counselor",
  "beasthealth.health-advisor",
];
const emptyState: ConversationState = { currentTopic: null, currentWorkspace: null, lastProfessionalQuestion: null, unresolvedQuestions: [], corrections: [], pendingApprovals: [], currentGoal: null, previousDecisions: [] };
type ReconciliationSummary = { ap104Reconciliation?: HistoricalReconciliationState; [key: string]: unknown };
type MessageContent = { text?: string; runtime?: { proposals?: HistoricalKnowledgeProposal[]; reconciliation?: Record<string, unknown>; [key: string]: unknown } };
type ReconciliationMessageRow = { id: string; content: MessageContent; created_at: string };

function reconciliationConversationId(ownerId: string, professionalId: ProfessionalId) {
  return `ap104:${ownerId}:${professionalId}`;
}

function textFromContent(content: unknown) {
  if (typeof content === "string") return content;
  if (content && typeof content === "object" && !Array.isArray(content) && typeof (content as { text?: unknown }).text === "string") return (content as { text: string }).text;
  return "";
}

function proposalsFromRows(rows: ReconciliationMessageRow[]) {
  return rows.flatMap((row) => row.content?.runtime?.proposals || []);
}

function record(id: unknown, domain: string, entityType: string, fields: Record<string, unknown>, updatedAt?: unknown): CanonicalKnowledgeRecord | null {
  return typeof id === "string" ? { id, domain, entityType, fields, updatedAt: typeof updatedAt === "string" ? updatedAt : undefined } : null;
}

async function loadCanonicalKnowledge(client: ReturnType<typeof createRouteClient>, ownerId: string, professionalId: ProfessionalId) {
  const results = professionalId === "beasthealth.health-advisor"
    ? await Promise.all([
        client.from("beast_health_records").select("id, record_type, title, status, occurred_on, source, details, updated_at").eq("owner_id", ownerId).limit(200),
        client.from("beast_health_discovery").select("owner_id, last_topic, skipped_topics, started_at, updated_at").eq("owner_id", ownerId).limit(1),
      ])
    : professionalId === "beasteducation.guidance-counselor"
      ? await Promise.all([
          client.from("education_career_profile_items").select("id, phase, category, label, value, details, verification_status, updated_at").eq("owner_id", ownerId).limit(200),
          client.from("education_profiles").select("owner_id, goal, current_situation, background, strengths, growth_areas, constraints, discovery_answers, career_interests, educational_goals, learning_preferences, certifications, current_employment, military_experience, other_educational_context, updated_at").eq("owner_id", ownerId).limit(1),
        ])
      : professionalId === "beastmoney.money-coach"
        ? await Promise.all([
            client.from("debts").select("id, name, balance, minimum_payment, interest_rate, due_date, next_due_date_after_payment, is_archived, created_at").eq("user_id", ownerId).limit(200),
            client.from("bill_events").select("id, name, amount, frequency, created_at").eq("user_id", ownerId).limit(200),
            client.from("beast_goals").select("id, title, category, status, summary, updated_at").eq("owner_id", ownerId).eq("category", "Money").limit(100),
          ])
        : await Promise.all([
            client.from("beast_goals").select("id, title, category, status, summary, current_step, updated_at").eq("owner_id", ownerId).limit(200),
          ]);

  const records: CanonicalKnowledgeRecord[] = [];
  for (const result of results) {
    if (result.error) continue;
    for (const item of result.data || []) {
      const row = item as Record<string, unknown>;
      const id = typeof row.id === "string" ? row.id : `${professionalId}:profile`;
      const entityType = String(row.record_type || row.category || (professionalId.includes("education") ? "education_profile" : "context"));
      const flattened = { ...row, ...(row.details && typeof row.details === "object" && !Array.isArray(row.details) ? row.details as Record<string, unknown> : {}) };
      const normalized = record(id, professionalId.split(".")[0], entityType, flattened, row.updated_at);
      if (normalized) records.push(normalized);
    }
  }
  return records;
}

async function getReconciliationRows(client: ReturnType<typeof createRouteClient>, ownerId: string, conversationId: string) {
  const result = await client.from("agent_conversation_messages").select("id, content, created_at").eq("owner_id", ownerId).eq("conversation_id", conversationId).eq("sender->>kind", "agent").order("created_at", { ascending: true }).limit(500);
  return result.error ? [] : result.data as ReconciliationMessageRow[];
}

async function responseSnapshot(client: ReturnType<typeof createRouteClient>, ownerId: string) {
  const ids = professionalIds.map((professionalId) => reconciliationConversationId(ownerId, professionalId));
  const [conversationResult, messageResult] = await Promise.all([
    client.from("agent_conversations").select("id, agent_id, summary").eq("owner_id", ownerId).in("id", ids),
    client.from("agent_conversation_messages").select("id, conversation_id, content, created_at").eq("owner_id", ownerId).in("conversation_id", ids).eq("sender->>kind", "agent").order("created_at", { ascending: true }).limit(500),
  ]);
  const messages = messageResult.error ? [] : messageResult.data || [];
  return professionalIds.map((professionalId) => {
    const conversationId = reconciliationConversationId(ownerId, professionalId);
    const conversation = (conversationResult.data || []).find((item) => item.id === conversationId);
    const summary = conversation?.summary as ReconciliationSummary | undefined;
    const proposals = messages.filter((item) => item.conversation_id === conversationId).flatMap((item) => (item.content as MessageContent)?.runtime?.proposals || []);
    return { professionalId, conversationId, state: summary?.ap104Reconciliation || null, telemetry: summary?.ap104Reconciliation ? safeHistoricalReconciliationTelemetry(summary.ap104Reconciliation) : null, proposals };
  });
}

export async function GET() {
  const client = createRouteClient();
  const { data: { user }, error } = await client.auth.getUser();
  if (error || !user) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  return NextResponse.json({ professionals: await responseSnapshot(client, user.id) });
}

export async function POST(request: Request) {
  const requestId = crypto.randomUUID();
  const client = createRouteClient();
  const { data: { user }, error: authError } = await client.auth.getUser();
  if (authError || !user) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  let body: { professionalId?: unknown; action?: unknown; proposalId?: unknown; decision?: unknown; editedFields?: unknown };
  try { body = await request.json() as typeof body; } catch { return NextResponse.json({ error: "A valid request is required." }, { status: 400 }); }
  const professionalId = typeof body.professionalId === "string" ? body.professionalId as ProfessionalId : null;
  if (!professionalId || !professionalIds.includes(professionalId)) return NextResponse.json({ error: "A supported professional is required." }, { status: 400 });
  requireProfessionalConfig(professionalId);
  const action = typeof body.action === "string" ? body.action : "";
  const conversationId = reconciliationConversationId(user.id, professionalId);
  const now = new Date().toISOString();
  const existingResult = await client.from("agent_conversations").select("id, summary, message_count").eq("id", conversationId).eq("owner_id", user.id).eq("agent_id", professionalId).maybeSingle();
  if (existingResult.error) return NextResponse.json({ error: "Reconciliation state is unavailable." }, { status: 503 });
  const existingSummary = (existingResult.data?.summary || {}) as ReconciliationSummary;
  let state = existingSummary.ap104Reconciliation;

  if (action === "start") {
    if (!state || state.status === "skipped") state = createHistoricalReconciliationState(professionalId, now);
    const result = await client.from("agent_conversations").upsert({ id: conversationId, owner_id: user.id, agent_id: professionalId, title: "Historical knowledge reconciliation", summary: { ...existingSummary, ap104Reconciliation: state }, message_count: Number(existingResult.data?.message_count || 0), updated_at: now }, { onConflict: "id" });
    if (result.error) return NextResponse.json({ error: "Reconciliation could not be started." }, { status: 503 });
    return NextResponse.json({ professionals: await responseSnapshot(client, user.id) });
  }

  if (!state || !existingResult.data) return NextResponse.json({ error: "Start reconciliation before using this control." }, { status: 409 });

  if (["pause", "skip"].includes(action)) {
    state = transitionHistoricalReconciliationState(state, action as "pause" | "skip", now);
    const result = await client.from("agent_conversations").update({ summary: { ...existingSummary, ap104Reconciliation: state }, updated_at: now }).eq("id", conversationId).eq("owner_id", user.id).eq("agent_id", professionalId);
    if (result.error) return NextResponse.json({ error: "Reconciliation control could not be saved." }, { status: 503 });
    return NextResponse.json({ professionals: await responseSnapshot(client, user.id) });
  }

  if (action === "process") {
    state = transitionHistoricalReconciliationState(state, "resume", now);
    if (state.status !== "running") return NextResponse.json({ error: "This reconciliation is not available to resume." }, { status: 409 });
    const batchId = `ap104-batch-${professionalId.replace(/[^a-z0-9]/gi, "-")}-${state.nextMessageOffset}`;
    const recoveredBatch = (await getReconciliationRows(client, user.id, conversationId)).find((row) => row.id === batchId);
    const recoveredMetadata = recoveredBatch?.content.runtime?.reconciliation as { sourceMessageIds?: string[]; proposalCount?: number; duplicatesIgnored?: number; conflictsDetected?: number; completed?: boolean } | undefined;
    if (recoveredMetadata?.sourceMessageIds?.length) {
      const recoveredAt = new Date().toISOString();
      state = { ...state, status: recoveredMetadata.completed ? "completed" : "running", nextMessageOffset: state.nextMessageOffset + recoveredMetadata.sourceMessageIds.length, lastBatchId: batchId, completedAt: recoveredMetadata.completed ? recoveredAt : null, updatedAt: recoveredAt, metrics: { ...state.metrics, messagesScanned: state.metrics.messagesScanned + recoveredMetadata.sourceMessageIds.length, proposalsGenerated: state.metrics.proposalsGenerated + Number(recoveredMetadata.proposalCount || 0), duplicatesIgnored: state.metrics.duplicatesIgnored + Number(recoveredMetadata.duplicatesIgnored || 0), conflictsDetected: state.metrics.conflictsDetected + Number(recoveredMetadata.conflictsDetected || 0) } };
      const recoveredUpdate = await client.from("agent_conversations").update({ summary: { ...existingSummary, ap104Reconciliation: state }, updated_at: recoveredAt }).eq("id", conversationId).eq("owner_id", user.id).eq("agent_id", professionalId);
      if (recoveredUpdate.error) return NextResponse.json({ error: "The saved batch cursor could not be recovered yet; retry remains safe." }, { status: 503 });
      return NextResponse.json({ professionals: await responseSnapshot(client, user.id) });
    }
    const conversationsResult = await client.from("agent_conversations").select("id", { count: "exact", head: true }).eq("owner_id", user.id).eq("agent_id", professionalId).neq("id", conversationId).lte("created_at", state.captureThrough);
    if (conversationsResult.error) return NextResponse.json({ error: "Historical conversations are temporarily unavailable." }, { status: 503 });
    const historicalConversationCount = Number(conversationsResult.count || 0);
    if (!historicalConversationCount) {
      state = { ...state, status: "completed", completedAt: now, updatedAt: now, metrics: { ...state.metrics, conversationsScanned: 0 } };
      await client.from("agent_conversations").update({ summary: { ...existingSummary, ap104Reconciliation: state }, updated_at: now }).eq("id", conversationId).eq("owner_id", user.id);
      return NextResponse.json({ professionals: await responseSnapshot(client, user.id) });
    }
    const messagesResult = await client.from("agent_conversation_messages").select("id, owner_id, conversation_id, content, created_at").eq("owner_id", user.id).eq("sender->>kind", "user").eq("recipient->>id", professionalId).lte("created_at", state.captureThrough).order("created_at", { ascending: true }).range(state.nextMessageOffset, state.nextMessageOffset + historicalReconciliationBatchSize - 1);
    if (messagesResult.error) return NextResponse.json({ error: "Historical messages are temporarily unavailable." }, { status: 503 });
    const batch: HistoricalConversationMessage[] = (messagesResult.data || []).map((row) => ({ id: row.id, role: "user", text: textFromContent(row.content), createdAt: row.created_at, ownerId: row.owner_id, conversationId: row.conversation_id, professionalId }));
    assertHistoricalMessagesOwnerScoped(batch, user.id, professionalId);
    const [canonicalRecords, memoriesResult, priorRows] = await Promise.all([
      loadCanonicalKnowledge(client, user.id, professionalId),
      client.from("agent_memories").select("memory_key, value, updated_at").eq("owner_id", user.id).eq("agent_id", professionalId).order("updated_at", { ascending: false }).limit(50),
      getReconciliationRows(client, user.id, conversationId),
    ]);
    const priorProposals = proposalsFromRows(priorRows);
    const pendingAsCanonical = priorProposals.map((proposal) => ({ id: proposal.id, domain: proposal.domain, entityType: proposal.entityType, fields: proposal.fields }));
    const generated: HistoricalKnowledgeProposal[] = [];
    let duplicatesIgnored = 0;
    let conflictsDetected = 0;
    try {
      for (const historical of batch) {
        if (!historical.text.trim()) continue;
        const runtimeMessage: RuntimeMessage = { id: historical.id, role: "user", text: historical.text, createdAt: historical.createdAt };
        const result = await runDigitalStaffRuntime({ ownerId: user.id, professionalId, conversationId: historical.conversationId, message: runtimeMessage, recentMessages: [], state: emptyState, memories: memoriesResult.error ? [] : (memoriesResult.data || []).map((item) => ({ key: String(item.memory_key), value: item.value, updatedAt: String(item.updated_at) })), structuredRecords: canonicalRecords.map((item) => ({ domain: item.domain, record: item.fields, updatedAt: item.updatedAt })), workspace: null, executionMode: "historical_reconciliation" });
        const reconciled = reconcileHistoricalProposals({ professionalId, message: historical, proposals: result.proposals, canonicalRecords: [...canonicalRecords, ...pendingAsCanonical, ...generated.map((proposal) => ({ id: proposal.id, domain: proposal.domain, entityType: proposal.entityType, fields: proposal.fields }))], reconciledAt: now });
        generated.push(...reconciled.proposals);
        duplicatesIgnored += reconciled.duplicatesIgnored;
        conflictsDetected += reconciled.conflictsDetected;
      }
    } catch (error) {
      const safeFailure = safeDigitalStaffFailure("historical-reconciliation", error, requestId);
      state = { ...state, status: "failed", updatedAt: now, lastError: safeFailure.error, metrics: { ...state.metrics, failures: state.metrics.failures + 1 } };
      await client.from("agent_conversations").update({ summary: { ...existingSummary, ap104Reconciliation: state }, updated_at: now }).eq("id", conversationId).eq("owner_id", user.id);
      return NextResponse.json({ error: safeFailure.error, requestId: safeFailure.requestId, professionals: await responseSnapshot(client, user.id) }, { status: 502 });
    }
    const completed = batch.length < historicalReconciliationBatchSize;
    if (batch.length) {
      const insert = await client.from("agent_conversation_messages").upsert({ id: batchId, owner_id: user.id, conversation_id: conversationId, sender: { kind: "agent", id: professionalId }, recipient: { kind: "module", id: professionalId.split(".")[0] }, content: { text: "I found information from your earlier conversations that isn't fully organized yet. I've organized what I found below so you can review it.", runtime: { proposals: generated, reconciliation: { version: "ap104-v1", sourceMessageIds: batch.map((item) => item.id), sourceConversationIds: Array.from(new Set(batch.map((item) => item.conversationId))), proposalCount: generated.length, duplicatesIgnored, conflictsDetected, completed, reconciledAt: now } } }, created_at: now }, { onConflict: "id" });
      if (insert.error) return NextResponse.json({ error: "The batch was analyzed but could not be saved; it is safe to resume." }, { status: 503 });
    }
    state = {
      ...state,
      status: completed ? "completed" : "running",
      nextMessageOffset: state.nextMessageOffset + batch.length,
      lastBatchId: batch.length ? batchId : state.lastBatchId,
      resolvedNeedKeys: Array.from(new Set([...state.resolvedNeedKeys, ...resolvedNeedKeysFromProposals(generated)])),
      metrics: { ...state.metrics, conversationsScanned: historicalConversationCount, messagesScanned: state.metrics.messagesScanned + batch.length, proposalsGenerated: state.metrics.proposalsGenerated + generated.length, duplicatesIgnored: state.metrics.duplicatesIgnored + duplicatesIgnored, conflictsDetected: state.metrics.conflictsDetected + conflictsDetected },
      completedAt: completed ? now : null,
      updatedAt: now,
      lastError: null,
    };
    const update = await client.from("agent_conversations").update({ summary: { ...existingSummary, ap104Reconciliation: state }, message_count: Number(existingResult.data.message_count || 0) + (batch.length ? 1 : 0), updated_at: now }).eq("id", conversationId).eq("owner_id", user.id).eq("agent_id", professionalId);
    if (update.error) return NextResponse.json({ error: "The batch was saved, but its cursor could not advance; deterministic IDs make retry safe." }, { status: 503 });
    return NextResponse.json({ professionals: await responseSnapshot(client, user.id) });
  }

  if (action === "decide") {
    const decision = typeof body.decision === "string" ? body.decision : "";
    const editedFields = body.editedFields && typeof body.editedFields === "object" && !Array.isArray(body.editedFields) ? body.editedFields as Record<string, string | number | boolean | null> : undefined;
    const rows = await getReconciliationRows(client, user.id, conversationId);
    const candidates = decision === "bulk_approve"
      ? proposalsFromRows(rows).filter((proposal) => proposal.approvalStatus === "proposed" && proposal.reconciliation.disposition === "create" && proposal.confidence >= 0.9 && proposal.missingFields.length === 0 && proposal.contradictions.length === 0)
      : proposalsFromRows(rows).filter((proposal) => proposal.id === body.proposalId);
    if (!candidates.length) return NextResponse.json({ error: "No eligible owner-scoped proposal was found." }, { status: 404 });
    if (!['approve', 'reject', 'merge', 'bulk_approve'].includes(decision)) return NextResponse.json({ error: "A supported review decision is required." }, { status: 400 });
    let accepted = 0; let rejected = 0; let merged = 0; let edited = 0;
    for (const candidate of candidates) {
      if (decision === "approve" && candidate.reconciliation.disposition !== "create") return NextResponse.json({ error: "Merge or resolve this matched record instead of creating a duplicate." }, { status: 409 });
      if (decision === "merge" && !candidate.relatedRecordId) return NextResponse.json({ error: "A verified canonical merge target is required." }, { status: 409 });
      let approvedRecordId: string | undefined;
      if (decision !== "reject") {
        const result = await applyApprovedKnowledgeProposal({ client, ownerId: user.id, professionalId, proposal: decision === "merge" ? { ...candidate, proposedAction: "update" } : candidate, editedFields });
        approvedRecordId = result.recordId;
        if (decision === "merge") merged += 1; else accepted += 1;
        if (editedFields && Object.keys(editedFields).length) edited += 1;
      } else rejected += 1;
      const sourceRow = rows.find((row) => row.content.runtime?.proposals?.some((proposal) => proposal.id === candidate.id));
      if (!sourceRow) continue;
      const content = sourceRow.content;
      const next = { ...content, runtime: { ...(content.runtime || {}), proposals: (content.runtime?.proposals || []).map((proposal) => proposal.id === candidate.id ? { ...proposal, fields: editedFields ? { ...proposal.fields, ...editedFields } : proposal.fields, approvalStatus: decision === "reject" ? "rejected" as const : "approved" as const, approvedRecordId } : proposal) } };
      const update = await client.from("agent_conversation_messages").update({ content: next }).eq("id", sourceRow.id).eq("owner_id", user.id).eq("conversation_id", conversationId);
      if (update.error) return NextResponse.json({ error: "The canonical decision succeeded but its review status could not be updated." }, { status: 503 });
    }
    state = { ...state, updatedAt: now, metrics: { ...state.metrics, accepted: state.metrics.accepted + accepted, edited: state.metrics.edited + edited, rejected: state.metrics.rejected + rejected, merged: state.metrics.merged + merged } };
    await client.from("agent_conversations").update({ summary: { ...existingSummary, ap104Reconciliation: state }, updated_at: now }).eq("id", conversationId).eq("owner_id", user.id);
    return NextResponse.json({ professionals: await responseSnapshot(client, user.id) });
  }
  return NextResponse.json({ error: "A supported reconciliation action is required." }, { status: 400 });
}
