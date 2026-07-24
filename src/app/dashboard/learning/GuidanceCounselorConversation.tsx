"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AgentAvatar,
  AgentContextSummary,
  AgentConversationInput,
  AgentEmptyState,
  AgentExperience,
  AgentGreeting,
  AgentHeader,
  AgentLoadingState,
  AgentStatus,
  AgentStreamingResponseArea,
  ProfessionalConversationComposer,
  ProfessionalConversationTimeline,
  ProfessionalConversationWorkspace,
  type AgentConversationMessage,
} from "@/app/components/agents";
import {
  buildGuidanceCounselorConversationTurn,
  buildGuidanceCounselorUnderstanding,
  explicitGuidanceGoalChange,
  guidanceRelationshipMemoryRecord,
  guidanceRelationshipReference,
  type GuidanceCounselorConversationContext,
  type GuidanceUnderstandingItem,
} from "@/lib/education";
import {
  discoveryProfileUpdate,
  learnFromDiscoveryTurn,
  type GuidanceDiscoveryProfile,
} from "@/lib/education/discoveryConversation";
import {
  ServerAgentConversationRepository,
  SupabaseAgentConversationStore,
  SupabaseAgentMemoryStore,
  type AgentMemoryRecord,
  type AgentConversationThread,
  type AgentMessage,
} from "@/lib/platform/agents";
import { createClient } from "@/lib/supabase/client";

export const guidanceCounselorSuggestedQuestions = [
  "Let’s review my educational goals.",
  "Help me explore career paths that fit me.",
  "What should I learn next?",
  "Let’s update my roadmap.",
] as const;

type GuidanceTurn = {
  id: string;
  question: string;
  response: string;
};

type GuidanceCounselorConversationProps = {
  memberId: string;
  memberName: string;
  context: GuidanceCounselorConversationContext;
  initialProfile: GuidanceDiscoveryProfile;
};

const professionalId = "beasteducation.guidance-counselor";

function historyErrorMessage(error: unknown) {
  const detail =
    error instanceof Error
      ? error.message
      : typeof error === "object" && error && "message" in error
        ? String(error.message)
        : String(error);
  return process.env.NODE_ENV === "development"
    ? `Conversation history could not load: ${detail}`
    : "Conversation history could not load. Please try again.";
}

export default function GuidanceCounselorConversation({
  memberId,
  memberName,
  context,
  initialProfile,
}: GuidanceCounselorConversationProps) {
  const router = useRouter();
  const [input, setInput] = useState("");
  const [turns, setTurns] = useState<GuidanceTurn[]>([]);
  const [repository, setRepository] =
    useState<ServerAgentConversationRepository | null>(null);
  const [memoryStore, setMemoryStore] =
    useState<SupabaseAgentMemoryStore | null>(null);
  const [relationshipMemories, setRelationshipMemories] = useState<
    AgentMemoryRecord[]
  >([]);
  const [threads, setThreads] = useState<AgentConversationThread[]>([]);
  const [activeThreadId, setActiveThreadId] = useState("");
  const [conversationTitle, setConversationTitle] = useState("New conversation");
  const [historyOpen, setHistoryOpen] = useState(false);
  const [historySearch, setHistorySearch] = useState("");
  const [historyLoading, setHistoryLoading] = useState(true);
  const [historyError, setHistoryError] = useState("");
  const [streamingTurnId, setStreamingTurnId] = useState("");
  const [discoveryProfile, setDiscoveryProfile] =
    useState<GuidanceDiscoveryProfile>(initialProfile);
  const [profileSaveStatus, setProfileSaveStatus] = useState<
    "idle" | "saving" | "saved" | "error"
  >("idle");
  const historyDialogRef = useRef<HTMLDivElement>(null);
  const conversationScrollPositionsRef = useRef(new Map<string, number>());

  useEffect(() => {
    if (!historyOpen) return;
    historyDialogRef.current?.querySelector<HTMLButtonElement>("button")?.focus();
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setHistoryOpen(false);
    }
    document.addEventListener("keydown", closeOnEscape);
    return () => document.removeEventListener("keydown", closeOnEscape);
  }, [historyOpen]);

  useEffect(() => {
    let cancelled = false;
    async function loadHistory() {
      const client = createClient();
      const {
        data: { user },
        error,
      } = await client.auth.getUser();
      if (error) throw error;
      if (!user || user.id !== memberId) {
        throw new Error("The authenticated member does not match this conversation.");
      }
      const nextRepository = new ServerAgentConversationRepository(
        new SupabaseAgentConversationStore(client)
      );
      const nextMemoryStore = new SupabaseAgentMemoryStore(client);
      const memories = await nextMemoryStore.query({
        ownerId: memberId,
        agentId: professionalId,
        scope: "user",
      });
      let available = await nextRepository.list({
        ownerId: memberId,
        agentId: professionalId,
        includeArchived: true,
      });
      if (available.length === 0) {
        available = [
          await nextRepository.create({
            ownerId: memberId,
            agentId: professionalId,
          }),
        ];
      }
      if (cancelled) return;
      const active = available.find((thread) => !thread.archived) || available[0];
      setRepository(nextRepository);
      setMemoryStore(nextMemoryStore);
      setRelationshipMemories([...memories]);
      setThreads(available);
      setActiveThreadId(active.id);
      setConversationTitle(active.title);
      restoreThread(active);
      setHistoryError("");
      setHistoryLoading(false);
    }
    void loadHistory().catch((cause: unknown) => {
      if (cancelled) return;
      setHistoryError(historyErrorMessage(cause));
      setHistoryLoading(false);
    });
    return () => {
      cancelled = true;
    };
  // restoreThread has stable behavior and history loads only for the authenticated owner.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [memberId]);

  function restoreThread(thread: AgentConversationThread) {
    const restored: GuidanceTurn[] = [];
    for (let index = 0; index < thread.messages.length; index += 2) {
      const member = thread.messages[index];
      const counselor = thread.messages[index + 1];
      if (!member || !counselor) continue;
      const content =
        typeof counselor.content === "string"
          ? counselor.content
          : String((counselor.content as { text?: string }).text || "");
      restored.push({
        id: member.id.replace(/-user$/, ""),
        question: String(member.content),
        response: content,
      });
    }
    setTurns(restored);
  }

  async function refreshThreads(search = historySearch) {
    if (!repository) return;
    try {
      setThreads(
        await repository.list({
          ownerId: memberId,
          agentId: professionalId,
          includeArchived: true,
          search,
        })
      );
      setHistoryError("");
    } catch {
      setHistoryError("Saved conversations could not be refreshed. Please try again.");
    }
  }

  async function saveDiscoveryProfile(profile: GuidanceDiscoveryProfile) {
    setProfileSaveStatus("saving");
    const result = await createClient()
      .from("education_profiles")
      .upsert(
        { owner_id: memberId, ...discoveryProfileUpdate(profile) },
        { onConflict: "owner_id" }
      )
      .select("owner_id")
      .single();
    if (result.error) {
      setProfileSaveStatus("error");
      return;
    }
    setProfileSaveStatus("saved");
    router.refresh();
  }

  async function sendMessage(question: string) {
    const cleanQuestion = question.trim();
    if (!cleanQuestion) return;
    const turnId = `guidance-${Date.now()}`;
    const learnedProfile = learnFromDiscoveryTurn(
      cleanQuestion,
      discoveryProfile
    );
    const changedGoal = explicitGuidanceGoalChange(
      cleanQuestion,
      discoveryProfile.goal
    );
    if (changedGoal) learnedProfile.goal = changedGoal;
    const relationshipMemory = guidanceRelationshipReference({
      memories: relationshipMemories,
      previousProfile: discoveryProfile,
      currentProfile: learnedProfile,
      currentConversationId: activeThreadId,
    });
    const response = buildGuidanceCounselorConversationTurn({
      question: cleanQuestion,
      context: {
        ...context,
        educationalGoal: learnedProfile.goal || context.educationalGoal,
        interests:
          learnedProfile.careerInterests.join(", ") || context.interests,
        careerDirection: learnedProfile.goal || context.careerDirection,
      },
      profile: learnedProfile,
      previousCounselorResponses: turns.map((turn) => turn.response),
      relationshipMemory,
    }).text;

    setStreamingTurnId(turnId);
    setTurns((current) => [
      ...current,
      { id: turnId, question: cleanQuestion, response },
    ]);
    setDiscoveryProfile(learnedProfile);
    setInput("");
    void saveDiscoveryProfile(learnedProfile);

    if (repository && activeThreadId) {
      const now = new Date().toISOString();
      const messages: AgentMessage[] = [
        {
          id: `${turnId}-user`,
          threadId: activeThreadId,
          sender: { kind: "user", id: memberId },
          recipient: { kind: "agent", id: professionalId },
          content: cleanQuestion,
          timestamp: now,
        },
        {
          id: `${turnId}-counselor`,
          threadId: activeThreadId,
          sender: { kind: "agent", id: professionalId },
          recipient: { kind: "module", id: "beasteducation" },
          content: { text: response },
          timestamp: now,
        },
      ];
      try {
        const updated = await repository.append(
          memberId,
          activeThreadId,
          messages
        );
        await repository.summarize(memberId, activeThreadId, {
          overview: `Discussed ${cleanQuestion.slice(0, 100)}`,
          decisions: [],
          unresolvedFollowUps: [],
          updatedAt: now,
        });
        setConversationTitle(updated.title);
        const memory = guidanceRelationshipMemoryRecord({
          ownerId: memberId,
          profile: learnedProfile,
          conversationId: activeThreadId,
          messageId: messages[0].id,
          capturedAt: now,
        });
        if (memoryStore && memory) {
          await memoryStore.put(memory);
          setRelationshipMemories((current) => [
            memory,
            ...current.filter((item) => item.id !== memory.id),
          ]);
        }
        await refreshThreads();
      } catch {
        setHistoryError(
          "This response is visible now but could not be saved. Please retry before leaving."
        );
      }
    }
    setStreamingTurnId("");
    window.requestAnimationFrame(focusComposer);
  }

  async function startConversation() {
    conversationScrollPositionsRef.current.delete("new-conversation");
    if (!repository) {
      setActiveThreadId("");
      setConversationTitle("New conversation");
      setTurns([]);
      window.requestAnimationFrame(focusComposer);
      return;
    }
    const thread = await repository.create({
      ownerId: memberId,
      agentId: professionalId,
    });
    setActiveThreadId(thread.id);
    setConversationTitle(thread.title);
    setTurns([]);
    setHistoryOpen(false);
    await refreshThreads();
    window.requestAnimationFrame(focusComposer);
  }

  function openThread(thread: AgentConversationThread) {
    setActiveThreadId(thread.id);
    setConversationTitle(thread.title);
    restoreThread(thread);
    setHistoryOpen(false);
  }

  async function renameThread(thread: AgentConversationThread) {
    const title = window.prompt("Rename conversation", thread.title);
    if (!title || !repository) return;
    await repository.rename(memberId, thread.id, title);
    if (thread.id === activeThreadId) setConversationTitle(title);
    await refreshThreads();
  }

  async function archiveThread(thread: AgentConversationThread) {
    await repository?.archive(memberId, thread.id, !thread.archived);
    await refreshThreads();
  }

  async function deleteThread(thread: AgentConversationThread) {
    if (
      !repository ||
      !window.confirm("Delete this Guidance Counselor conversation?")
    ) {
      return;
    }
    await repository.delete(memberId, thread.id, true, "retain");
    if (thread.id === activeThreadId) await startConversation();
    else await refreshThreads();
  }

  function focusComposer() {
    document
      .getElementById("guidance-counselor-question")
      ?.querySelector("textarea")
      ?.focus({ preventScroll: true });
  }

  const timelineMessages = useMemo<AgentConversationMessage[]>(
    () => [
      {
        id: "guidance-counselor-opening",
        role: "agent",
        author: "Guidance Counselor",
        content: `Hi${memberName ? ` ${memberName}` : ""}. I’m your Guidance Counselor. How can I help you today?`,
      },
      ...turns.flatMap<AgentConversationMessage>((turn) => [
        {
          id: `${turn.id}-user`,
          role: "user",
          author: "You",
          content: turn.question,
        },
        {
          id: `${turn.id}-counselor`,
          role: "agent",
          author: "Guidance Counselor",
          streaming: streamingTurnId === turn.id,
          content: (
            <AgentStreamingResponseArea
              isStreaming={streamingTurnId === turn.id}
              label="Guidance Counselor response"
            >
              <p>{turn.response}</p>
            </AgentStreamingResponseArea>
          ),
        },
      ]),
    ],
    [memberName, streamingTurnId, turns]
  );

  const understanding = buildGuidanceCounselorUnderstanding(discoveryProfile);
  const understandingItems = (items: readonly GuidanceUnderstandingItem[]) =>
    items.map((item) => (
      <span key={item.area}>
        <strong className="text-white">{item.label}</strong>
        {" · "}
        <span className="capitalize text-cyan-200">
          {item.confidence} confidence
        </span>
        {item.value ? ` · ${item.value}` : ""}
      </span>
    ));
  const pinnedThreads = threads.filter(
    (thread) => thread.pinned && !thread.archived
  );
  const recentThreads = threads.filter(
    (thread) => !thread.pinned && !thread.archived
  );
  const archivedThreads = threads.filter((thread) => thread.archived);

  function conversationGroup(
    label: string,
    items: readonly AgentConversationThread[]
  ) {
    if (!items.length) return null;
    return (
      <section aria-label={label}>
        <h3 className="px-2 text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">
          {label}
        </h3>
        <div className="mt-2 grid gap-1">
          {items.map((thread) => (
            <article
              key={thread.id}
              className={`group rounded-xl border px-2 py-2.5 ${
                thread.id === activeThreadId
                  ? "border-cyan-300/35 bg-cyan-300/10"
                  : "border-transparent hover:border-white/10 hover:bg-white/[0.04]"
              }`}
              aria-current={thread.id === activeThreadId ? "page" : undefined}
            >
              <button
                type="button"
                className="w-full rounded-md text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan-300"
                onClick={() => openThread(thread)}
              >
                <span className="block truncate text-sm font-bold text-white">
                  {thread.title}
                </span>
                <span className="mt-1 block text-[11px] text-slate-500">
                  {new Date(thread.updatedAt).toLocaleDateString()} ·{" "}
                  {thread.messageCount} messages
                </span>
              </button>
              <div className="mt-2 flex flex-wrap gap-x-3 gap-y-2 opacity-80 transition group-hover:opacity-100 group-focus-within:opacity-100">
                <button
                  type="button"
                  className="text-[11px] font-bold text-cyan-200"
                  onClick={() => void renameThread(thread)}
                >
                  Rename
                </button>
                <button
                  type="button"
                  className="text-[11px] font-bold text-cyan-200"
                  onClick={() =>
                    void repository
                      ?.pin(memberId, thread.id, !thread.pinned)
                      .then(() => refreshThreads())
                  }
                >
                  {thread.pinned ? "Unpin" : "Pin"}
                </button>
                <button
                  type="button"
                  className="text-[11px] font-bold text-cyan-200"
                  onClick={() => void archiveThread(thread)}
                >
                  {thread.archived ? "Restore" : "Archive"}
                </button>
                <button
                  type="button"
                  className="text-[11px] font-bold text-red-200"
                  onClick={() => void deleteThread(thread)}
                >
                  Delete
                </button>
              </div>
            </article>
          ))}
        </div>
      </section>
    );
  }

  const historyPanel = (
    <aside
      className="flex h-full min-h-0 flex-col bg-[#0d131e]"
      aria-label="Guidance Counselor conversation navigation"
      data-professional-left-navigation="true"
    >
      <div className="flex items-center justify-between gap-3 border-b border-white/10 p-4">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.16em] text-cyan-300">
            Guidance Counselor
          </p>
          <h2 className="mt-1 text-base font-black text-white">
            Conversations <span aria-hidden="true">▼</span>
          </h2>
        </div>
        <button
          type="button"
          className="text-sm font-bold text-slate-300 lg:hidden"
          onClick={() => setHistoryOpen(false)}
          aria-label="Close chat history"
        >
          Close
        </button>
      </div>
      <div className="p-3">
        <button
          type="button"
          className="beast-button flex min-h-11 w-full items-center justify-center gap-2"
          onClick={() => void startConversation()}
        >
          <span aria-hidden="true">＋</span> New Conversation
        </button>
        {historyError ? (
          <p
            className="mt-3 rounded-lg border border-red-300/20 bg-red-300/10 p-2 text-xs leading-5 text-red-100"
            role="alert"
          >
            {historyError}
          </p>
        ) : null}
        <label className="mt-3 block text-xs font-bold text-slate-300">
          <span className="sr-only">Search conversations</span>
          <span className="relative block">
            <span
              className="pointer-events-none absolute left-3 top-3 text-slate-500"
              aria-hidden="true"
            >
              ⌕
            </span>
            <input
              className="min-h-11 w-full rounded-xl border border-white/10 bg-slate-950 pl-9 pr-3 text-sm text-white outline-none placeholder:text-slate-600 focus:border-cyan-300 focus:ring-2 focus:ring-cyan-300/20"
              value={historySearch}
              onChange={(event) => {
                setHistorySearch(event.target.value);
                void refreshThreads(event.target.value);
              }}
              placeholder="Search"
            />
          </span>
        </label>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto px-3 pb-3">
        <div className="grid gap-5">
          {conversationGroup("Pinned Conversations", pinnedThreads)}
          {conversationGroup("Recent Conversations", recentThreads)}
          {conversationGroup("Archived", archivedThreads)}
          {!historyLoading && threads.length === 0 ? (
            <p className="py-4 text-sm text-slate-400">
              No matching conversations.
            </p>
          ) : null}
        </div>
      </div>
    </aside>
  );

  const starterExperience =
    !historyLoading && turns.length === 0 ? (
      <section aria-labelledby="guidance-counselor-starters-heading">
        <h2
          id="guidance-counselor-starters-heading"
          className="text-xs font-black uppercase tracking-[0.16em] text-slate-500"
        >
          Start a conversation
        </h2>
        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          {guidanceCounselorSuggestedQuestions.map((question) => (
            <button
              key={question}
              type="button"
              className="min-h-12 rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-left text-sm font-semibold leading-5 text-slate-200 transition hover:border-cyan-300/30 hover:bg-cyan-300/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan-300"
              onClick={() => void sendMessage(question)}
            >
              {question}
            </button>
          ))}
        </div>
      </section>
    ) : null;

  return (
    <div
      id="guidance-counselor-conversation"
      className="scroll-mt-24"
      data-guidance-home-primary="true"
    >
      <ProfessionalConversationWorkspace
        history={historyPanel}
        historyOpen={historyOpen}
        onCloseHistory={() => setHistoryOpen(false)}
        historyDialogRef={historyDialogRef}
        professionalName="Guidance Counselor"
        drawerId="guidance-counselor-history-drawer"
      >
        <AgentExperience
          className="max-w-none border-white/10 bg-[#141a24]"
          composerPlacement="before-cards"
          header={
            <AgentHeader
              title="Guidance Counselor"
              subtitle="Your primary BeastEducation professional"
              avatar={
                <AgentAvatar
                  name="Guidance Counselor"
                  initials="GC"
                  size="lg"
                />
              }
              status={
                <div className="flex items-center gap-2">
                  <AgentStatus
                    state={
                      historyLoading
                        ? "loading"
                        : streamingTurnId
                          ? "streaming"
                          : historyError
                            ? "error"
                            : "available"
                    }
                  />
                  <button
                    type="button"
                    className="beast-button-secondary min-h-11 lg:hidden"
                    aria-expanded={historyOpen}
                    aria-controls="guidance-counselor-history-drawer"
                    onClick={() => setHistoryOpen(true)}
                  >
                    Conversations
                  </button>
                </div>
              }
            />
          }
          greeting={
            <AgentGreeting greeting={`Hi${memberName ? ` ${memberName}` : ""}.`}>
              <p>I’m your Guidance Counselor. How can I help you today?</p>
            </AgentGreeting>
          }
          contextSummary={
            <div className="grid gap-5">
              <div
                className="grid gap-3 lg:grid-cols-3"
                data-guidance-understanding-model="true"
              >
                <AgentContextSummary
                  title="What I Know"
                  items={understandingItems(understanding.whatIKnow)}
                  emptyState={
                    <p className="mt-3 text-sm text-slate-400">
                      Nothing is confirmed yet.
                    </p>
                  }
                />
                <AgentContextSummary
                  title="What I Think"
                  items={understandingItems(understanding.whatIThink)}
                  emptyState={
                    <p className="mt-3 text-sm text-slate-400">
                      I don’t have a useful working hypothesis yet.
                    </p>
                  }
                />
                <AgentContextSummary
                  title="What I Still Need"
                  items={understandingItems(understanding.whatIStillNeed)}
                  emptyState={
                    <p className="mt-3 text-sm text-slate-400">
                      I have enough context for the current plan.
                    </p>
                  }
                />
              </div>
              {starterExperience}
            </div>
          }
          suggestedActions={null}
          conversation={
            historyLoading ? (
              <AgentLoadingState label="Loading Guidance Counselor conversation" />
            ) : historyError && turns.length === 0 ? (
              <AgentEmptyState
                title="Conversation history unavailable"
                description="You can still start a conversation while saved history reconnects."
              />
            ) : (
              <section
                className="flex h-[36rem] min-w-0 flex-col"
                aria-label="Active Guidance Counselor conversation"
              >
                <div className="mb-1 flex flex-wrap items-center justify-between gap-2 border-b border-white/[0.07] pb-3">
                  <p className="truncate text-sm font-semibold text-slate-400">
                    {conversationTitle}
                  </p>
                  <button
                    type="button"
                    className="text-xs font-bold text-cyan-200"
                    onClick={() => {
                      const active = threads.find(
                        (thread) => thread.id === activeThreadId
                      );
                      if (active) void renameThread(active);
                    }}
                  >
                    Rename
                  </button>
                </div>
                <ProfessionalConversationTimeline
                  messages={timelineMessages}
                  conversationId={activeThreadId || "new-conversation"}
                  streaming={Boolean(streamingTurnId)}
                  scrollPositions={conversationScrollPositionsRef}
                  professionalName="Guidance Counselor"
                />
              </section>
            )
          }
          composer={
            <ProfessionalConversationComposer id="guidance-counselor-question">
              <AgentConversationInput
                value={input}
                onChange={setInput}
                onSubmit={sendMessage}
                label="Message your Guidance Counselor"
                placeholder="Ask about education, career paths, certifications, colleges, trades, or what to learn next…"
                busy={Boolean(streamingTurnId)}
              />
            </ProfessionalConversationComposer>
          }
          statusArea={
            profileSaveStatus === "saving" ? (
              <p className="text-xs font-bold text-indigo-100" role="status">
                Remembering what you shared…
              </p>
            ) : profileSaveStatus === "saved" ? (
              <p className="text-xs font-bold text-emerald-200" role="status">
                I’ll remember this for future guidance.
              </p>
            ) : profileSaveStatus === "error" ? (
              <p className="text-xs font-bold text-red-200" role="alert">
                I couldn’t save that profile update. Your conversation is still
                here.
              </p>
            ) : null
          }
        />
      </ProfessionalConversationWorkspace>
    </div>
  );
}
