"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AgentAvatar,
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
  ProfessionalKnowledgeWorkspace,
  type AgentConversationMessage,
  type ProfessionalKnowledgeItem,
  type ProfessionalKnowledgeModel,
} from "@/app/components/agents";
import {
  buildGuidanceCounselorConversationTurn,
  buildGuidanceCounselorSessionAwareness,
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
  learnFromGuidanceKnowledgeAnswer,
  type GuidanceDiscoveryProfile,
} from "@/lib/education/discoveryConversation";
import type { GuidanceWorkflowRecommendation } from "@/lib/education/guidanceWorkflow";
import {
  ServerAgentConversationRepository,
  SupabaseAgentConversationStore,
  SupabaseExecutionHistoryStore,
  SupabaseAgentMemoryStore,
  type AgentMemoryRecord,
  type AgentConversationThread,
  type AgentMessage,
  type ExecutionAuditEvent,
  type ProfessionalExecutionHistory,
  type RecommendationLifecycleStatus,
} from "@/lib/platform/agents";
import { createClient } from "@/lib/supabase/client";

export const guidanceCounselorSuggestedQuestions = [
  "I’m not sure what career fits me.",
  "I want to make more money.",
  "Should I go to college?",
  "Should I learn a trade?",
  "Help me figure out what to study.",
  "I don’t know where to start.",
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
  recommendation: GuidanceWorkflowRecommendation;
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
  recommendation,
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
  const [knowledgePrompt, setKnowledgePrompt] = useState<{
    id: string;
    text: string;
    area: string;
  } | null>(null);
  const [discoveryProfile, setDiscoveryProfile] =
    useState<GuidanceDiscoveryProfile>(initialProfile);
  const [profileSaveStatus, setProfileSaveStatus] = useState<
    "idle" | "saving" | "saved" | "error"
  >("idle");
  const [sessionNow, setSessionNow] = useState<Date | null>(null);
  const [previousReviewAt, setPreviousReviewAt] = useState("");
  const [previousConversationSummary, setPreviousConversationSummary] =
    useState("");
  const [executionStore, setExecutionStore] =
    useState<SupabaseExecutionHistoryStore | null>(null);
  const [executionHistory, setExecutionHistory] =
    useState<ProfessionalExecutionHistory>();
  const [executionHistoryLoading, setExecutionHistoryLoading] = useState(true);
  const [executionHistoryError, setExecutionHistoryError] = useState("");
  const [decisionPending, setDecisionPending] = useState(false);
  const [actorType, setActorType] =
    useState<Extract<ExecutionAuditEvent["actorType"], "member" | "owner">>(
      "member"
    );
  const historyDialogRef = useRef<HTMLDivElement>(null);
  const conversationScrollPositionsRef = useRef(new Map<string, number>());

  useEffect(() => {
    setSessionNow(new Date());
  }, []);

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
      const previousConversation = available
        .filter((thread) => thread.messageCount > 0)
        .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))[0];
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
      setPreviousReviewAt(previousConversation?.updatedAt || "");
      setPreviousConversationSummary(
        previousConversation?.summary.overview
          ?.replace(/^Discussed\s+/i, "we discussed ")
          .replace(/[.!?]+$/, "") || ""
      );
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

  useEffect(() => {
    let cancelled = false;
    async function loadExecutionHistory() {
      const client = createClient();
      const [
        {
          data: { user },
          error: authError,
        },
        profileResult,
      ] = await Promise.all([
        client.auth.getUser(),
        client.from("profiles").select("role").eq("id", memberId).maybeSingle(),
      ]);
      if (authError) throw authError;
      if (!user || user.id !== memberId) {
        throw new Error("Execution history owner mismatch.");
      }
      const store = new SupabaseExecutionHistoryStore(client);
      const history = await store.listProfessionalHistory(
        memberId,
        professionalId
      );
      if (cancelled) return;
      setActorType(
        (profileResult.data as { role?: string } | null)?.role === "admin"
          ? "owner"
          : "member"
      );
      setExecutionStore(store);
      setExecutionHistory(history);
      setExecutionHistoryError("");
      setExecutionHistoryLoading(false);
    }
    void loadExecutionHistory().catch(() => {
      if (cancelled) return;
      setExecutionHistoryError(
        "Recommendation history is temporarily unavailable. Current guidance remains available from your saved education context."
      );
      setExecutionHistoryLoading(false);
    });
    return () => {
      cancelled = true;
    };
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

  async function refreshExecutionHistory() {
    if (!executionStore) return;
    setExecutionHistory(
      await executionStore.listProfessionalHistory(memberId, professionalId)
    );
  }

  const sourceRecommendationId = `guidance-workflow:${recommendation.action}`;
  const recommendationLifecycle = executionHistory?.recommendations.find(
    (item) =>
      item.supportingEvidence.some(
        (evidence) =>
          typeof evidence === "object" &&
          evidence !== null &&
          "sourceRecommendationId" in evidence &&
          evidence.sourceRecommendationId === sourceRecommendationId
      )
  );
  const recommendationLimitations = [
    "Guidance depends on the completeness and freshness of the member’s saved education context.",
    "School, credential, funding, and benefit requirements must be verified with current authoritative sources.",
  ];
  const recommendationEvidence = [
    { label: "Current recommendation", value: recommendation.action },
    { label: "Why", value: recommendation.why },
  ];

  async function decideRecommendation(
    nextStatus: Extract<
      RecommendationLifecycleStatus,
      "accepted" | "declined" | "deferred"
    >
  ) {
    if (!executionStore) {
      setExecutionHistoryError(
        "Recommendation decisions cannot be saved until recommendation history is available."
      );
      return;
    }
    setDecisionPending(true);
    setExecutionHistoryError("");
    try {
      let lifecycle = recommendationLifecycle;
      let requestStatus = lifecycle
        ? executionHistory?.requests.find(
            (request) => request.id === lifecycle?.requestId
          )?.status
        : undefined;
      if (!lifecycle) {
        const requestId = await executionStore.create({
          professionalId,
          requestType: "education_planning_recommendation_review",
          title: recommendation.title,
          actionClassification: "recommendation_only",
          contextReferences: [
            { source: "beasteducation", sourceRecommendationId },
          ],
          limitations: recommendationLimitations,
        });
        await executionStore.transition(
          requestId,
          "analyzing",
          actorType,
          { source: "guidance_counselor_recommendation" },
          recommendationEvidence
        );
        requestStatus = "analyzing";
        lifecycle = await executionStore.createRecommendation({
          ownerId: memberId,
          requestId,
          professionalId,
          title: recommendation.title,
          recommendation: recommendation.why,
          confidence: {
            level: "contextual",
            basis: "Saved member context and current planning state",
          },
          limitations: recommendationLimitations,
          supportingEvidence: [
            { source: "beasteducation", sourceRecommendationId },
            ...recommendationEvidence,
          ],
        });
      }
      if (lifecycle.status !== nextStatus) {
        await executionStore.transitionRecommendation({
          recommendationId: lifecycle.id,
          status: nextStatus,
          reason: `Member selected ${nextStatus} in Guidance Counselor.`,
          limitations: recommendationLimitations,
          supportingEvidence: [
            { source: "beasteducation", sourceRecommendationId },
            ...recommendationEvidence,
          ],
        });
      }
      await executionStore.recordDecision({
        ownerId: memberId,
        requestId: lifecycle.requestId,
        decisionScope: actorType === "owner" ? "owner" : "member",
        decision: nextStatus === "accepted" ? "approved" : nextStatus,
        reason: `Guidance Counselor recommendation ${nextStatus}.`,
        limitationsAcknowledged: recommendationLimitations,
      });
      if (requestStatus === "queued" || requestStatus === "awaiting_context") {
        await executionStore.transition(
          lifecycle.requestId,
          "analyzing",
          actorType,
          { recommendationStatus: nextStatus }
        );
        requestStatus = "analyzing";
      }
      if (requestStatus === "analyzing") {
        await executionStore.transition(
          lifecycle.requestId,
          nextStatus === "accepted"
            ? "approved"
            : nextStatus === "deferred"
              ? "awaiting_context"
              : "canceled",
          actorType,
          { recommendationStatus: nextStatus }
        );
      }
      await refreshExecutionHistory();
    } catch {
      setExecutionHistoryError(
        "The recommendation decision could not be saved. No application, enrollment, payment, or education record was changed."
      );
    } finally {
      setDecisionPending(false);
    }
  }

  async function recordRecommendationOutcome(
    outcomeStatus: "successful" | "neutral" | "unsuccessful"
  ) {
    if (!executionStore || !recommendationLifecycle) return;
    setDecisionPending(true);
    setExecutionHistoryError("");
    const learning =
      outcomeStatus === "successful"
        ? "Member reported that this planning guidance helped."
        : outcomeStatus === "neutral"
          ? "Member reported no clear change from this planning guidance."
          : "Member reported that this planning guidance did not help.";
    try {
      const request = executionHistory?.requests.find(
        (item) => item.id === recommendationLifecycle.requestId
      );
      if (request?.status === "approved") {
        await executionStore.transition(
          request.id,
          "executing",
          actorType,
          { source: "member_reported_outcome" }
        );
      }
      await executionStore.recordResultAndOutcome({
        ownerId: memberId,
        requestId: recommendationLifecycle.requestId,
        outcomeStatus,
        recommendationTitle: recommendation.title,
        memberLearning: [learning],
        actualResult: { source: "member_report", status: outcomeStatus },
        limitations: [
          "Outcome is member-reported and was not independently verified.",
        ],
        supportingEvidence: [
          { source: "member_report", sourceRecommendationId },
        ],
      });
      await executionStore.transitionRecommendation({
        recommendationId: recommendationLifecycle.id,
        status: "completed",
        reason: learning,
      });
      if (request?.status === "approved") {
        await executionStore.transition(
          request.id,
          "completed",
          actorType,
          { outcomeStatus, source: "member_report" }
        );
      }
      await refreshExecutionHistory();
    } catch {
      setExecutionHistoryError(
        "The outcome could not be saved. No application, enrollment, payment, or education record was changed."
      );
    } finally {
      setDecisionPending(false);
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
    const activeKnowledgePrompt = knowledgePrompt;
    setKnowledgePrompt(null);
    const turnId = `guidance-${Date.now()}`;
    const learnedProfile = activeKnowledgePrompt
      ? learnFromGuidanceKnowledgeAnswer(
          cleanQuestion,
          activeKnowledgePrompt.area,
          discoveryProfile
        )
      : learnFromDiscoveryTurn(cleanQuestion, discoveryProfile);
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
    setKnowledgePrompt(null);
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

  const sessionAwareness = buildGuidanceCounselorSessionAwareness({
    memberName,
    now: sessionNow || new Date(0),
    previousReviewAt,
    previousConversationSummary,
  });
  const timelineMessages = useMemo<AgentConversationMessage[]>(
    () => [
      {
        id: "guidance-counselor-opening",
        role: "agent",
        author: "Guidance Counselor",
        content: sessionAwareness.opening,
      },
      ...(knowledgePrompt
        ? [
            {
              id: knowledgePrompt.id,
              role: "agent" as const,
              author: "Guidance Counselor",
              content: knowledgePrompt.text,
            },
          ]
        : []),
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
    [knowledgePrompt, sessionAwareness.opening, streamingTurnId, turns]
  );

  const understanding = buildGuidanceCounselorUnderstanding(discoveryProfile);
  const guidanceKnowledgeItem = (
    item: GuidanceUnderstandingItem
  ): ProfessionalKnowledgeItem => ({
    id: `guidance-${item.area}`,
    label: item.label,
    summary:
      item.value ||
      item.question ||
      "The Guidance Counselor needs more context before using this area.",
    confidence: item.confidence,
    why:
      item.state === "thought"
        ? `This is a working idea based on ${item.evidence.join(", ")}.`
        : undefined,
    evidence: item.evidence,
    action: {
      label:
        item.state === "needed"
          ? "Talk about this"
          : item.state === "thought"
            ? "Revisit this"
            : "Review or update",
      mode: "conversation",
      prompt:
        item.state === "needed"
          ? item.question ||
            `Tell me what you would like me to understand about ${item.label.toLowerCase()}.`
          : item.state === "thought"
            ? `I currently see ${item.value} as a possibility. What would you like me to reconsider or clarify?`
            : `I currently have ${item.label.toLowerCase()} as “${item.value}.” Tell me what you want to correct, replace, or expand.`,
    },
  });
  const guidanceKnowledgeModel: ProfessionalKnowledgeModel = {
    professionalId,
    professionalName: "Guidance Counselor",
    known: understanding.whatIKnow.map(guidanceKnowledgeItem),
    thinking: understanding.whatIThink.map(guidanceKnowledgeItem),
    needed: understanding.whatIStillNeed
      .slice()
      .sort((left, right) => left.priority - right.priority)
      .slice(0, 4)
      .map(guidanceKnowledgeItem),
    emptyStates: {
      known:
        "We’re just getting started. As we talk I’ll learn about your goals, interests, strengths, education, and preferred learning style.",
      thinking:
        "It’s too early to draw conclusions. I’ll build working ideas as I learn more about you through our conversations.",
      needed:
        "I have enough context for the current guidance. I’ll ask for more only when it would improve the plan.",
    },
  };

  function beginKnowledgeConversation(item: ProfessionalKnowledgeItem) {
    if (item.action.mode !== "conversation") return;
    const prompt = item.action.prompt;
    setKnowledgePrompt({
      id: `guidance-knowledge-prompt-${Date.now()}`,
      text: prompt,
      area: item.id.replace(/^guidance-/, ""),
    });
    window.requestAnimationFrame(focusComposer);
  }
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
  const recommendationHistory = executionHistory?.recommendations || [];
  const reportedOutcomes = executionHistory?.outcomes || [];
  const supportPanels = (
    <div className="grid gap-5">
      <div data-guidance-understanding-model="true">
        <ProfessionalKnowledgeWorkspace
          model={guidanceKnowledgeModel}
          onAction={beginKnowledgeConversation}
          className="rounded-2xl border border-white/10 bg-black/10 p-4"
        />
      </div>

      <section
        className="rounded-2xl border border-violet-300/20 bg-violet-300/[0.06] p-4 sm:p-5"
        aria-labelledby="guidance-current-recommendation"
      >
        <p className="text-xs font-black uppercase tracking-[0.14em] text-violet-200">
          Current recommendation
        </p>
        <h2
          id="guidance-current-recommendation"
          className="mt-2 text-xl font-black text-white"
        >
          {recommendation.title}
        </h2>
        <p className="mt-3 text-sm leading-6 text-slate-200">
          {recommendation.introduction}
        </p>
        <div className="mt-4 rounded-xl border border-white/10 bg-black/15 p-4">
          <p className="text-xs font-black uppercase tracking-wide text-slate-400">
            Why this matters
          </p>
          <p className="mt-2 text-sm leading-6 text-slate-200">
            {recommendation.why}
          </p>
          <p className="mt-3 text-sm leading-6 text-slate-300">
            Expected outcome: {recommendation.outcome}
          </p>
        </div>
        <p className="mt-4 text-xs leading-5 text-slate-400">
          Accepting records your decision only. It does not submit an
          application, enroll you, move money, or change an education record.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Link
            href={recommendation.href}
            className="beast-button-secondary inline-flex min-h-11 items-center"
          >
            {recommendation.actionLabel}
          </Link>
          {!recommendationLifecycle ||
          ["proposed", "deferred"].includes(recommendationLifecycle.status) ? (
            <button
              type="button"
              className="beast-button min-h-11"
              disabled={decisionPending || !executionStore}
              onClick={() => void decideRecommendation("accepted")}
            >
              Accept
            </button>
          ) : null}
          {!recommendationLifecycle ||
          recommendationLifecycle.status === "proposed" ? (
            <button
              type="button"
              className="beast-button-secondary min-h-11"
              disabled={decisionPending || !executionStore}
              onClick={() => void decideRecommendation("deferred")}
            >
              Defer
            </button>
          ) : null}
          {!recommendationLifecycle ||
          ["proposed", "deferred"].includes(recommendationLifecycle.status) ? (
            <button
              type="button"
              className="beast-button-secondary min-h-11"
              disabled={decisionPending || !executionStore}
              onClick={() => void decideRecommendation("declined")}
            >
              Decline
            </button>
          ) : null}
        </div>
        {recommendationLifecycle?.status === "accepted" ? (
          <div className="mt-4 border-t border-white/10 pt-4">
            <p className="text-xs font-bold text-slate-300">
              After using this guidance, what changed?
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              <button
                type="button"
                className="beast-button-secondary min-h-11"
                disabled={decisionPending}
                onClick={() => void recordRecommendationOutcome("successful")}
              >
                It helped
              </button>
              <button
                type="button"
                className="beast-button-secondary min-h-11"
                disabled={decisionPending}
                onClick={() => void recordRecommendationOutcome("neutral")}
              >
                No clear change
              </button>
              <button
                type="button"
                className="beast-button-secondary min-h-11"
                disabled={decisionPending}
                onClick={() =>
                  void recordRecommendationOutcome("unsuccessful")
                }
              >
                It did not help
              </button>
            </div>
          </div>
        ) : null}
        {executionHistoryLoading ? (
          <p className="mt-4 text-xs text-slate-400" role="status">
            Loading recommendation history…
          </p>
        ) : null}
        {executionHistoryError ? (
          <p
            className="mt-4 rounded-xl border border-amber-300/20 bg-amber-300/10 p-3 text-sm leading-6 text-amber-100"
            role="alert"
          >
            {executionHistoryError}
          </p>
        ) : null}
      </section>

      <div className="grid gap-5 lg:grid-cols-2">
        <section className="rounded-2xl border border-white/10 bg-black/10 p-4 sm:p-5">
          <h2 className="text-base font-black text-white">
            Recommendation history
          </h2>
          <p className="mt-1 text-sm leading-6 text-slate-400">
            Decisions you have made with your Guidance Counselor.
          </p>
          {recommendationHistory.length ? (
            <ul className="mt-4 grid gap-3">
              {recommendationHistory.slice(0, 4).map((item) => (
                <li
                  key={item.id}
                  className="rounded-xl border border-white/10 bg-white/[0.03] p-3"
                >
                  <p className="font-bold text-white">{item.title}</p>
                  <p className="mt-1 text-xs font-bold uppercase tracking-wide text-violet-200">
                    {item.status}
                  </p>
                </li>
              ))}
            </ul>
          ) : executionHistoryLoading ? null : (
            <p className="mt-4 text-sm leading-6 text-slate-400">
              No recommendation decisions have been recorded yet.
            </p>
          )}
        </section>

        <section className="rounded-2xl border border-white/10 bg-black/10 p-4 sm:p-5">
          <h2 className="text-base font-black text-white">Outcome learning</h2>
          <p className="mt-1 text-sm leading-6 text-slate-400">
            Member-reported outcomes help shape future guidance. They do not
            create autonomous decisions.
          </p>
          {reportedOutcomes.length ? (
            <ul className="mt-4 grid gap-3">
              {reportedOutcomes.slice(0, 4).map((outcome) => (
                <li
                  key={outcome.id}
                  className="rounded-xl border border-white/10 bg-white/[0.03] p-3"
                >
                  <p className="font-bold capitalize text-white">
                    {outcome.outcomeStatus}
                  </p>
                  <p className="mt-1 text-sm leading-6 text-slate-300">
                    {outcome.memberLearning.join(" ") ||
                      "No member-reported detail was recorded."}
                  </p>
                </li>
              ))}
            </ul>
          ) : executionHistoryLoading ? null : (
            <p className="mt-4 text-sm leading-6 text-slate-400">
              No outcomes have been reported yet. This area updates only after
              you explicitly report what happened.
            </p>
          )}
        </section>
      </div>
    </div>
  );

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
          cardsPlacement="after-conversation"
          cardsLayout="stack"
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
            sessionNow ? (
              <AgentGreeting greeting={sessionAwareness.greeting} />
            ) : (
              <AgentLoadingState
                label="Preparing Guidance Counselor greeting"
                lines={1}
              />
            )
          }
          contextSummary={null}
          smartCards={supportPanels}
          suggestedActions={null}
          conversation={
            historyLoading ? (
              <AgentLoadingState label="Loading Guidance Counselor conversation" />
            ) : (
              <section
                className="flex min-h-[36rem] min-w-0 flex-col"
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
                {historyError && turns.length === 0 ? (
                  <AgentEmptyState
                    title="Conversation history unavailable"
                    description="You can still start a conversation while saved history reconnects."
                  />
                ) : (
                  <ProfessionalConversationTimeline
                    messages={timelineMessages}
                    conversationId={activeThreadId || "new-conversation"}
                    streaming={Boolean(streamingTurnId)}
                    scrollPositions={conversationScrollPositionsRef}
                    professionalName="Guidance Counselor"
                  />
                )}
                <div className="mt-4 grid gap-4 border-t border-white/[0.07] pt-4">
                  <ProfessionalConversationComposer id="guidance-counselor-question">
                    <AgentConversationInput
                      value={input}
                      onChange={setInput}
                      onSubmit={sendMessage}
                      label="Message your Guidance Counselor"
                      placeholder="Ask about career direction, schools, certifications, funding, skills, or your roadmap…"
                      busy={Boolean(streamingTurnId)}
                    />
                  </ProfessionalConversationComposer>
                  {profileSaveStatus === "saving" ? (
                    <p
                      className="text-xs font-bold text-indigo-100"
                      role="status"
                    >
                      Remembering what you shared…
                    </p>
                  ) : profileSaveStatus === "saved" ? (
                    <p
                      className="text-xs font-bold text-emerald-200"
                      role="status"
                    >
                      I’ll remember this for future guidance.
                    </p>
                  ) : profileSaveStatus === "error" ? (
                    <p className="text-xs font-bold text-red-200" role="alert">
                      I couldn’t save that profile update. Your conversation is
                      still here.
                    </p>
                  ) : null}
                  {starterExperience}
                </div>
              </section>
            )
          }
          composer={null}
          statusArea={null}
        />
      </ProfessionalConversationWorkspace>
    </div>
  );
}
