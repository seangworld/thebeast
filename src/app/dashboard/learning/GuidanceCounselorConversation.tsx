"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AgentConversationInput,
  AgentEmptyState,
  AgentGreeting,
  AgentHeader,
  AgentLoadingState,
  AgentStatus,
  AgentThinkingIndicator,
  AgentStreamingResponseArea,
  RuntimeProposalReview,
  ProfessionalConversationComposer,
  ProfessionalConversationAvatar,
  ProfessionalConversationHistory,
  ProfessionalConversationTimeline,
  ProfessionalExperienceFramework,
  ProfessionalKnowledgeWorkspace,
  ProfessionalMemoryTimeline,
  ProfessionalSupportingWorkspaces,
  ProfessionalTimeAwareness,
  formatProfessionalMessageTime,
  guidanceCounselorConversationIdentity,
  type AgentConversationMessage,
  type ProfessionalKnowledgeItem,
  type ProfessionalKnowledgeModel,
} from "@/app/components/agents";
import {
  buildGuidanceCounselorSessionAwareness,
  buildGuidanceCounselorUnderstanding,
  type GuidanceCounselorConversationContext,
  type GuidanceUnderstandingItem,
  buildCanonicalEducationUnderstanding,
  type EducationCanonicalRecord,
} from "@/lib/education";
import type { GuidanceDiscoveryProfile } from "@/lib/education/discoveryConversation";
import {
  buildGuidanceProactiveOpportunities,
  type GuidanceWorkflowRecommendation,
} from "@/lib/education/guidanceWorkflow";
import {
  ServerAgentConversationRepository,
  SupabaseAgentConversationStore,
  SupabaseExecutionHistoryStore,
  SupabaseAgentMemoryStore,
  type AgentMemoryRecord,
  type AgentConversationThread,
  type ExecutionAuditEvent,
  type ProfessionalExecutionHistory,
  type RecommendationLifecycleStatus,
} from "@/lib/platform/agents";
import { createClient } from "@/lib/supabase/client";
import { digitalStaffActivityLabels, requestDigitalStaffResponse } from "@/lib/digitalStaffRuntime/client";
import type { DigitalStaffActivity, StructuredKnowledgeProposal } from "@/lib/digitalStaffRuntime";

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
  activity?: DigitalStaffActivity;
  failed?: boolean;
  proposals?: readonly StructuredKnowledgeProposal[];
  timestamp?: string;
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

function describeGuidanceMemory(memory: AgentMemoryRecord) {
  if (
    memory.value &&
    typeof memory.value === "object" &&
    !Array.isArray(memory.value)
  ) {
    const value = memory.value as Record<string, unknown>;
    for (const candidate of [
      value.content,
      value.summary,
      value.goal,
      value.careerDirection,
    ]) {
      if (typeof candidate === "string" && candidate.trim()) {
        return candidate.trim();
      }
    }
  }
  return typeof memory.value === "string"
    ? memory.value
    : "Persisted Guidance Counselor context is available.";
}

export default function GuidanceCounselorConversation({
  memberId,
  memberName,
  context,
  initialProfile,
  recommendation,
}: GuidanceCounselorConversationProps) {
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
  const discoveryProfile = initialProfile;
  const [canonicalProfileItems, setCanonicalProfileItems] = useState<EducationCanonicalRecord[]>([]);
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
  const retryTurnRef = useRef<(question: string, turnId: string) => void>(() => undefined);
  retryTurnRef.current = (question, turnId) => { void sendMessage(question, turnId); };

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
      const canonicalResult = await client
        .from("education_career_profile_items")
        .select("id, category, label, value, verification_status")
        .eq("owner_id", memberId)
        .is("archived_at", null);
      if (!canonicalResult.error && !cancelled) {
        setCanonicalProfileItems((canonicalResult.data || []) as EducationCanonicalRecord[]);
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
      const runtime = counselor.content && typeof counselor.content === "object" && !Array.isArray(counselor.content) ? (counselor.content as { runtime?: { proposals?: StructuredKnowledgeProposal[] } }).runtime : undefined;
      restored.push({
        id: member.id.replace(/-user$/, ""),
        question: String(member.content),
        response: content,
        proposals: runtime?.proposals,
        timestamp: counselor.timestamp || member.timestamp,
      });
    }
    setTurns(restored);
  }

  const refreshThreads = useCallback(async (search = historySearch) => {
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
  }, [historySearch, memberId, repository]);

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

  async function sendMessage(question: string, existingTurnId = "") {
    const cleanQuestion = question.trim();
    if (!cleanQuestion) return;
    setKnowledgePrompt(null);
    const turnId = existingTurnId || `guidance-${Date.now()}`;
    const messageTimestamp = new Date().toISOString();
    setStreamingTurnId(turnId);
    setInput("");
    const optimisticTurn: GuidanceTurn = { id: turnId, question: cleanQuestion, response: "", activity: "accepted", timestamp: messageTimestamp };
    setTurns((current) => existingTurnId ? current.map((turn) => turn.id === turnId ? optimisticTurn : turn) : [...current, optimisticTurn]);
    let conversationId = activeThreadId;
    if (!conversationId) conversationId = (await startConversation())?.id || "";
    if (conversationId && conversationId !== activeThreadId) setActiveThreadId(conversationId);
    try {
      const payload = await requestDigitalStaffResponse({ professionalId, conversationId, message: cleanQuestion, workspace: "/dashboard/education/guidance-counselor" }, {
        onAcknowledged: () => setTurns((current) => current.map((turn) => turn.id === turnId ? { ...turn, activity: "thinking" } : turn)),
        onActivity: (activity) => setTurns((current) => current.map((turn) => turn.id === turnId ? { ...turn, activity } : turn)),
        onResponseDelta: (delta) => setTurns((current) => current.map((turn) => turn.id === turnId ? { ...turn, response: `${turn.response}${delta}` } : turn)),
      });
      setTurns((current) => current.map((turn) => turn.id === turnId ? { id: turnId, question: cleanQuestion, response: payload.result.response, proposals: payload.result.proposals, timestamp: messageTimestamp } : turn));
      await refreshThreads();
      setHistoryError("");
    } catch (error) {
      setTurns((current) => current.map((turn) => turn.id === turnId ? { ...turn, failed: true, activity: undefined } : turn));
      setHistoryError(error instanceof Error ? error.message : "Guidance Counselor could not respond safely.");
    } finally {
      setStreamingTurnId("");
    }
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
    return thread;
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
          timestamp: formatProfessionalMessageTime(turn.timestamp),
        },
        {
          id: `${turn.id}-counselor`,
          role: "agent",
          author: "Guidance Counselor",
          streaming: streamingTurnId === turn.id,
          timestamp: formatProfessionalMessageTime(turn.timestamp),
          content: (
            <AgentStreamingResponseArea
              isStreaming={streamingTurnId === turn.id}
              label="Guidance Counselor response"
            >
              {turn.failed ? <div><p>The Guidance Counselor service is temporarily unavailable. Your message is still here.</p><button className="beast-button mt-3" type="button" onClick={() => retryTurnRef.current(turn.question, turn.id)}>Try again</button></div> : turn.response ? <p>{turn.response}</p> : <AgentThinkingIndicator label={digitalStaffActivityLabels[turn.activity || "accepted"]} />}
              {turn.proposals?.length && activeThreadId ? <RuntimeProposalReview professionalId={professionalId} conversationId={activeThreadId} proposals={turn.proposals} onDecision={() => void refreshThreads()} /> : null}
            </AgentStreamingResponseArea>
          ),
        },
      ]),
    ],
    [knowledgePrompt, sessionAwareness.opening, streamingTurnId, turns, activeThreadId, refreshThreads]
  );

  const understanding = buildGuidanceCounselorUnderstanding(discoveryProfile);
  const canonicalUnderstanding = buildCanonicalEducationUnderstanding(canonicalProfileItems);
  const canonicalAreas = new Set(canonicalUnderstanding.known.map((item) => item.area));
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
            ? "Confirm, reject, or correct"
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
    known: [
      ...understanding.whatIKnow.filter((item) => !canonicalAreas.has(item.area)),
      ...canonicalUnderstanding.known,
    ].map(guidanceKnowledgeItem),
    thinking: understanding.whatIThink.map(guidanceKnowledgeItem),
    needed: [...understanding.whatIStillNeed.filter((item) => !canonicalAreas.has(item.area)), ...canonicalUnderstanding.needed]
      .slice()
      .sort((left, right) => left.priority - right.priority)
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
  const historyPanel = (
    <ProfessionalConversationHistory
      professionalName="Guidance Counselor"
      threads={threads}
      activeThreadId={activeThreadId}
      searchValue={historySearch}
      loading={historyLoading}
      error={historyError}
      onSearchChange={(value) => {
        setHistorySearch(value);
        void refreshThreads(value);
      }}
      onNewConversation={() => void startConversation()}
      onOpen={(item) => {
        const thread = threads.find((candidate) => candidate.id === item.id);
        if (thread) openThread(thread);
      }}
      onRename={(item) => {
        const thread = threads.find((candidate) => candidate.id === item.id);
        if (thread) void renameThread(thread);
      }}
      onPin={(item) => {
        const thread = threads.find((candidate) => candidate.id === item.id);
        if (thread) {
          void repository
            ?.pin(memberId, thread.id, !thread.pinned)
            .then(() => refreshThreads());
        }
      }}
      onArchive={(item) => {
        const thread = threads.find((candidate) => candidate.id === item.id);
        if (thread) void archiveThread(thread);
      }}
      onDelete={(item) => {
        const thread = threads.find((candidate) => candidate.id === item.id);
        if (thread) void deleteThread(thread);
      }}
      onClose={() => setHistoryOpen(false)}
    />
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
  const proactiveOpportunities = buildGuidanceProactiveOpportunities(
    discoveryProfile
  );
  const supportPanels = (
    <div className="grid gap-5">
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
              data-analytics-event="recommendation_accepted"
              data-analytics-status="accepted"
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
              data-analytics-event="recommendation_deferred"
              data-analytics-status="deferred"
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
              data-analytics-event="recommendation_dismissed"
              data-analytics-status="dismissed"
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

      {proactiveOpportunities.length ? (
        <section
          className="rounded-2xl border border-indigo-300/20 bg-indigo-300/[0.05] p-4 sm:p-5"
          aria-labelledby="guidance-opportunities"
        >
          <h2 id="guidance-opportunities" className="text-lg font-black text-white">
            Ideas we can explore
          </h2>
          <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-300">
            These are ideas to consider, not promises or decisions. Your
            counselor explains why each one may fit what you have shared.
          </p>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {proactiveOpportunities.map((opportunity) => (
              <article
                key={opportunity.id}
                className="rounded-xl border border-white/10 bg-black/15 p-4"
              >
                <h3 className="font-black text-white">{opportunity.title}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-300">
                  <span className="font-bold text-indigo-100">Why:</span>{" "}
                  {opportunity.why}
                </p>
                <Link
                  href={opportunity.href}
                  className="mt-3 inline-flex min-h-11 items-center text-sm font-bold text-indigo-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo-300"
                >
                  Explore with your plan <span aria-hidden="true">→</span>
                </Link>
              </article>
            ))}
          </div>
        </section>
      ) : null}

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
          <h2 className="text-base font-black text-white">What worked for you</h2>
          <p className="mt-1 text-sm leading-6 text-slate-400">
            What you report helps your counselor give better guidance next
            time. You still make every decision.
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
      <ProfessionalExperienceFramework
        professionalId={professionalId}
        history={historyPanel}
        historyOpen={historyOpen}
        onCloseHistory={() => setHistoryOpen(false)}
        historyDialogRef={historyDialogRef}
        professionalName="Guidance Counselor"
        drawerId="guidance-counselor-history-drawer"
        className="max-w-none border-white/10 bg-[#141a24]"
          header={
            <AgentHeader
              title="Guidance Counselor"
              subtitle="Your primary BeastEducation professional"
              avatar={
                <ProfessionalConversationAvatar
                  identity={guidanceCounselorConversationIdentity}
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
                    className="beast-button-secondary min-h-11"
                    aria-expanded={historyOpen}
                    aria-controls="guidance-counselor-history-drawer"
                    onClick={() => setHistoryOpen(true)}
                  >
                    Conversations
                  </button>
                  <button
                    type="button"
                    className="beast-button-secondary min-h-11"
                    onClick={() => void startConversation()}
                  >
                    New conversation
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
                    professionalIdentity={
                      guidanceCounselorConversationIdentity
                    }
                  />
                )}
                <div className="mt-4 grid gap-4 border-t border-white/[0.07] pt-4">
                  <ProfessionalConversationComposer id="guidance-counselor-question">
                    <AgentConversationInput
                      value={input}
                      onChange={setInput}
                      onSubmit={sendMessage}
                      label="Message your Guidance Counselor"
                      placeholder="Tell your counselor what you’re thinking about, or ask what to do next…"
                      busy={Boolean(streamingTurnId)}
                      busyLabel={turns.find((turn) => turn.id === streamingTurnId)?.activity === "accepted" ? "Sending…" : "Working…"}
                    />
                  </ProfessionalConversationComposer>
                  {starterExperience}
                </div>
              </section>
            )
          }
          knowledge={
            <div data-guidance-understanding-model="true">
              <ProfessionalKnowledgeWorkspace
                model={guidanceKnowledgeModel}
                onAction={beginKnowledgeConversation}
                className="rounded-2xl border border-white/10 bg-black/10 p-4"
              />
            </div>
          }
          timeAwareness={
            <ProfessionalTimeAwareness
              title={
                previousReviewAt
                  ? "Welcome back"
                  : "Let’s get started"
              }
              description="Your saved conversations help your counselor remember where you left off."
              items={[
                {
                  id: "guidance-review-timing",
                  label: previousReviewAt
                    ? "Previous conversation"
                    : "Conversation status",
                  value: previousReviewAt
                    ? new Date(previousReviewAt).toLocaleString()
                    : "No earlier conversation was found",
                  evidence: previousConversationSummary
                    ? "A persisted conversation summary is available for continuity."
                    : "No prior summary is available.",
                },
                {
                  id: "guidance-profile-updates",
                  label: "Current profile state",
                  value: "No new verified update this turn",
                  evidence:
                    "Only information extracted from the member’s conversation is persisted.",
                },
              ]}
              unavailableMessage="Conversation timing becomes available after the first saved Guidance Counselor conversation."
            />
          }
          memory={
            <ProfessionalMemoryTimeline
              professionalName="Guidance Counselor"
              items={relationshipMemories.slice(0, 6).map((memory) => ({
                id: memory.id,
                title: memory.key.replaceAll("-", " "),
                summary: describeGuidanceMemory(memory),
                occurredAt: new Date(memory.updatedAt).toLocaleString(),
                source: memory.evidence?.[0]?.source
                  ? "Saved conversation evidence"
                  : "Guidance Counselor memory",
              }))}
              emptyState="No durable Guidance Counselor memory has been saved yet. The counselor will not invent prior context."
            />
          }
          recommendations={supportPanels}
          supportingWorkspaces={
            <ProfessionalSupportingWorkspaces
              professionalName="Guidance Counselor"
              workspaces={[
                {
                  id: "education-roadmap",
                  label: "Education Planning",
                  description: "Review milestones and planning sequence.",
                  href: "/dashboard/education/education-planning",
                },
                {
                  id: "education-career",
                  label: "Career Planning",
                  description: "Explore career direction and tradeoffs.",
                  href: "/dashboard/education/career-planning",
                },
                {
                  id: "education-goals",
                  label: "Education Goals",
                  description: "Review shared BeastOS goals in Education context.",
                  href: "/dashboard/education/goals",
                },
                {
                  id: "education-documents",
                  label: "Education Documents",
                  description: "Review shared BeastOS documents in Education context.",
                  href: "/dashboard/education/documents",
                },
                {
                  id: "education-schools",
                  label: "Schools",
                  description: "Review where relevant education is available.",
                  href: "/dashboard/education/schools",
                },
                {
                  id: "education-scholarships",
                  label: "Scholarships",
                  description: "Review education funding opportunities.",
                  href: "/dashboard/education/scholarships",
                },
                {
                  id: "education-certifications",
                  label: "Certifications",
                  description: "Review certification pathways and requirements.",
                  href: "/dashboard/education/certifications",
                },
              ]}
            />
          }
        />
    </div>
  );
}
