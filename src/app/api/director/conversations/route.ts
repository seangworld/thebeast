import { NextResponse } from "next/server";
import {
  directorProfessionalId,
  type DirectorContext,
  type DirectorSignal,
} from "@/lib/director";
import { runDigitalStaffRuntime, safeDigitalStaffFailure, type ConversationState, type RuntimeMessage } from "@/lib/digitalStaffRuntime";
import { createRouteClient } from "@/lib/supabase/server";
import { getDebtLifecycleLabel, getDebtLifecycleStatus } from "@/lib/debtLifecycle";

export const dynamic = "force-dynamic";

type ConversationRow = {
  id: string;
  title: string;
  summary: Record<string, unknown>;
  message_count: number;
  pinned: boolean;
  archived: boolean;
  created_at: string;
  updated_at: string;
};

type MessageRow = {
  id: string;
  conversation_id: string;
  sender: { kind?: unknown; id?: unknown };
  content: { text?: unknown; recommendation?: unknown } | string;
  created_at: string;
};

function messageText(content: MessageRow["content"]) {
  if (typeof content === "string") return content;
  return typeof content?.text === "string" ? content.text : "";
}

function publicMessage(row: MessageRow) {
  return {
    id: row.id,
    conversationId: row.conversation_id,
    role: row.sender?.kind === "user" ? "user" : "agent",
    text: messageText(row.content),
    recommendation:
      typeof row.content === "object" && row.content
        ? row.content.recommendation || null
        : null,
    createdAt: row.created_at,
  };
}

async function authenticatedClient() {
  const supabase = createRouteClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  return { supabase, user: error ? null : user };
}

export async function GET() {
  const { supabase, user } = await authenticatedClient();
  if (!user) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }

  const { data, error } = await supabase
    .from("agent_conversations")
    .select(
      "id, title, summary, message_count, pinned, archived, created_at, updated_at"
    )
    .eq("owner_id", user.id)
    .eq("agent_id", directorProfessionalId)
    .eq("archived", false)
    .order("pinned", { ascending: false })
    .order("updated_at", { ascending: false });
  if (error) {
    return NextResponse.json(
      { error: "Saved Director conversations are unavailable." },
      { status: 503 }
    );
  }

  const conversations = (data || []) as ConversationRow[];
  const ids = conversations.map((conversation) => conversation.id);
  const messageResult = ids.length
    ? await supabase
        .from("agent_conversation_messages")
        .select("id, conversation_id, sender, content, created_at")
        .eq("owner_id", user.id)
        .in("conversation_id", ids)
        .order("created_at", { ascending: true })
    : { data: [], error: null };
  if (messageResult.error) {
    return NextResponse.json(
      { error: "Director conversation history is unavailable." },
      { status: 503 }
    );
  }
  const messages = (messageResult.data || []) as MessageRow[];

  return NextResponse.json({
    conversations: conversations.map((conversation) => ({
      id: conversation.id,
      title: conversation.title,
      summary: conversation.summary,
      messageCount: conversation.message_count,
      pinned: conversation.pinned,
      createdAt: conversation.created_at,
      updatedAt: conversation.updated_at,
      messages: messages
        .filter((message) => message.conversation_id === conversation.id)
        .map(publicMessage),
    })),
  });
}

function goalSignals(rows: Record<string, unknown>[]): DirectorSignal[] {
  return rows.map((row) => ({
    id: String(row.id),
    domain:
      row.category === "Money"
        ? "money"
        : row.category === "Education" || row.category === "Career"
          ? "education"
          : row.category === "Health"
            ? "health"
            : "goals",
    label: String(row.title),
    status: String(row.status),
    date: typeof row.target_date === "string" ? row.target_date : null,
    detail:
      typeof row.current_step === "string" && row.current_step
        ? `Current step: ${row.current_step}`
        : "Review the saved goal and choose its next step.",
    href: "/dashboard/goals",
    source: "BeastGoals",
    updatedAt: typeof row.updated_at === "string" ? row.updated_at : null,
  }));
}

async function loadDirectorContext(
  supabase: ReturnType<typeof createRouteClient>,
  ownerId: string
): Promise<DirectorContext> {
  const [goals, debts, health, roadmaps, documents, conversations] =
    await Promise.all([
      supabase
        .from("beast_goals")
        .select("id, title, category, status, target_date, current_step, updated_at")
        .eq("owner_id", ownerId)
        .neq("status", "Archived")
        .order("updated_at", { ascending: false })
        .limit(20),
      supabase
        .from("debts")
        .select(
          "id, name, balance, minimum_payment, next_due_date_after_payment, payment_behavior, lifecycle_status, is_archived"
        )
        .eq("user_id", ownerId)
        .eq("is_archived", false)
        .limit(20),
      supabase
        .from("beast_health_records")
        .select("id, record_type, title, status, occurred_on, updated_at")
        .eq("owner_id", ownerId)
        .neq("status", "archived")
        .order("updated_at", { ascending: false })
        .limit(20),
      supabase
        .from("education_career_roadmaps")
        .select("id, title, status, progress, updated_at")
        .eq("owner_id", ownerId)
        .neq("status", "archived")
        .order("updated_at", { ascending: false })
        .limit(10),
      supabase
        .from("beast_documents")
        .select("id, title, category, status, updated_at")
        .eq("owner_id", ownerId)
        .order("updated_at", { ascending: false })
        .limit(10),
      supabase
        .from("agent_conversations")
        .select("agent_id, summary, updated_at")
        .eq("owner_id", ownerId)
        .in("agent_id", [
          "beastmoney.money-coach",
          "beasteducation.guidance-counselor",
          "beasthealth.health-advisor",
        ])
        .eq("archived", false)
        .order("updated_at", { ascending: false })
        .limit(12),
    ]);

  const signals: DirectorSignal[] = [
    ...(goals.error ? [] : goalSignals((goals.data || []) as Record<string, unknown>[])),
    ...(debts.error
      ? []
      : ((debts.data || []) as Record<string, unknown>[]).map((row) => ({
          id: String(row.id),
          domain: "money" as const,
          label: String(row.name),
          status: getDebtLifecycleLabel(getDebtLifecycleStatus(row)),
          date:
            typeof row.next_due_date_after_payment === "string"
              ? row.next_due_date_after_payment
              : null,
          detail:
            "Balance and minimum payment are available in BeastMoney. Review the current record before acting.",
          href: "/dashboard/money/debts",
          source: "BeastMoney debt record",
          updatedAt: null,
        }))),
    ...(health.error
      ? []
      : ((health.data || []) as Record<string, unknown>[]).map((row) => ({
          id: String(row.id),
          domain: "health" as const,
          label: String(row.title),
          status: String(row.status),
          date: typeof row.occurred_on === "string" ? row.occurred_on : null,
          detail: `Saved ${String(row.record_type).replaceAll("_", " ")} record. Medical meaning must remain with a qualified clinician.`,
          href: "/dashboard/health",
          source: "BeastHealth record",
          updatedAt: typeof row.updated_at === "string" ? row.updated_at : null,
        }))),
    ...(roadmaps.error
      ? []
      : ((roadmaps.data || []) as Record<string, unknown>[]).map((row) => ({
          id: String(row.id),
          domain: "education" as const,
          label: String(row.title),
          status: String(row.status),
          date: null,
          detail: `Saved education or career plan at ${Number(row.progress || 0)}% progress.`,
          href: "/dashboard/education/education-planning",
          source: "BeastEducation roadmap",
          updatedAt: typeof row.updated_at === "string" ? row.updated_at : null,
        }))),
  ];
  const unavailableSources = [
    goals.error ? "BeastGoals" : "",
    debts.error ? "BeastMoney" : "",
    health.error ? "BeastHealth" : "",
    roadmaps.error ? "BeastEducation" : "",
    documents.error ? "BeastDocuments" : "",
    conversations.error ? "specialist conversation summaries" : "",
  ].filter(Boolean);
  const specialistNames: Record<string, { name: string; href: string }> = {
    "beastmoney.money-coach": {
      name: "Money Coach",
      href: "/dashboard/money/coach",
    },
    "beasteducation.guidance-counselor": {
      name: "Guidance Counselor",
      href: "/dashboard/education/guidance-counselor",
    },
    "beasthealth.health-advisor": {
      name: "Health Advisor",
      href: "/dashboard/health/ai-advisor",
    },
  };
  const seen = new Set<string>();
  const specialistSummaries = conversations.error
    ? []
    : ((conversations.data || []) as Record<string, unknown>[]).flatMap((row) => {
        const professionalId = String(row.agent_id);
        if (seen.has(professionalId)) return [];
        seen.add(professionalId);
        const overview =
          row.summary && typeof row.summary === "object"
            ? (row.summary as Record<string, unknown>).overview
            : null;
        const professional = specialistNames[professionalId];
        if (!professional || typeof overview !== "string" || !overview.trim())
          return [];
        return [
          {
            professionalId,
            professionalName: professional.name,
            summary: overview.trim(),
            updatedAt: String(row.updated_at),
            href: professional.href,
          },
        ];
      });

  return { signals, specialistSummaries, unavailableSources };
}

export async function POST(request: Request) {
  const requestId = crypto.randomUUID();
  const { supabase, user } = await authenticatedClient();
  if (!user) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }
  let body: { action?: unknown; question?: unknown; conversationId?: unknown };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "A valid question is required." }, { status: 400 });
  }
  if (body.action === "create") {
    const createdAt = new Date().toISOString();
    const { data, error } = await supabase
      .from("agent_conversations")
      .insert({
        owner_id: user.id,
        agent_id: directorProfessionalId,
        title: "New Director conversation",
        tags: ["director", "cross-module"],
        summary: {
          overview: "No conversation summary yet.",
          decisions: [],
          unresolvedFollowUps: [],
          updatedAt: createdAt,
        },
      })
      .select("id, title, message_count, created_at, updated_at")
      .single();
    if (error || !data) {
      return NextResponse.json(
        { error: "A new Director conversation could not be saved." },
        { status: 503 }
      );
    }
    return NextResponse.json({
      conversation: {
        id: data.id,
        title: data.title,
        messageCount: data.message_count,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
        messages: [],
      },
    });
  }

  const question = typeof body.question === "string" ? body.question.trim() : "";
  if (!question || question.length > 2_000) {
    return NextResponse.json(
      { error: "Enter a question between 1 and 2,000 characters." },
      { status: 400 }
    );
  }

  const requestedConversationId =
    typeof body.conversationId === "string" ? body.conversationId : null;
  let conversation: Pick<ConversationRow, "id" | "title" | "message_count" | "summary">;
  if (requestedConversationId) {
    const { data, error } = await supabase
      .from("agent_conversations")
      .select("id, title, message_count, summary")
      .eq("id", requestedConversationId)
      .eq("owner_id", user.id)
      .eq("agent_id", directorProfessionalId)
      .maybeSingle();
    if (error || !data) {
      return NextResponse.json(
        { error: "That Director conversation is not available." },
        { status: 404 }
      );
    }
    conversation = data as typeof conversation;
  } else {
    const now = new Date().toISOString();
    const { data, error } = await supabase
      .from("agent_conversations")
      .insert({
        owner_id: user.id,
        agent_id: directorProfessionalId,
        title: question.replace(/\s+/g, " ").slice(0, 60),
        tags: ["director", "cross-module"],
        summary: {
          overview: "Director conversation started.",
          decisions: [],
          unresolvedFollowUps: [],
          updatedAt: now,
        },
      })
      .select("id, title, message_count, summary")
      .single();
    if (error || !data) {
      return NextResponse.json(
        { error: "A new Director conversation could not be saved." },
        { status: 503 }
      );
    }
    conversation = data as typeof conversation;
  }

  const createdAt = new Date().toISOString();
  const userMessageId = crypto.randomUUID();
  const directorMessageId = crypto.randomUUID();
  const [context, recentResult, memoryResult] = await Promise.all([
    loadDirectorContext(supabase, user.id),
    supabase.from("agent_conversation_messages").select("id, sender, content, created_at").eq("owner_id", user.id).eq("conversation_id", conversation.id).order("created_at", { ascending: false }).limit(12),
    supabase.from("agent_memories").select("memory_key, value, updated_at").eq("owner_id", user.id).eq("agent_id", directorProfessionalId).order("updated_at", { ascending: false }).limit(12),
  ]);
  if (recentResult.error || memoryResult.error) return NextResponse.json({ error: "Director conversation context is temporarily unavailable." }, { status: 503 });
  const defaultState: ConversationState = { currentTopic: null, currentWorkspace: "/dashboard/director", lastProfessionalQuestion: null, unresolvedQuestions: [], corrections: [], pendingApprovals: [], currentGoal: null, previousDecisions: [] };
  const directorState = conversation.summary?.runtimeState && typeof conversation.summary.runtimeState === "object" ? conversation.summary.runtimeState as ConversationState : defaultState;
  let runtime;
  try {
    runtime = await runDigitalStaffRuntime({ ownerId: user.id, professionalId: directorProfessionalId, conversationId: conversation.id, message: { id: userMessageId, role: "user", text: question, createdAt }, recentMessages: ([...(recentResult.data || [])] as MessageRow[]).reverse().map((row): RuntimeMessage => ({ id: row.id, role: row.sender?.kind === "user" ? "user" : "assistant", text: messageText(row.content), createdAt: row.created_at })), state: directorState, memories: (memoryResult.data || []).map((row) => ({ key: String(row.memory_key), value: row.value, updatedAt: String(row.updated_at) })), structuredRecords: [{ domain: "director", record: context }], workspace: "/dashboard/director" });
  } catch (error) {
    return NextResponse.json(safeDigitalStaffFailure("director-runtime-route", error, requestId), { status: 502 });
  }
  const recommendation = { answer: runtime.response, nextStep: runtime.nextQuestion || "Continue when you are ready.", recommendedHref: runtime.navigationTarget || "/dashboard/director", recommendedProfessional: runtime.handoff?.professionalId || "Avery Stone", rationale: "Generated by the shared Digital Staff runtime from current owner-scoped context." };
  const { error: messageError } = await supabase
    .from("agent_conversation_messages")
    .insert([
      {
        id: userMessageId,
        owner_id: user.id,
        conversation_id: conversation.id,
        sender: { kind: "user", id: user.id },
        recipient: { kind: "agent", id: directorProfessionalId },
        content: { text: question },
        created_at: createdAt,
      },
      {
        id: directorMessageId,
        owner_id: user.id,
        conversation_id: conversation.id,
        sender: { kind: "agent", id: directorProfessionalId },
        recipient: { kind: "module", id: "beastos" },
        content: { text: recommendation.answer, recommendation },
        created_at: createdAt,
      },
    ]);
  if (messageError) {
    return NextResponse.json(
      { error: "The Director response could not be added to conversation history." },
      { status: 503 }
    );
  }
  const { error: updateError } = await supabase
    .from("agent_conversations")
    .update({
      message_count: conversation.message_count + 2,
      summary: {
        overview: recommendation.answer,
        decisions: runtime.state.previousDecisions,
        unresolvedFollowUps: runtime.state.unresolvedQuestions,
        runtimeState: runtime.state,
        updatedAt: createdAt,
      },
      related_action_ids: [recommendation.recommendedHref],
      updated_at: createdAt,
    })
    .eq("id", conversation.id)
    .eq("owner_id", user.id)
    .eq("agent_id", directorProfessionalId);
  if (updateError) {
    return NextResponse.json(
      { error: "The Director response was saved, but its thread summary could not be updated." },
      { status: 503 }
    );
  }

  return NextResponse.json({
    conversation: {
      id: conversation.id,
      title: conversation.title,
      messageCount: conversation.message_count + 2,
      updatedAt: createdAt,
    },
    messages: [
      publicMessage({
        id: userMessageId,
        conversation_id: conversation.id,
        sender: { kind: "user", id: user.id },
        content: { text: question },
        created_at: createdAt,
      }),
      publicMessage({
        id: directorMessageId,
        conversation_id: conversation.id,
        sender: { kind: "agent", id: directorProfessionalId },
        content: { text: recommendation.answer, recommendation },
        created_at: createdAt,
      }),
    ],
    recommendation,
  });
}
