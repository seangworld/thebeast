import { NextResponse } from "next/server";
import { runDigitalStaffRuntime, requireProfessionalConfig, type ConversationState, type ProfessionalId, type RuntimeMessage } from "@/lib/digitalStaffRuntime";
import { createRouteClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
const maxMessageLength = 4_000;
const emptyState: ConversationState = { currentTopic: null, currentWorkspace: null, lastProfessionalQuestion: null, unresolvedQuestions: [], corrections: [], pendingApprovals: [], currentGoal: null, previousDecisions: [] };

type MessageRow = { id: string; sender: { kind?: string }; content: string | { text?: string }; created_at: string };

function messageText(content: MessageRow["content"]) { return typeof content === "string" ? content : typeof content?.text === "string" ? content.text : ""; }

export async function POST(request: Request) {
  const supabase = createRouteClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  let body: { professionalId?: unknown; conversationId?: unknown; message?: unknown; workspace?: unknown };
  try { body = (await request.json()) as typeof body; } catch { return NextResponse.json({ error: "A valid request is required." }, { status: 400 }); }
  const professionalId = typeof body.professionalId === "string" ? body.professionalId : "";
  const conversationId = typeof body.conversationId === "string" ? body.conversationId : "";
  const text = typeof body.message === "string" ? body.message.trim() : "";
  try { requireProfessionalConfig(professionalId); } catch { return NextResponse.json({ error: "Unknown Digital Staff professional." }, { status: 400 }); }
  if (!conversationId || !text || text.length > maxMessageLength) return NextResponse.json({ error: "Conversation and message are required." }, { status: 400 });

  const conversationResult = await supabase.from("agent_conversations").select("id, agent_id, summary").eq("id", conversationId).eq("owner_id", user.id).eq("agent_id", professionalId).maybeSingle();
  if (conversationResult.error || !conversationResult.data) return NextResponse.json({ error: "Conversation is not available for this member and professional." }, { status: 404 });
  const [historyResult, memoryResult] = await Promise.all([
    supabase.from("agent_conversation_messages").select("id, sender, content, created_at").eq("conversation_id", conversationId).eq("owner_id", user.id).order("created_at", { ascending: false }).limit(12),
    supabase.from("agent_memories").select("memory_key, value, updated_at").eq("owner_id", user.id).eq("agent_id", professionalId).order("updated_at", { ascending: false }).limit(12),
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
      structuredRecords: [], workspace: typeof body.workspace === "string" ? body.workspace : null,
    });
    return NextResponse.json({ message, result });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "The Digital Staff runtime could not respond safely." }, { status: 502 });
  }
}
