import { NextResponse } from "next/server";
import { applyApprovedKnowledgeProposal, runDigitalStaffRuntime, requireProfessionalConfig, type ConversationState, type ProfessionalId, type RuntimeMessage, type StructuredKnowledgeProposal } from "@/lib/digitalStaffRuntime";
import { createRouteClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
const maxMessageLength = 4_000;
const emptyState: ConversationState = { currentTopic: null, currentWorkspace: null, lastProfessionalQuestion: null, unresolvedQuestions: [], corrections: [], pendingApprovals: [], currentGoal: null, previousDecisions: [] };

type MessageRow = { id: string; sender: { kind?: string }; content: string | { text?: string; runtime?: { proposals?: StructuredKnowledgeProposal[] } }; created_at: string };

function messageText(content: MessageRow["content"]) { return typeof content === "string" ? content : typeof content?.text === "string" ? content.text : ""; }

async function loadStructuredRecords(supabase: ReturnType<typeof createRouteClient>, ownerId: string, professionalId: string) {
  const queries = professionalId === "beastmoney.money-coach"
    ? [supabase.from("debts").select("id, name, balance, minimum_payment, interest_rate, due_date, next_due_date_after_payment, payment_behavior, created_at").eq("user_id", ownerId).eq("is_archived", false).limit(30), supabase.from("bill_events").select("id, name, amount, frequency, due_date, next_due_date_after_payment, created_at").eq("user_id", ownerId).eq("is_archived", false).limit(30)]
    : professionalId === "beasteducation.guidance-counselor"
      ? [supabase.from("education_profiles").select("id, goal_kind, goal, current_situation, background, strengths, growth_areas, constraints, weekly_hours, selected_providers, updated_at").eq("owner_id", ownerId).limit(1), supabase.from("education_career_profile_items").select("id, category, label, value, verification_status, confidence, updated_at").eq("owner_id", ownerId).limit(50)]
      : professionalId === "beasthealth.health-advisor"
        ? [supabase.from("beast_health_records").select("id, record_type, title, status, occurred_on, source, details, updated_at").eq("owner_id", ownerId).neq("status", "archived").limit(50)]
        : [supabase.from("beast_goals").select("id, title, category, status, target_date, current_step, updated_at").eq("owner_id", ownerId).limit(30)];
  const results = await Promise.all(queries);
  return results.flatMap((result, index) => result.error ? [] : (result.data || []).map((record) => { const row = record as Record<string, unknown>; return { domain: `${professionalId}:${index}`, record, updatedAt: typeof row.updated_at === "string" ? row.updated_at : undefined }; }));
}

export async function POST(request: Request) {
  const supabase = createRouteClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  let body: { professionalId?: unknown; conversationId?: unknown; message?: unknown; workspace?: unknown; proposalId?: unknown; decision?: unknown; editedFields?: unknown };
  try { body = (await request.json()) as typeof body; } catch { return NextResponse.json({ error: "A valid request is required." }, { status: 400 }); }
  const professionalId = typeof body.professionalId === "string" ? body.professionalId : "";
  const conversationId = typeof body.conversationId === "string" ? body.conversationId : "";
  const text = typeof body.message === "string" ? body.message.trim() : "";
  try { requireProfessionalConfig(professionalId); } catch { return NextResponse.json({ error: "Unknown Digital Staff professional." }, { status: 400 }); }
  if (!conversationId) return NextResponse.json({ error: "Conversation is required." }, { status: 400 });

  const conversationResult = await supabase.from("agent_conversations").select("id, agent_id, summary, message_count").eq("id", conversationId).eq("owner_id", user.id).eq("agent_id", professionalId).maybeSingle();
  if (conversationResult.error || !conversationResult.data) return NextResponse.json({ error: "Conversation is not available for this member and professional." }, { status: 404 });

  if (body.decision === "approve" || body.decision === "reject") {
    const proposalId = typeof body.proposalId === "string" ? body.proposalId : "";
    if (!proposalId) return NextResponse.json({ error: "A proposal ID is required." }, { status: 400 });
    const latest = await supabase.from("agent_conversation_messages").select("id, sender, content, created_at").eq("conversation_id", conversationId).eq("owner_id", user.id).eq("sender->>kind", "agent").order("created_at", { ascending: false }).limit(1).maybeSingle();
    const runtime = latest.data?.content && typeof latest.data.content === "object" && !Array.isArray(latest.data.content) ? (latest.data.content as { runtime?: { proposals?: StructuredKnowledgeProposal[] } }).runtime : null;
    const proposal = runtime?.proposals?.find((item) => item.id === proposalId);
    if (!proposal) return NextResponse.json({ error: "That proposal is not available for this owner-scoped conversation." }, { status: 404 });
    if (body.decision === "reject") {
      if (latest.data?.id && latest.data.content && typeof latest.data.content === "object" && !Array.isArray(latest.data.content)) {
        const content = latest.data.content as { runtime?: { proposals?: StructuredKnowledgeProposal[]; [key: string]: unknown } };
        const updatedContent = { ...content, runtime: { ...(content.runtime || {}), proposals: (content.runtime?.proposals || []).map((item: StructuredKnowledgeProposal) => item.id === proposalId ? { ...item, approvalStatus: "rejected" as const } : item) } };
        await supabase.from("agent_conversation_messages").update({ content: updatedContent }).eq("id", latest.data.id).eq("owner_id", user.id);
      }
      return NextResponse.json({ proposalId, status: "rejected" });
    }
    const editedFields = body.editedFields && typeof body.editedFields === "object" && !Array.isArray(body.editedFields) ? body.editedFields as Record<string, string | number | boolean | null> : undefined;
    try {
      const result = await applyApprovedKnowledgeProposal({ client: supabase, ownerId: user.id, professionalId: professionalId as ProfessionalId, proposal, editedFields });
      if (latest.data?.id && latest.data.content && typeof latest.data.content === "object" && !Array.isArray(latest.data.content)) {
        const content = latest.data.content as { text?: string; runtime?: { proposals?: StructuredKnowledgeProposal[]; [key: string]: unknown } };
        const updatedContent = { ...content, runtime: { ...(content.runtime || {}), proposals: (content.runtime?.proposals || []).map((item) => item.id === proposalId ? { ...item, approvalStatus: "approved" as const, approvedRecordId: result.recordId } : item) } };
        await supabase.from("agent_conversation_messages").update({ content: updatedContent }).eq("id", latest.data.id).eq("owner_id", user.id);
      }
      return NextResponse.json({ result });
    } catch (error) {
      return NextResponse.json({ error: error instanceof Error ? error.message : "The approved proposal could not be persisted." }, { status: 422 });
    }
  }
  if (!text || text.length > maxMessageLength) return NextResponse.json({ error: "A message is required." }, { status: 400 });
  const [historyResult, memoryResult, structuredRecords] = await Promise.all([
    supabase.from("agent_conversation_messages").select("id, sender, content, created_at").eq("conversation_id", conversationId).eq("owner_id", user.id).order("created_at", { ascending: false }).limit(12),
    supabase.from("agent_memories").select("memory_key, value, updated_at").eq("owner_id", user.id).eq("agent_id", professionalId).order("updated_at", { ascending: false }).limit(12),
    loadStructuredRecords(supabase, user.id, professionalId),
  ]);
  if (historyResult.error || memoryResult.error) return NextResponse.json({ error: "Relevant conversation context is temporarily unavailable." }, { status: 503 });
  const now = new Date().toISOString();
  const message: RuntimeMessage = { id: crypto.randomUUID(), role: "user", text, createdAt: now };
  const summary = conversationResult.data.summary as { runtimeState?: ConversationState } | null;
  try {
    const result = await runDigitalStaffRuntime({
      ownerId: user.id, professionalId: professionalId as ProfessionalId, conversationId, message,
      recentMessages: ([...(historyResult.data || [])] as MessageRow[]).reverse().map((row) => ({ id: row.id, role: row.sender?.kind === "user" ? "user" : "assistant", text: messageText(row.content), createdAt: row.created_at })),
      state: summary?.runtimeState || emptyState,
      memories: (memoryResult.data || []).map((row) => ({ key: String(row.memory_key), value: row.value, updatedAt: String(row.updated_at) })),
      structuredRecords, workspace: typeof body.workspace === "string" ? body.workspace : null,
    });
    const assistantMessageId = crypto.randomUUID();
    const persistedAt = new Date().toISOString();
    const { error: messageError } = await supabase.from("agent_conversation_messages").insert([
      { id: message.id, owner_id: user.id, conversation_id: conversationId, sender: { kind: "user", id: user.id }, recipient: { kind: "agent", id: professionalId }, content: text, created_at: message.createdAt },
      { id: assistantMessageId, owner_id: user.id, conversation_id: conversationId, sender: { kind: "agent", id: professionalId }, recipient: { kind: "module", id: professionalId.split(".")[0] }, content: { text: result.response, runtime: { intent: result.intent, proposals: result.proposals, navigationTarget: result.navigationTarget, toolCalls: result.toolCalls, researchSources: result.researchSources, handoff: result.handoff, validationFailures: result.validationFailures, model: result.model, latencyMs: result.latencyMs } }, created_at: persistedAt },
    ]);
    if (messageError) return NextResponse.json({ error: "The response was generated but could not be saved, so it was not returned as durable conversation history." }, { status: 503 });
    const previousSummary = conversationResult.data.summary as Record<string, unknown> | null;
    const { error: summaryError } = await supabase.from("agent_conversations").update({
      message_count: Number(conversationResult.data.message_count || 0) + 2,
      summary: { ...(previousSummary || {}), overview: result.response.slice(0, 500), decisions: result.state.previousDecisions, unresolvedFollowUps: result.state.unresolvedQuestions, runtimeState: result.state, updatedAt: persistedAt },
      related_action_ids: [result.navigationTarget, ...result.toolCalls.map((call) => call.name)].filter(Boolean), updated_at: persistedAt,
    }).eq("id", conversationId).eq("owner_id", user.id).eq("agent_id", professionalId);
    if (summaryError) return NextResponse.json({ error: "The conversation was saved, but its continuity state could not be updated." }, { status: 503 });
    return NextResponse.json({ message, assistantMessageId, result });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "The Digital Staff runtime could not respond safely." }, { status: 502 });
  }
}
