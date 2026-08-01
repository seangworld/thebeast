"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  AgentConversationInput,
  AgentEmptyState,
  AgentErrorState,
  AgentGreeting,
  AgentHeader,
  AgentLoadingState,
  AgentStatus,
  AgentStreamingResponseArea,
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
  moneyCoachConversationIdentity,
  type AgentConversationMessage,
  type ProfessionalKnowledgeItem,
  type ProfessionalKnowledgeModel,
} from "@/app/components/agents";
import {
  ServerAgentConversationRepository,
  SupabaseAgentConversationStore,
  SupabaseAgentMemoryStore,
  createDefaultConversationStarterEngine,
  type AgentConversationThread,
  type AgentMemoryRecord,
  type AgentMessage,
  SupabaseExecutionHistoryStore,
  type ExecutionAuditEvent,
  type ProfessionalExecutionHistory,
  type RecommendationLifecycleStatus,
} from "@/lib/platform/agents";
import {
  answerMoneyCoachQuestion,
  buildMoneyCoachGreeting,
  type MoneyCoachExperienceModel,
  type MoneyCoachStructuredAnswer,
} from "@/lib/moneyCoachExperience";
import {
  buildMoneyCoachOutcomeLearning,
  buildMoneyCoachRecommendations,
  buildMoneyCoachSessionBriefing,
  moneyCoachProfessionalId,
  type MoneyCoachRecommendation,
  type MoneyCoachSessionBriefing,
} from "@/lib/moneyCoachOnline";

type MoneyCoachExperienceProps = {
  model: MoneyCoachExperienceModel;
  loading: boolean;
  error?: string;
  onRetry: () => void;
};

function formatMoney(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

function describeMemory(memory: AgentMemoryRecord) {
  if (
    memory.value &&
    typeof memory.value === "object" &&
    !Array.isArray(memory.value)
  ) {
    const value = memory.value as Record<string, unknown>;
    for (const candidate of [value.content, value.summary, value.statement]) {
      if (typeof candidate === "string" && candidate.trim()) {
        return candidate.trim();
      }
    }
  }
  return typeof memory.value === "string"
    ? memory.value
    : "Persisted Money Coach context is available.";
}

function persistenceErrorMessage(error: unknown) {
  const detail = typeof error === "object" && error && "message" in error
    ? String(error.message)
    : error instanceof Error
      ? error.message
      : String(error);
  return process.env.NODE_ENV === "development"
    ? `Conversation history could not load: ${detail}`
    : "Conversation history could not load. Please try again.";
}

function MoneyCoachResponseDocument({ response }: { response: MoneyCoachStructuredAnswer }) {
  const actionTarget = response.toolAction?.target || response.href;
  const actionTitle = response.toolAction?.title || response.action;
  return <div data-money-coach-structured-response="true">
    <p>{response.opening}</p>
    {response.sections.map((section) => <section key={section.heading} className="mt-5" aria-label={section.heading}>
      <h4 className="text-sm font-black text-white">{section.heading}</h4>
      {section.paragraphs?.map((paragraph) => <p key={paragraph} className="mt-2">{paragraph}</p>)}
      {section.bullets?.length ? <ul>{section.bullets.map((item) => <li key={item}>{item}</li>)}</ul> : null}
      {section.numberedItems?.length ? <ol>{section.numberedItems.map((item) => <li key={item}>{item}</li>)}</ol> : null}
      {section.table ? <div className="overflow-x-auto"><table><thead><tr>{section.table.columns.map((column) => <th key={column} scope="col">{column}</th>)}</tr></thead><tbody>{section.table.rows.map((row, rowIndex) => <tr key={rowIndex}>{row.map((cell, cellIndex) => <td key={`${cellIndex}-${cell}`}>{cell}</td>)}</tr>)}</tbody></table></div> : null}
    </section>)}
    {response.assumptions?.length ? <details><summary className="cursor-pointer font-bold text-slate-300">Assumptions and limitations</summary><ul>{response.assumptions.map((item) => <li key={item}>{item}</li>)}</ul></details> : null}
    {response.followUp ? <p className="mt-5">{response.followUp}</p> : null}
    <Link className="mt-4 inline-flex font-bold text-cyan-200" href={actionTarget}>{actionTitle} <span aria-hidden="true">→</span></Link>
  </div>;
}

function MoneyCoachSessionOpening({
  briefing,
}: {
  briefing: MoneyCoachSessionBriefing;
}) {
  return (
    <div data-money-coach-session-briefing="true">
      <p>{briefing.summary}</p>
      <p className="mt-2 text-xs font-bold text-slate-400">
        {briefing.visit.firstVisit
          ? "First financial review"
          : `Last review: ${briefing.visit.timeSinceLastReview}`}
      </p>
      {briefing.changes.length ? (
        <div className="mt-4">
          <p className="text-xs font-black uppercase tracking-[0.12em] text-slate-400">
            Since your last review
          </p>
          <ul className="mt-2 space-y-2">
            {briefing.changes.map((change) => (
              <li key={change.id}>
                <span className="font-bold text-white">{change.title}:</span>{" "}
                {change.detail}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      {briefing.upcomingEvents.length ? (
        <div className="mt-4">
          <p className="text-xs font-black uppercase tracking-[0.12em] text-slate-400">
            Coming up
          </p>
          <ul className="mt-2 space-y-2">
            {briefing.upcomingEvents.map((event) => (
              <li key={event.id}>
                <span className="font-bold text-white">{event.title}:</span>{" "}
                {event.detail}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      {briefing.completedMilestones.length ? (
        <div className="mt-4">
          <p className="text-xs font-black uppercase tracking-[0.12em] text-slate-400">
            Completed milestones
          </p>
          <ul className="mt-2 space-y-2">
            {briefing.completedMilestones.map((milestone) => (
              <li key={milestone.id}>
                <span className="font-bold text-white">{milestone.title}:</span>{" "}
                {milestone.detail}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      {briefing.continuity.length ? (
        <div className="mt-4">
          <p className="text-xs font-black uppercase tracking-[0.12em] text-slate-400">
            What I remember
          </p>
          <ul className="mt-2 space-y-2">
            {briefing.continuity.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
      ) : null}
      {briefing.historicalRecommendations.length ||
      briefing.completedOutcomes.length ? (
        <details className="mt-4 rounded-xl border border-white/10 bg-white/[0.025] p-3">
          <summary className="cursor-pointer text-xs font-black uppercase tracking-[0.12em] text-slate-400">
            Previous recommendations and outcomes
          </summary>
          <ul className="mt-3 space-y-2">
            {briefing.historicalRecommendations.map((recommendation) => (
              <li key={recommendation.id}>
                <span className="font-bold text-white">
                  {recommendation.title}:
                </span>{" "}
                {recommendation.status}
              </li>
            ))}
            {briefing.completedOutcomes.map((outcome) => (
              <li key={outcome.id}>
                <span className="font-bold text-white">{outcome.title}:</span>{" "}
                {outcome.detail}
              </li>
            ))}
          </ul>
        </details>
      ) : null}
      <div className="mt-4 rounded-xl border border-white/10 bg-white/[0.035] p-3">
        <p className="text-xs font-black uppercase tracking-[0.12em] text-slate-400">
          Recommended focus
        </p>
        <p className="mt-2 font-bold text-white">
          {briefing.recommendedFocus.title}
        </p>
        <p className="mt-1">{briefing.recommendedFocus.detail}</p>
        <Link
          className="mt-2 inline-flex font-bold text-cyan-200"
          href={briefing.recommendedFocus.href}
        >
          Review details <span aria-hidden="true">→</span>
        </Link>
      </div>
      <details className="mt-4">
        <summary className="cursor-pointer text-xs font-bold text-slate-400">
          Sources reviewed
        </summary>
        <p className="mt-2 text-xs leading-5 text-slate-500">
          {briefing.sources.join(" · ")}
        </p>
      </details>
    </div>
  );
}

export function MoneyCoachExperience({
  model,
  loading,
  error,
  onRetry,
}: MoneyCoachExperienceProps) {
  const searchParams = useSearchParams();
  const [turns, setTurns] = useState<
    {
      id: string;
      question: string;
      response: MoneyCoachStructuredAnswer;
      timestamp?: string;
    }[]
  >([]);
  const [input, setInput] = useState("");
  const [conversationTitle, setConversationTitle] = useState("Current financial review");
  const [localNow, setLocalNow] = useState<Date | null>(null);
  const [repository, setRepository] = useState<ServerAgentConversationRepository | null>(null);
  const [memoryStore, setMemoryStore] = useState<SupabaseAgentMemoryStore | null>(null);
  const [threads, setThreads] = useState<AgentConversationThread[]>([]);
  const [activeThreadId, setActiveThreadId] = useState("");
  const [historyOpen, setHistoryOpen] = useState(false);
  const [historySearch, setHistorySearch] = useState("");
  const [memories, setMemories] = useState<AgentMemoryRecord[]>([]);
  const [historyError, setHistoryError] = useState("");
  const [streamingTurnId, setStreamingTurnId] = useState("");
  const [knowledgePrompt, setKnowledgePrompt] = useState<{
    id: string;
    itemId: string;
    label: string;
    text: string;
  } | null>(null);
  const [executionStore, setExecutionStore] = useState<SupabaseExecutionHistoryStore | null>(null);
  const [executionHistory, setExecutionHistory] = useState<ProfessionalExecutionHistory>();
  const [executionHistoryLoading, setExecutionHistoryLoading] = useState(false);
  const [executionHistoryError, setExecutionHistoryError] = useState("");
  const [decisionPending, setDecisionPending] = useState("");
  const [actorType, setActorType] = useState<Extract<ExecutionAuditEvent["actorType"], "member" | "owner">>("member");
  const historyDialogRef = useRef<HTMLDivElement>(null);
  const requestedStarterRef = useRef("");
  const conversationScrollPositionsRef = useRef(new Map<string, number>());
  const ownerId = model.ownerId;

  useEffect(() => setLocalNow(new Date()), []);

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
    if (!ownerId || ownerId === "authenticated-owner") return;
    let cancelled = false;
    async function loadServerHistory() {
      const client = createClient();
      const { data: { user }, error: authError } = await client.auth.getUser();
      if (authError) throw authError;
      if (!user) throw new Error("No authenticated member was available for conversation history.");
      if (user.id !== ownerId) throw new Error(`Conversation owner mismatch for authenticated member ${user.id}.`);
      const nextRepository = new ServerAgentConversationRepository(new SupabaseAgentConversationStore(client));
      const nextMemoryStore = new SupabaseAgentMemoryStore(client);
      const available = await nextRepository.list({ ownerId, agentId: "beastmoney.money-coach", includeArchived: true });
      if (cancelled) return;
      const active = available.find((thread) => !thread.archived) || available[0];
      setRepository(nextRepository); setMemoryStore(nextMemoryStore); setThreads(available);
      if (active) {
        setActiveThreadId(active.id);
        setConversationTitle(active.title);
        restoreThread(active);
      }
      setHistoryError("");

      void nextMemoryStore.query({ ownerId, agentId: "beastmoney.money-coach" })
        .then((records) => { if (!cancelled) setMemories(records); })
        .catch(() => undefined);

      void Promise.allSettled([
        nextRepository.importLegacy({ ownerId, agentId: "beastmoney.money-coach", storage: window.localStorage }),
        nextMemoryStore.importLegacy({ ownerId, agentId: "beastmoney.money-coach", storage: window.localStorage }),
      ]).then(async () => {
        const refreshed = await nextRepository.list({ ownerId, agentId: "beastmoney.money-coach", includeArchived: true });
        if (!cancelled) setThreads(refreshed);
      }).catch(() => undefined);
    }
    void loadServerHistory().catch((cause: unknown) => {
      if (!cancelled) setHistoryError(persistenceErrorMessage(cause));
    });
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ownerId]);

  useEffect(() => {
    if (!ownerId || ownerId === "authenticated-owner") return;
    let cancelled = false;
    async function loadExecutionHistory() {
      setExecutionHistoryLoading(true);
      const client = createClient();
      const { data: profile } = await client
        .from("profiles")
        .select("role")
        .eq("id", ownerId)
        .maybeSingle();
      const store = new SupabaseExecutionHistoryStore(client);
      const history = await store.listProfessionalHistory(
        ownerId,
        moneyCoachProfessionalId
      );
      if (cancelled) return;
      setActorType(
        (profile as { role?: string } | null)?.role === "admin"
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
        "Recommendation history is temporarily unavailable. Current financial guidance is still based on your BeastMoney records."
      );
      setExecutionHistoryLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [ownerId]);

  useEffect(() => {
    const requestedStarter = searchParams.get("starter")?.trim();
    if (!repository || !requestedStarter || requestedStarterRef.current === requestedStarter) return;
    requestedStarterRef.current = requestedStarter;
    void beginStarter(requestedStarter);
  // beginStarter intentionally runs once after the repository resolves.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [repository, searchParams]);

  function restoreThread(thread: AgentConversationThread) {
    const restored: typeof turns = [];
    for (let index = 0; index < thread.messages.length; index += 2) {
      const user = thread.messages[index]; const agent = thread.messages[index + 1];
      if (!user || !agent) continue;
      const content = agent.content as { text: string; href: string; action: string; structured?: MoneyCoachStructuredAnswer };
      const response = content.structured || { intent: "general-finance", opening: content.text, sections: [], text: content.text, href: content.href, action: content.action, professionalExecution: { profileId: model.professional.id, role: model.professional.identity.role, mission: model.professional.identity.mission, expertiseApplied: model.professional.identity.expertise, communicationStyle: model.professional.identity.communicationStyle, professionalBoundaries: model.professional.identity.professionalBoundaries, teachingMethod: model.professional.playbook.teaching.method, investigationOrder: model.professional.playbook.investigation.evidenceOrder, uncertaintyRulesApplied: [], closingRule: model.professional.playbook.closing.style } } satisfies MoneyCoachStructuredAnswer;
      restored.push({
        id: user.id,
        question: String(user.content),
        response,
        timestamp: agent.timestamp || user.timestamp,
      });
    }
    setTurns(restored);
  }

  const sessionBriefing = useMemo(
    () =>
      buildMoneyCoachSessionBriefing({
        model,
        history: executionHistory,
        conversations: threads,
        activeConversationId: activeThreadId,
        now: localNow || new Date(model.morningBriefing.generatedAt),
      }),
    [activeThreadId, executionHistory, localNow, model, threads]
  );

  async function refreshThreads(search = historySearch) {
    if (!repository) return;
    try {
      setThreads(await repository.list({ ownerId, agentId: "beastmoney.money-coach", includeArchived: true, search }));
      setHistoryError("");
    } catch {
      setHistoryError("Saved conversations could not be refreshed. Please try again.");
    }
  }

  const messages = useMemo<AgentConversationMessage[]>(
    () => [
      {
        id: "money-coach-opening",
        role: "agent",
        author: model.professional.identity.role,
        content: <MoneyCoachSessionOpening briefing={sessionBriefing} />,
      },
      ...(knowledgePrompt
        ? [
            {
              id: knowledgePrompt.id,
              role: "agent" as const,
              author: model.professional.identity.role,
              content: knowledgePrompt.text,
            },
          ]
        : []),
      ...turns.flatMap<AgentConversationMessage>((turn) => [
        { id: `${turn.id}-user`, role: "user", author: "You", content: turn.question, timestamp: formatProfessionalMessageTime(turn.timestamp) },
        { id: `${turn.id}-coach`, role: "agent", author: model.professional.identity.role, streaming: streamingTurnId === turn.id, timestamp: formatProfessionalMessageTime(turn.timestamp), content: <AgentStreamingResponseArea isStreaming={streamingTurnId === turn.id} label="Money Coach response"><MoneyCoachResponseDocument response={turn.response} /></AgentStreamingResponseArea> },
      ]),
    ],
    [
      knowledgePrompt,
      model.professional.identity.role,
      sessionBriefing,
      streamingTurnId,
      turns,
    ]
  );

  async function askQuestion(value: string, targetThreadId = activeThreadId, replaceConversation = false) {
    const activeThread = repository && targetThreadId ? await repository.get(ownerId, targetThreadId).catch(() => undefined) : undefined;
    const response = answerMoneyCoachQuestion(value, model, {
      recentMessages: activeThread?.messages.slice(-8).map((message) => typeof message.content === "string" ? message.content : JSON.stringify(message.content)),
      summary: activeThread?.summary?.overview,
      priorSummaries: threads.filter((thread) => thread.id !== targetThreadId).slice(0, 3).map((thread) => thread.summary?.overview).filter((summary): summary is string => Boolean(summary)),
      memories: memories.map((memory) => ({ key: memory.key, value: memory.value })),
      executionHistory,
      lastReviewAt: sessionBriefing.visit.lastReviewAt,
    });
    const timestamp = Date.now();
    const now = new Date(timestamp).toISOString();
    const turn = { id: `money-${timestamp}`, question: value, response, timestamp: now };
    setStreamingTurnId(turn.id);
    setTurns((current) => replaceConversation ? [turn] : [...current, turn]);
    if (repository && targetThreadId) {
      const messages: AgentMessage[] = [
        { id: `${turn.id}-user`, threadId: targetThreadId, sender: { kind: "user", id: ownerId }, recipient: { kind: "agent", id: "beastmoney.money-coach" }, content: value, timestamp: now },
        { id: `${turn.id}-coach`, threadId: targetThreadId, sender: { kind: "agent", id: "beastmoney.money-coach" }, recipient: { kind: "module", id: "beastmoney" }, content: { text: response.text, href: response.href, action: response.action, structured: response }, timestamp: now },
      ];
      void repository.append(ownerId, targetThreadId, messages, { insightIds: model.insights.map((item) => item.id), actionIds: [response.toolAction?.toolId || response.action] }).then(async (updated) => {
        await repository.summarize(ownerId, targetThreadId, { overview: `Discussed ${value.slice(0, 100)}`, decisions: [], unresolvedFollowUps: [], updatedAt: now });
        setConversationTitle(updated.title); await refreshThreads();
      }).catch(() => setHistoryError("This response is visible now but could not be saved. Please retry before leaving this page.")).finally(() => {
        setStreamingTurnId("");
      });
      const durableType = /\b(i prefer|my goal|i decided|remember that|always|never)\b/i.exec(value)?.[1];
      if (memoryStore && durableType) {
        const memoryType = durableType === "my goal" ? "financial-goal" : durableType === "i decided" ? "confirmed-decision" : "preference-or-constraint";
        const memory: AgentMemoryRecord = { id: `money-memory-${timestamp}`, agentId: "beastmoney.money-coach", ownerId, scope: "user", key: memoryType, value: { content: value, memoryType, confidence: "high", sourceConversationId: targetThreadId, sourceMessageId: messages[0].id, timestamp: now }, purpose: "Remember an explicit member preference, goal, decision, or recurring constraint.", evidence: [{ source: targetThreadId, capturedAt: now, description: messages[0].id }], createdAt: now, updatedAt: now };
        void memoryStore.put(memory).then(() => setMemories((current) => [...current, memory]));
      }
    } else {
      setStreamingTurnId("");
    }
  }

  async function startConversation() {
    conversationScrollPositionsRef.current.delete("new-conversation");
    setActiveThreadId("");
    setConversationTitle("New conversation");
    setTurns([]);
    setKnowledgePrompt(null);
    if (!repository) {
      return undefined;
    }
    try {
      const thread = await repository.create({
        ownerId,
        agentId: "beastmoney.money-coach",
      });
      setActiveThreadId(thread.id);
      setConversationTitle(thread.title);
      await refreshThreads();
      setHistoryError("");
      return thread;
    } catch {
      setHistoryError(
        "A new conversation could not be created. Your previous conversations and durable memories were not changed."
      );
      return undefined;
    }
  }

  async function beginStarter(prompt: string) {
    const thread = await startConversation();
    await askQuestion(prompt, thread?.id || "", true);
  }

  function focusComposer() {
    document
      .getElementById("money-coach-question")
      ?.querySelector("textarea")
      ?.focus({ preventScroll: true });
  }

  async function sendMessage(question: string) {
    const cleanQuestion = question.trim();
    if (!cleanQuestion || streamingTurnId) return;
    const pendingKnowledgePrompt = knowledgePrompt;
    setInput("");
    let targetThreadId = activeThreadId;
    if (!targetThreadId) {
      const thread = await startConversation();
      targetThreadId = thread?.id || "";
    }
    await askQuestion(cleanQuestion, targetThreadId);
    if (pendingKnowledgePrompt && memoryStore && targetThreadId) {
      const now = new Date().toISOString();
      const memory: AgentMemoryRecord = {
        id: `money-knowledge-memory-${Date.now()}`,
        agentId: "beastmoney.money-coach",
        ownerId,
        scope: "user",
        key: `professional-knowledge:${pendingKnowledgePrompt.itemId}`,
        value: {
          content: cleanQuestion,
          label: pendingKnowledgePrompt.label,
          memoryType: "member-confirmed-professional-knowledge",
          confidence: "high",
          sourceConversationId: targetThreadId,
          timestamp: now,
        },
        purpose:
          "Remember member-confirmed context gathered through the professional knowledge workspace.",
        evidence: [
          {
            source: targetThreadId,
            capturedAt: now,
            description: pendingKnowledgePrompt.text,
          },
        ],
        createdAt: now,
        updatedAt: now,
      };
      try {
        await memoryStore.put(memory);
        setMemories((current) => [
          ...current.filter((item) => item.key !== memory.key),
          memory,
        ]);
      } catch {
        setHistoryError(
          "The conversation was saved, but this new planning context could not be added to durable Money Coach memory."
        );
      }
    }
    setKnowledgePrompt(null);
    window.requestAnimationFrame(focusComposer);
  }

  function openThread(thread: AgentConversationThread) { setActiveThreadId(thread.id); setConversationTitle(thread.title); restoreThread(thread); setHistoryOpen(false); }

  async function renameThread(thread: AgentConversationThread) {
    const title = window.prompt("Rename conversation", thread.title);
    if (!title || !repository) return;
    await repository.rename(ownerId, thread.id, title);
    await refreshThreads();
    if (thread.id === activeThreadId) setConversationTitle(title);
  }

  async function archiveThread(thread: AgentConversationThread) {
    await repository?.archive(ownerId, thread.id, !thread.archived);
    await refreshThreads();
  }

  async function deleteThread(thread: AgentConversationThread) {
    if (!repository || !window.confirm("Delete this conversation? Durable memories extracted from it are retained until you remove them below.")) return;
    const deleteLinkedMemories = window.confirm("Also delete durable memories linked to this conversation? Select Cancel to retain them with their source conversation removed.");
    await repository.delete(ownerId, thread.id, true, deleteLinkedMemories ? "delete-linked" : "retain");
    if (thread.id === activeThreadId) await startConversation();
    else await refreshThreads();
  }

  const localGreeting = localNow
    ? buildMoneyCoachGreeting(model.userFirstName, localNow)
    : model.userFirstName;
  const personalizedStarters = useMemo(
    () => createDefaultConversationStarterEngine().generate({
      ownerId,
      specialistId: "beastmoney.money-coach",
      asOf: (localNow || new Date(0)).toISOString(),
      observations: model.observations,
      conversationHistory: threads,
      limit: 24,
    }).map((starter) => ({
      id: starter.id,
      label: starter.title,
      title: starter.title,
      prompt: starter.prompt,
      href: starter.action?.target,
      intent: undefined,
      category: starter.kind,
      group: starter.group,
    })),
    [localNow, model.observations, ownerId, threads]
  );
  const workspaceSuggestions = useMemo(() => {
    const suggestions = [...model.suggestions, ...personalizedStarters];
    return suggestions.filter((suggestion, index) =>
      suggestion.intent !== "ask" &&
      Boolean(suggestion.prompt) &&
      suggestions.findIndex((candidate) => candidate.prompt === suggestion.prompt) === index
    );
  }, [model.suggestions, personalizedStarters]);
  const moneyKnowledgeModel = useMemo<ProfessionalKnowledgeModel>(() => {
    const context = model.financialContext;
    const known: ProfessionalKnowledgeItem[] = [];
    const needed: ProfessionalKnowledgeItem[] = [];
    const learnedKnowledge = new Map(
      memories
        .filter((memory) => memory.key.startsWith("professional-knowledge:"))
        .map((memory) => [
          memory.key.replace("professional-knowledge:", ""),
          memory,
        ])
    );

    if (context.monthlyIncome > 0 || context.upcomingIncome.length) {
      known.push({
        id: "money-income",
        label: "Income",
        summary: `${formatMoney(context.monthlyIncome)} in tracked monthly income.`,
        confidence: "high",
        action: {
          label: "Review income",
          mode: "detail",
          href: "/dashboard/money/income",
        },
      });
    } else {
      needed.push({
        id: "money-income-needed",
        label: "Income",
        summary: "Current income information would improve cash-flow guidance.",
        confidence: "unknown",
        action: {
          label: "Talk about income",
          mode: "conversation",
          prompt: "Tell me about the income you want me to consider in your financial planning.",
        },
      });
    }

    if (context.debts.length) {
      known.push({
        id: "money-debts",
        label: "Debts",
        summary: `${context.debts.length} active debt record${context.debts.length === 1 ? "" : "s"} totaling ${formatMoney(context.totalDebt)}.`,
        confidence: "high",
        action: {
          label: "Review debts",
          mode: "detail",
          href: "/dashboard/money/debts",
        },
      });
    } else {
      needed.push({
        id: "money-debts-needed",
        label: "Debt status",
        summary: "I still need to know whether you are debt-free or have debts that are not tracked yet.",
        confidence: "unknown",
        action: {
          label: "Talk about debt",
          mode: "conversation",
          prompt: "Are you currently debt-free, or are there debts you would like us to add or discuss?",
        },
      });
    }

    if (context.totalObligationCount > 0) {
      known.push({
        id: "money-bills",
        label: "Bills and obligations",
        summary: `${context.totalObligationCount} recurring obligation${context.totalObligationCount === 1 ? "" : "s"} are included in the current plan.`,
        confidence: "high",
        action: {
          label: "Review bills",
          mode: "detail",
          href: "/dashboard/money/bills",
        },
      });
    } else {
      needed.push({
        id: "money-bills-needed",
        label: "Recurring bills",
        summary: "Recurring obligations would make cash-flow and timing guidance more complete.",
        confidence: "unknown",
        action: {
          label: "Talk about bills",
          mode: "conversation",
          prompt: "Which recurring bills or obligations should I understand first?",
        },
      });
    }

    if (context.retirementDataAvailable) {
      known.push({
        id: "money-retirement",
        label: "Retirement",
        summary: "Retirement planning information is available for this review.",
        confidence: "high",
        action: {
          label: "Review retirement",
          mode: "detail",
          href: "/dashboard/money/retirement",
        },
      });
    } else {
      needed.push({
        id: "money-retirement-needed",
        label: "Retirement direction",
        summary: "A retirement goal and time horizon would improve long-term guidance.",
        confidence: "unknown",
        action: {
          label: "Talk about retirement",
          mode: "conversation",
          prompt: "What would you like retirement to look like, and when do you hope to reach it?",
        },
      });
    }

    if (context.currentGoals.length) {
      known.push({
        id: "money-goals",
        label: "Financial goals",
        summary: `${context.currentGoals.length} current goal${context.currentGoals.length === 1 ? "" : "s"} can inform Money Coach guidance.`,
        confidence: "high",
        action: {
          label: "Review goals",
          mode: "detail",
          href: "/dashboard/goals",
        },
      });
    } else {
      needed.push({
        id: "money-goals-needed",
        label: "Financial priorities",
        summary: "A clear financial priority would help rank future recommendations.",
        confidence: "unknown",
        action: {
          label: "Talk about priorities",
          mode: "conversation",
          prompt: "What financial change would make the biggest difference in your life right now?",
        },
      });
    }

    const thinking: ProfessionalKnowledgeItem[] = [];
    if (context.financialHealth) {
      const health = context.financialHealth;
      thinking.push({
        id: "money-health-score",
        label: "Financial health",
        summary: `The current evidence-based score is ${health.score}, in the ${health.band} range.`,
        confidence: health.availableWeight >= 80 ? "high" : health.availableWeight >= 50 ? "medium" : "low",
        why: health.formula,
        evidence: health.components
          .filter((component) => component.available)
          .slice(0, 4)
          .flatMap((component) => component.evidence.slice(0, 1)),
        action: {
          label: "Review score",
          mode: "detail",
          href: "/dashboard/money/financial-health",
        },
      });
    }
    thinking.push({
      id: "money-current-priority",
      label: model.primaryRecommendation.title,
      summary: model.primaryRecommendation.action,
      confidence: model.insights.length ? "medium" : "low",
      why: model.primaryRecommendation.explainWhy,
      evidence: model.insights.slice(0, 3).map((insight) => insight.summary),
      action: {
        label: "Review recommendation",
        mode: "detail",
        href: model.primaryRecommendation.href,
      },
    });

    learnedKnowledge.forEach((memory, itemId) => {
      const value =
        typeof memory.value === "object" && memory.value
          ? (memory.value as Record<string, unknown>)
          : {};
      const content = value.content;
      const label = value.label;
      known.push({
        id: `money-known-${itemId}`,
        label:
          typeof label === "string" ? label : "Financial planning context",
        summary:
          typeof content === "string"
            ? content
            : "Conversation context is saved in Money Coach memory.",
        confidence: "high",
        action: {
          label: "Review in conversation",
          mode: "conversation",
          prompt: `Let’s review what I previously shared about ${
            typeof label === "string"
              ? label.toLowerCase()
              : "this financial context"
          }.`,
        },
      });
    });

    return {
      professionalId: moneyCoachProfessionalId,
      professionalName: "Money Coach",
      known,
      thinking,
      needed: needed
        .filter((item) => !learnedKnowledge.has(item.id))
        .slice(0, 4),
    };
  }, [memories, model]);
  const recommendations = useMemo(
    () => buildMoneyCoachRecommendations(model, executionHistory),
    [executionHistory, model]
  );
  const outcomeLearning = useMemo(
    () => buildMoneyCoachOutcomeLearning(executionHistory),
    [executionHistory]
  );

  function beginKnowledgeConversation(item: ProfessionalKnowledgeItem) {
    if (item.action.mode !== "conversation") return;
    setKnowledgePrompt({
      id: `money-knowledge-${item.id}`,
      itemId: item.id,
      label: item.label,
      text: item.action.prompt,
    });
    window.requestAnimationFrame(focusComposer);
  }

  async function refreshExecutionHistory() {
    if (!executionStore) return;
    setExecutionHistory(
      await executionStore.listProfessionalHistory(
        ownerId,
        moneyCoachProfessionalId
      )
    );
  }

  async function decideRecommendation(
    recommendation: MoneyCoachRecommendation,
    nextStatus: Extract<
      RecommendationLifecycleStatus,
      "accepted" | "declined" | "deferred"
    >
  ) {
    if (!executionStore) {
      setExecutionHistoryError(
        "Recommendation decisions cannot be saved until execution history is available."
      );
      return;
    }
    setDecisionPending(recommendation.sourceInsightId);
    setExecutionHistoryError("");
    try {
      let lifecycle = recommendation.lifecycle;
      let requestStatus = lifecycle
        ? executionHistory?.requests.find(
            (request) => request.id === lifecycle?.requestId
          )?.status
        : undefined;
      if (!lifecycle) {
        const requestId = await executionStore.create({
          professionalId: moneyCoachProfessionalId,
          requestType: "financial_recommendation_review",
          title: recommendation.title,
          actionClassification: "recommendation_only",
          contextReferences: [
            {
              source: "beastmoney",
              sourceInsightId: recommendation.sourceInsightId,
            },
          ],
          limitations: recommendation.limitations,
        });
        await executionStore.transition(
          requestId,
          "analyzing",
          actorType,
          { source: "money_coach_recommendation" },
          recommendation.supportingEvidence
        );
        requestStatus = "analyzing";
        lifecycle = await executionStore.createRecommendation({
          ownerId,
          requestId,
          professionalId: moneyCoachProfessionalId,
          title: recommendation.title,
          recommendation: recommendation.recommendation,
          confidence: recommendation.confidence,
          limitations: recommendation.limitations,
          supportingEvidence: [
            {
              source: "beastmoney",
              sourceInsightId: recommendation.sourceInsightId,
            },
            ...recommendation.supportingEvidence,
          ],
        });
      }
      if (lifecycle.status !== nextStatus) {
        await executionStore.transitionRecommendation({
          recommendationId: lifecycle.id,
          status: nextStatus,
          reason: `Member selected ${nextStatus} in Money Coach.`,
          confidence: recommendation.confidence,
          limitations: recommendation.limitations,
          supportingEvidence: [
            {
              source: "beastmoney",
              sourceInsightId: recommendation.sourceInsightId,
            },
            ...recommendation.supportingEvidence,
          ],
        });
      }
      await executionStore.recordDecision({
        ownerId,
        requestId: lifecycle.requestId,
        decisionScope: actorType === "owner" ? "owner" : "member",
        decision:
          nextStatus === "accepted"
            ? "approved"
            : nextStatus,
        reason: `Money Coach recommendation ${nextStatus}.`,
        limitationsAcknowledged: recommendation.limitations,
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
        "The recommendation decision could not be saved. No financial action was taken."
      );
    } finally {
      setDecisionPending("");
    }
  }

  async function recordOutcome(
    recommendation: MoneyCoachRecommendation,
    outcomeStatus: "successful" | "neutral" | "unsuccessful"
  ) {
    if (!executionStore || !recommendation.lifecycle) return;
    setDecisionPending(recommendation.sourceInsightId);
    setExecutionHistoryError("");
    const learning =
      outcomeStatus === "successful"
        ? "Member reported that this recommendation helped."
        : outcomeStatus === "neutral"
          ? "Member reported no clear change from this recommendation."
          : "Member reported that this recommendation did not help.";
    try {
      const request = executionHistory?.requests.find(
        (item) => item.id === recommendation.lifecycle?.requestId
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
        ownerId,
        requestId: recommendation.lifecycle.requestId,
        outcomeStatus,
        recommendationTitle: recommendation.title,
        memberLearning: [learning],
        actualResult: {
          source: "member_report",
          status: outcomeStatus,
        },
        limitations: [
          "Outcome is member-reported and was not independently verified.",
        ],
        supportingEvidence: [
          {
            source: "member_report",
            sourceInsightId: recommendation.sourceInsightId,
          },
        ],
      });
      await executionStore.transitionRecommendation({
        recommendationId: recommendation.lifecycle.id,
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
        "The outcome could not be saved. No financial action was taken."
      );
    } finally {
      setDecisionPending("");
    }
  }

  const historyPanel = (
    <ProfessionalConversationHistory
      professionalName="Money Coach"
      threads={threads}
      activeThreadId={activeThreadId}
      searchValue={historySearch}
      loading={!repository}
      error={historyError}
      onSearchChange={(value) => {
        setHistorySearch(value);
        void refreshThreads(value);
      }}
      onNewConversation={() => {
        setHistoryOpen(false);
        void startConversation().then(() =>
          window.requestAnimationFrame(focusComposer)
        );
      }}
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
            ?.pin(ownerId, thread.id, !thread.pinned)
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
      footer={
        <details className="p-3">
          <summary className="cursor-pointer text-xs font-bold text-cyan-200">
            Review durable memories ({memories.length})
          </summary>
          <p className="mt-2 text-xs leading-5 text-slate-400">
            Current BeastMoney records take priority. Deleting a conversation
            does not automatically delete its durable memories.
          </p>
          <div className="mt-2 grid max-h-36 gap-2 overflow-y-auto">
            {memories.map((memory) => {
              const value = memory.value as {
                content?: string;
                memoryType?: string;
                confidence?: string;
              };
              const content = value.content || String(memory.value);
              return (
                <div
                  key={memory.id}
                  className="rounded-lg border border-white/10 p-2 text-xs text-slate-300"
                >
                  <p>{content}</p>
                  <div className="mt-2 flex gap-3">
                    <button
                      type="button"
                      className="font-bold text-cyan-200"
                      onClick={() => {
                        const corrected = window.prompt(
                          "Correct this memory",
                          content
                        );
                        if (corrected && memoryStore) {
                          void memoryStore
                            .correct({
                              agentId: memory.agentId,
                              ownerId,
                              id: memory.id,
                              value: { ...value, content: corrected },
                              updatedAt: new Date().toISOString(),
                            })
                            .then((updated) =>
                              setMemories((items) =>
                                items.map((item) =>
                                  item.id === updated.id ? updated : item
                                )
                              )
                            );
                        }
                      }}
                    >
                      Correct
                    </button>
                    <button
                      type="button"
                      className="font-bold text-red-200"
                      onClick={() => {
                        if (memoryStore) {
                          void memoryStore
                            .delete({
                              agentId: memory.agentId,
                              ownerId,
                              id: memory.id,
                            })
                            .then(() =>
                              setMemories((items) =>
                                items.filter((item) => item.id !== memory.id)
                              )
                            );
                        }
                      }}
                    >
                      Remove
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </details>
      }
    />
  );
  const starterShortcuts = workspaceSuggestions.slice(0, 8);
  const starterExperience = !loading && !error && turns.length === 0 ? (
    <details className="rounded-xl border border-white/10 bg-black/10 p-3" data-money-coach-conversation-shortcuts="true">
      <summary className="cursor-pointer text-sm font-bold text-cyan-200">
        Try a conversation starter
      </summary>
      <p className="mt-2 text-xs leading-5 text-slate-400">
        These are optional shortcuts. You can type your own question at any time.
      </p>
      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        {starterShortcuts.map((suggestion) => (
          <button
            key={suggestion.id}
            type="button"
            className="min-h-11 rounded-lg border border-white/10 bg-white/[0.035] px-3 py-2 text-left text-xs font-semibold leading-5 text-slate-200 transition hover:border-cyan-300/30 hover:bg-cyan-300/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan-300"
            onClick={() => {
              void beginStarter(suggestion.prompt || suggestion.label);
            }}
          >
            {suggestion.label}
          </button>
        ))}
      </div>
    </details>
  ) : null;
  const recommendationCards = (
    <section aria-labelledby="money-coach-recommendations">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 id="money-coach-recommendations" className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">Recommendations</h2>
          <p className="mt-2 text-sm leading-6 text-slate-400">
            Acknowledging advice records your decision in Execution History. It
            does not change a financial record, recalculate a plan, or move
            money.
          </p>
        </div>
        {executionHistoryLoading ? <span className="text-xs text-slate-500" role="status">Loading lifecycle history…</span> : null}
      </div>
      {executionHistoryError ? <p className="mt-3 rounded-xl border border-amber-300/20 bg-amber-300/10 p-3 text-sm leading-6 text-amber-100" role="alert">{executionHistoryError}</p> : null}
      <div className="mt-3 grid gap-3 lg:grid-cols-2">
        {recommendations.map((recommendation) => {
          const lifecycle = recommendation.lifecycle;
          const pending = decisionPending === recommendation.sourceInsightId;
          return (
            <article key={recommendation.sourceInsightId} className="min-w-0 rounded-xl border border-white/10 bg-white/[0.035] p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[10px] font-black uppercase tracking-[0.14em] text-cyan-300">{lifecycle?.status || "proposed"}</p>
                  <h3 className="mt-1 text-base font-black text-white">{recommendation.title}</h3>
                </div>
                <span className="rounded-full border border-white/10 px-3 py-1 text-xs font-bold text-slate-300">{recommendation.confidence.label} confidence · {recommendation.confidence.score}%</span>
              </div>
              <p className="mt-3 text-[10px] font-black uppercase tracking-[0.12em] text-slate-500">
                Why it matters
              </p>
              <p className="mt-1 text-sm leading-6 text-slate-300">{recommendation.whyItMatters}</p>
              <details className="mt-3 rounded-lg border border-white/10 p-3">
                <summary className="cursor-pointer text-xs font-bold text-cyan-200">Why this recommendation exists</summary>
                <p className="mt-3 text-xs leading-5 text-slate-300">{recommendation.whyItExists}</p>
                <p className="mt-3 text-xs leading-5 text-slate-400">{recommendation.confidence.basis}</p>
                {recommendation.supportingEvidence.length ? <ul className="mt-2 list-disc space-y-1 pl-5 text-xs leading-5 text-slate-400">{recommendation.supportingEvidence.map((item) => <li key={`${item.label}-${String(item.value)}`}>{item.label}: {String(item.value)}</li>)}</ul> : null}
                <ul className="mt-2 list-disc space-y-1 pl-5 text-xs leading-5 text-slate-500">{recommendation.limitations.map((item) => <li key={item}>{item}</li>)}</ul>
              </details>
              <p className="mt-3 rounded-lg border border-white/10 bg-black/10 p-3 text-xs leading-5 text-slate-400">
                Choose <strong className="text-slate-200">Accept recommendation</strong> to
                change only its recommendation-history status to accepted. Choose{" "}
                <strong className="text-slate-200">Decide later</strong> to keep it
                open, or <strong className="text-slate-200">Decline</strong> to
                record that decision. No money moves, financial record changes,
                or calculation changes occur.
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <Link className="beast-button-secondary inline-flex min-h-11 items-center" href={recommendation.href}>View details</Link>
                {(!lifecycle || lifecycle.status === "proposed" || lifecycle.status === "deferred") ? <button type="button" data-analytics-event="recommendation_accepted" data-analytics-status="accepted" className="beast-button min-h-11" disabled={pending || !executionStore} onClick={() => { void decideRecommendation(recommendation, "accepted"); }}>Accept recommendation</button> : null}
                {(!lifecycle || lifecycle.status === "proposed") ? <button type="button" data-analytics-event="recommendation_deferred" data-analytics-status="deferred" className="beast-button-secondary min-h-11" disabled={pending || !executionStore} onClick={() => { void decideRecommendation(recommendation, "deferred"); }}>Decide later</button> : null}
                {(!lifecycle || lifecycle.status === "proposed" || lifecycle.status === "deferred") ? <button type="button" data-analytics-event="recommendation_dismissed" data-analytics-status="dismissed" className="beast-button-secondary min-h-11" disabled={pending || !executionStore} onClick={() => { void decideRecommendation(recommendation, "declined"); }}>Decline</button> : null}
              </div>
              {lifecycle?.status === "accepted" ? <div className="mt-4 border-t border-white/10 pt-4">
                <p className="text-xs font-bold text-slate-300">After you try this recommendation, what changed?</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  <button type="button" className="beast-button-secondary min-h-11" disabled={pending} onClick={() => { void recordOutcome(recommendation, "successful"); }}>It helped</button>
                  <button type="button" className="beast-button-secondary min-h-11" disabled={pending} onClick={() => { void recordOutcome(recommendation, "neutral"); }}>No clear change</button>
                  <button type="button" className="beast-button-secondary min-h-11" disabled={pending} onClick={() => { void recordOutcome(recommendation, "unsuccessful"); }}>It did not help</button>
                </div>
              </div> : null}
            </article>
          );
        })}
      </div>
    </section>
  );
  const learningPanel = (
    <section aria-labelledby="money-coach-learning">
      <h2 id="money-coach-learning" className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">What Money Coach learns from your feedback</h2>
      <p className="mt-2 text-sm leading-6 text-slate-400">
        Money Coach uses completed, member-reported outcomes as approved
        context when future recommendations are reviewed. It does not retrain
        itself, infer an outcome, or change your financial records automatically.
      </p>
      <div className="mt-3 grid gap-2">
        {outcomeLearning.length ? outcomeLearning.map((outcome) => (
          <article key={outcome.id} className="rounded-xl border border-white/10 bg-white/[0.035] p-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="font-black text-white">{outcome.recommendationTitle}</h3>
              <span className="text-xs font-bold text-slate-400">{outcome.status} · {new Date(outcome.recordedAt).toLocaleDateString()}</span>
            </div>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-sm leading-6 text-slate-400">{outcome.learning.map((item) => <li key={item}>{item}</li>)}</ul>
          </article>
        )) : <p className="rounded-xl border border-white/10 p-3 text-sm leading-6 text-slate-400">No outcomes have been reported yet. This area updates only after you acknowledge advice and explicitly report what happened.</p>}
      </div>
    </section>
  );

  return (
    <ProfessionalExperienceFramework
      professionalId={moneyCoachProfessionalId}
      history={historyPanel}
      historyOpen={historyOpen}
      onCloseHistory={() => setHistoryOpen(false)}
      historyDialogRef={historyDialogRef}
      professionalName="Money Coach"
      drawerId="money-coach-history-drawer"
      className="max-w-none !gap-4 border-white/10 bg-[#141a24] !p-3 sm:!p-4"
      header={
        <AgentHeader
          title={model.professional.identity.role}
          subtitle={`${model.behavior.communication.tone} guidance · ${model.behavior.communication.verbosity} detail`}
          avatar={
            <ProfessionalConversationAvatar
              identity={moneyCoachConversationIdentity}
              size="md"
            />
          }
          status={<div className="flex items-center gap-2"><AgentStatus state={loading ? "loading" : error ? "error" : streamingTurnId ? "streaming" : "available"} /><button type="button" className="beast-button-secondary min-h-11 lg:hidden" aria-expanded={historyOpen} aria-controls="money-coach-history-drawer" onClick={() => setHistoryOpen(true)}>Conversations</button></div>}
        />
      }
      greeting={
        <AgentGreeting greeting={localGreeting}>
          <p>I&apos;ve reviewed the BeastMoney records currently available. What would you like to work through today?</p>
        </AgentGreeting>
      }
      contextSummary={loading ? (
          <AgentLoadingState label="Money Coach is reviewing current BeastMoney records" lines={2} />
        ) : error ? (
          <AgentErrorState
            title="Money Coach could not review your records"
            message={error}
            retryAction={<button type="button" className="beast-button" onClick={onRetry}>Try Again</button>}
          />
        ) : null}
      conversation={
        loading ? (
          <AgentLoadingState label="Loading Money Coach conversation" />
        ) : error ? (
          <AgentEmptyState title="Conversation unavailable" description="Reload your BeastMoney records to continue with Money Coach." />
        ) : (
          <div className="min-w-0">
            <section className="flex min-h-[34rem] min-w-0 flex-col" aria-label="Active Money Coach conversation">
            <div className="mb-1 flex flex-wrap items-center justify-between gap-2 border-b border-white/[0.07] pb-3">
              <p className="truncate text-sm font-semibold text-slate-400">{conversationTitle}</p>
              <button type="button" className="text-xs font-bold text-cyan-200" onClick={() => { const active = threads.find((thread) => thread.id === activeThreadId); if (active) void renameThread(active); }}>Rename</button>
            </div>
            <ProfessionalConversationTimeline
              messages={messages}
              conversationId={activeThreadId || "new-conversation"}
              streaming={Boolean(streamingTurnId)}
              scrollPositions={conversationScrollPositionsRef}
              professionalName="Money Coach"
              professionalIdentity={moneyCoachConversationIdentity}
            />
            <ProfessionalConversationComposer id="money-coach-question">
              <AgentConversationInput
                value={input}
                onChange={setInput}
                onSubmit={sendMessage}
                label="Message your Money Coach"
                placeholder="Ask about cash flow, debt, savings, retirement, or a financial decision…"
                busy={Boolean(streamingTurnId)}
              />
            </ProfessionalConversationComposer>
            <div className="mt-3">{starterExperience}</div>
            <p className="mt-3 text-xs leading-5 text-slate-500">
              {model.safetyNotice} Money Coach cannot move money or execute a
              financial transaction.
            </p>
            </section>
          </div>
        )
      }
      knowledge={
        <ProfessionalKnowledgeWorkspace
          model={moneyKnowledgeModel}
          onAction={beginKnowledgeConversation}
        />
      }
      timeAwareness={
        <ProfessionalTimeAwareness
          title={
            sessionBriefing.visit.firstVisit
              ? "First financial review"
              : "Returning financial review"
          }
          description="Timing and changes come only from persisted review history and current BeastMoney records."
          items={[
            {
              id: "money-review-timing",
              label: sessionBriefing.visit.firstVisit
                ? "Review status"
                : "Time since last review",
              value: sessionBriefing.visit.firstVisit
                ? "No earlier completed review was found"
                : sessionBriefing.visit.timeSinceLastReview,
              evidence: sessionBriefing.visit.lastReviewAt
                ? `Previous review recorded ${new Date(
                    sessionBriefing.visit.lastReviewAt
                  ).toLocaleString()}.`
                : "No authoritative previous-review timestamp is available.",
            },
            {
              id: "money-verified-updates",
              label: "Verified changes",
              value: `${sessionBriefing.changes.length} meaningful update${
                sessionBriefing.changes.length === 1 ? "" : "s"
              }`,
              evidence:
                sessionBriefing.changes.length > 0
                  ? "Derived from current BeastMoney records compared with the prior review."
                  : "No verified financial change was identified.",
            },
          ]}
          unavailableMessage="Review timing is unavailable until a persisted Money Coach review exists."
        />
      }
      memory={
        <ProfessionalMemoryTimeline
          professionalName="Money Coach"
          items={memories.slice(0, 6).map((memory) => ({
            id: memory.id,
            title: memory.key.replaceAll("-", " "),
            summary: describeMemory(memory),
            occurredAt: new Date(memory.updatedAt).toLocaleString(),
            source: memory.evidence?.[0]?.source
              ? "Saved conversation evidence"
              : "Durable Money Coach memory",
          }))}
          emptyState="No durable Money Coach memory has been saved yet. Current BeastMoney records remain authoritative."
        />
      }
      recommendations={
        <details
          className="rounded-2xl border border-white/10 bg-black/10 p-4"
          open
        >
          <summary className="cursor-pointer text-sm font-black text-cyan-200">
            Review recommendations and reported outcomes
          </summary>
          <div className="mt-5 grid gap-6">
            {recommendationCards}
            {learningPanel}
          </div>
        </details>
      }
      supportingWorkspaces={
        <ProfessionalSupportingWorkspaces
          professionalName="Money Coach"
          workspaces={[
            {
              id: "money-income",
              label: "Income",
              description: "Review persisted income and cash-flow sources.",
              href: "/dashboard/money/income",
            },
            {
              id: "money-bills",
              label: "Bills",
              description: "Manage recurring obligations and due dates.",
              href: "/dashboard/money/bills",
            },
            {
              id: "money-debts",
              label: "Debts",
              description: "Review balances, lenders, and account details.",
              href: "/dashboard/money/debts",
            },
            {
              id: "money-payoff",
              label: "Payoff Plan",
              description: "Review strategies, projections, and timelines.",
              href: "/dashboard/money/payoff-plan",
            },
            {
              id: "money-retirement",
              label: "Retirement",
              description: "Review retirement assumptions and planning.",
              href: "/dashboard/money/retirement",
            },
          ]}
        />
      }
    />
  );
}
