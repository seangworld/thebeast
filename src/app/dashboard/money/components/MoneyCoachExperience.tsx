"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  AgentAvatar,
  AgentEmptyState,
  AgentErrorState,
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
  buildMoneyCoachNotifications,
  buildMoneyCoachOutcomeLearning,
  buildMoneyCoachRecommendations,
  moneyCoachProfessionalId,
  type MoneyCoachRecommendation,
} from "@/lib/moneyCoachOnline";
import { formatCurrency } from "@/lib/formatters";
import { MorningFinancialBriefingPanel } from "./MorningFinancialBriefing";

type MoneyCoachExperienceProps = {
  model: MoneyCoachExperienceModel;
  loading: boolean;
  error?: string;
  onRetry: () => void;
};

function titleCase(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function CompactMetric({
  label,
  value,
  detail,
  href,
  action = "View details",
}: {
  label: string;
  value: string;
  detail: string;
  href: string;
  action?: string;
}) {
  return (
    <article className="min-w-0 rounded-xl border border-white/10 bg-black/15 p-3">
      <p className="text-[10px] font-black uppercase tracking-[0.12em] text-slate-500">{label}</p>
      <div className="mt-1 flex min-w-0 flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <p className="min-w-0 break-words text-lg font-black text-white">{value}</p>
        <Link className="shrink-0 text-[11px] font-bold text-cyan-200" href={href}>{action}</Link>
      </div>
      <p className="mt-1 line-clamp-2 text-xs leading-5 text-slate-400">{detail}</p>
    </article>
  );
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

export function MoneyCoachExperience({
  model,
  loading,
  error,
  onRetry,
}: MoneyCoachExperienceProps) {
  const searchParams = useSearchParams();
  const [turns, setTurns] = useState<{ id: string; question: string; response: MoneyCoachStructuredAnswer }[]>([]);
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
      restored.push({ id: user.id, question: String(user.content), response });
    }
    setTurns(restored);
  }

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
        content: model.conversationOpening,
      },
      ...turns.flatMap<AgentConversationMessage>((turn) => [
        { id: `${turn.id}-user`, role: "user", author: "You", content: turn.question },
        { id: `${turn.id}-coach`, role: "agent", author: model.professional.identity.role, streaming: streamingTurnId === turn.id, content: <AgentStreamingResponseArea isStreaming={streamingTurnId === turn.id} label="Money Coach response"><MoneyCoachResponseDocument response={turn.response} /></AgentStreamingResponseArea> },
      ]),
    ],
    [model.conversationOpening, model.professional.identity.role, streamingTurnId, turns]
  );

  async function askQuestion(value: string, targetThreadId = activeThreadId, replaceConversation = false) {
    const activeThread = repository && targetThreadId ? await repository.get(ownerId, targetThreadId).catch(() => undefined) : undefined;
    const response = answerMoneyCoachQuestion(value, model, {
      recentMessages: activeThread?.messages.slice(-8).map((message) => typeof message.content === "string" ? message.content : JSON.stringify(message.content)),
      summary: activeThread?.summary?.overview,
      priorSummaries: threads.filter((thread) => thread.id !== targetThreadId).slice(0, 3).map((thread) => thread.summary?.overview).filter((summary): summary is string => Boolean(summary)),
      memories: memories.map((memory) => ({ key: memory.key, value: memory.value })),
    });
    const timestamp = Date.now();
    const turn = { id: `money-${timestamp}`, question: value, response };
    setStreamingTurnId(turn.id);
    setTurns((current) => replaceConversation ? [turn] : [...current, turn]);
    if (repository && targetThreadId) {
      const now = new Date().toISOString();
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
    if (!repository) {
      conversationScrollPositionsRef.current.delete("new-conversation");
      setActiveThreadId(""); setConversationTitle("New conversation"); setTurns([]);
      return undefined;
    }
    const thread = await repository.create({ ownerId, agentId: "beastmoney.money-coach" });
    setActiveThreadId(thread.id); setConversationTitle(thread.title); setTurns([]);
    await refreshThreads();
    return thread;
  }

  async function beginStarter(prompt: string) {
    const thread = await startConversation();
    await askQuestion(prompt, thread?.id || "", true);
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
  const pinnedThreads = threads.filter((thread) => thread.pinned && !thread.archived);
  const recentThreads = threads.filter((thread) => !thread.pinned && !thread.archived).slice(0, 10);
  const archivedThreads = threads.filter((thread) => thread.archived);
  const recommendations = useMemo(
    () => buildMoneyCoachRecommendations(model, executionHistory),
    [executionHistory, model]
  );
  const notifications = useMemo(
    () => buildMoneyCoachNotifications(model),
    [model]
  );
  const outcomeLearning = useMemo(
    () => buildMoneyCoachOutcomeLearning(executionHistory),
    [executionHistory]
  );

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

  function conversationGroup(label: string, items: readonly AgentConversationThread[]) {
    if (!items.length) return null;
    return <section aria-labelledby={`money-coach-${label.toLowerCase().replace(/\s+/g, "-")}`}>
      <h3 id={`money-coach-${label.toLowerCase().replace(/\s+/g, "-")}`} className="px-2 text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">{label}</h3>
      <div className="mt-2 grid gap-1">
        {items.map((thread) => (
          <article key={thread.id} className={`group rounded-xl border px-2 py-2.5 ${thread.id === activeThreadId ? "border-cyan-300/35 bg-cyan-300/10" : "border-transparent hover:border-white/10 hover:bg-white/[0.04]"}`} aria-current={thread.id === activeThreadId ? "page" : undefined}>
            <button type="button" className="w-full rounded-md text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan-300" onClick={() => openThread(thread)}>
              <span className="block truncate text-sm font-bold text-white">{thread.title}</span>
              <span className="mt-1 block text-[11px] text-slate-500">{new Date(thread.updatedAt).toLocaleDateString()} · {thread.messageCount} messages</span>
            </button>
            <div className="mt-2 flex flex-wrap gap-x-3 gap-y-2 opacity-80 transition group-hover:opacity-100 group-focus-within:opacity-100">
              <button type="button" className="text-[11px] font-bold text-cyan-200" onClick={() => { void renameThread(thread); }}>Rename</button>
              <button type="button" className="text-[11px] font-bold text-cyan-200" onClick={() => { void repository?.pin(ownerId, thread.id, !thread.pinned).then(() => refreshThreads()); }}>{thread.pinned ? "Unpin" : "Pin"}</button>
              <button type="button" className="text-[11px] font-bold text-cyan-200" onClick={() => { void archiveThread(thread); }}>{thread.archived ? "Restore" : "Archive"}</button>
              <button type="button" className="text-[11px] font-bold text-red-200" onClick={() => { void deleteThread(thread); }}>Delete</button>
            </div>
          </article>
        ))}
      </div>
    </section>;
  }

  const historyPanel = (
    <aside className="flex h-full min-h-0 flex-col bg-[#0d131e]" aria-label="Money Coach conversation navigation" data-money-coach-left-navigation="true">
      <div className="flex items-center justify-between gap-3 border-b border-white/10 p-4">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.16em] text-cyan-300">Money Coach</p>
          <h2 className="mt-1 text-base font-black text-white">Conversations <span aria-hidden="true">▼</span></h2>
        </div>
        <button type="button" className="text-sm font-bold text-slate-300 lg:hidden" onClick={() => setHistoryOpen(false)} aria-label="Close chat history">Close</button>
      </div>
      <div className="p-3">
        <button type="button" className="beast-button flex min-h-11 w-full items-center justify-center gap-2" onClick={() => { void startConversation(); setHistoryOpen(false); document.getElementById("money-coach-starters-heading")?.scrollIntoView({ behavior: "smooth", block: "start" }); }}><span aria-hidden="true">＋</span> Suggested Questions</button>
        {historyError ? <p className="mt-3 rounded-lg border border-red-300/20 bg-red-300/10 p-2 text-xs leading-5 text-red-100" role="alert">{historyError}</p> : null}
        <label className="mt-3 block text-xs font-bold text-slate-300"><span className="sr-only">Search conversations</span>
          <span className="relative block"><span className="pointer-events-none absolute left-3 top-3 text-slate-500" aria-hidden="true">⌕</span><input className="min-h-11 w-full rounded-xl border border-white/10 bg-slate-950 pl-9 pr-3 text-sm text-white outline-none placeholder:text-slate-600 focus:border-cyan-300 focus:ring-2 focus:ring-cyan-300/20" value={historySearch} onChange={(event) => { setHistorySearch(event.target.value); void refreshThreads(event.target.value); }} placeholder="Search" /></span>
        </label>
        <p className="mt-2 px-1 text-[10px] leading-4 text-slate-600">Conversation titles update automatically from the discussion and can be renamed anytime.</p>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto px-3 pb-3" data-money-coach-history-list="true">
        <div className="grid gap-5">
          {conversationGroup("Pinned Conversations", pinnedThreads)}
          {conversationGroup("Recent Conversations", recentThreads)}
          {conversationGroup("Archived", archivedThreads)}
          {threads.length === 0 ? <p className="py-4 text-sm text-slate-400">No matching conversations.</p> : null}
        </div>
      </div>
      <details className="border-t border-white/10 p-3">
        <summary className="cursor-pointer text-xs font-bold text-cyan-200">Review durable memories ({memories.length})</summary>
        <p className="mt-2 text-xs leading-5 text-slate-400">Current BeastMoney records take priority. Deleting a conversation does not automatically delete its durable memories.</p>
        <div className="mt-2 grid max-h-36 gap-2 overflow-y-auto">{memories.map((memory) => { const value = memory.value as { content?: string; memoryType?: string; confidence?: string }; const content = value.content || String(memory.value); return <div key={memory.id} className="rounded-lg border border-white/10 p-2 text-xs text-slate-300"><p>{content}</p><div className="mt-2 flex gap-3"><button type="button" className="font-bold text-cyan-200" onClick={() => { const corrected = window.prompt("Correct this memory", content); if (corrected && memoryStore) void memoryStore.correct({ agentId: memory.agentId, ownerId, id: memory.id, value: { ...value, content: corrected }, updatedAt: new Date().toISOString() }).then((updated) => setMemories((items) => items.map((item) => item.id === updated.id ? updated : item))); }}>Correct</button><button type="button" className="font-bold text-red-200" onClick={() => { if (memoryStore) void memoryStore.delete({ agentId: memory.agentId, ownerId, id: memory.id }).then(() => setMemories((items) => items.filter((item) => item.id !== memory.id))); }}>Remove</button></div></div>; })}</div>
      </details>
    </aside>
  );
  const starterGroupOrder = [
    "Recommended Today",
    "Continue Previous Work",
    "Getting Started",
    "Planning",
    "Debt",
    "Savings",
    "Retirement",
    "Velocity Banking",
    "Budgeting",
    "Observation Follow-up",
    "Upcoming Events",
  ];
  const starterGroups = starterGroupOrder.map((label) => ({
    label,
    suggestions: workspaceSuggestions.filter((suggestion) => suggestion.group === label),
  })).filter((group) => group.suggestions.length > 0);
  const starterExperience = !loading && !error && turns.length === 0 ? (
    <section className="rounded-2xl border border-white/10 bg-black/10 p-4" aria-labelledby="money-coach-starters-heading" data-agent-215-starter-groups="true" data-money-coach-new-conversation="true">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div className="max-w-3xl">
          <p className="text-[10px] font-black uppercase tracking-[0.16em] text-cyan-300">Ask Money Coach</p>
          <h2 id="money-coach-starters-heading" className="mt-1 text-lg font-black text-white">Suggested Questions</h2>
        </div>
        <p className="text-xs leading-5 text-slate-500">Grounded in your current BeastMoney review</p>
      </div>
      <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {starterGroups.map((group) => <section key={group.label} className="min-w-0" aria-label={group.label}>
          <h3 className="text-[10px] font-black uppercase tracking-[0.14em] text-cyan-300">{group.label}</h3>
          <div className="mt-2 grid gap-1.5">{group.suggestions.map((suggestion) => <button key={suggestion.id} type="button" className="min-h-11 rounded-lg border border-white/10 bg-white/[0.035] px-3 py-2 text-left text-xs font-semibold leading-5 text-slate-200 transition hover:border-cyan-300/30 hover:bg-cyan-300/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan-300" onClick={() => { void beginStarter(suggestion.prompt || suggestion.label); }}>{suggestion.label}</button>)}</div>
        </section>)}
      </div>
      <p className="mt-3 text-xs leading-5 text-slate-500">Money Coach provides structured guidance and does not offer unrestricted chat or execute transactions.</p>
    </section>
  ) : null;
  const financialHealth = model.financialContext.financialHealth;
  const debtComponent = financialHealth?.components.find((component) => component.id === "debt");
  const emergencyFundComponent = financialHealth?.components.find((component) => component.id === "emergency-fund");
  const financialSummary = (
    <section className="rounded-2xl border border-white/10 bg-white/[0.025] p-3 sm:p-4" aria-labelledby="money-coach-financial-summary">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 id="money-coach-financial-summary" className="text-xs font-black uppercase tracking-[0.16em] text-slate-400">Financial Summary</h2>
        <Link className="text-xs font-bold text-cyan-200" href="/dashboard/money/dashboard">Open full dashboard <span aria-hidden="true">→</span></Link>
      </div>
      <div className="mt-3 grid gap-3 xl:grid-cols-[1.15fr_0.85fr_0.85fr_1.15fr]">
        <section className="grid min-w-0 gap-2 sm:grid-cols-2 xl:grid-cols-1" aria-labelledby="money-snapshot-heading">
          <h3 id="money-snapshot-heading" className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-500 sm:col-span-2 xl:col-span-1">Financial Snapshot</h3>
          <CompactMetric
            label="Financial Health"
            value={financialHealth ? String(financialHealth.score) : "Unavailable"}
            detail={financialHealth ? `${titleCase(financialHealth.band)} · ${financialHealth.strongest.label} is currently strongest` : "The current component calculation is unavailable."}
            href="/dashboard/money?starter=How%20is%20my%20financial%20health%20score%20calculated%3F"
            action="Ask Coach"
          />
          <CompactMetric
            label="Cash Available"
            value={formatCurrency(model.financialContext.currentCash)}
            detail={`${formatCurrency(model.financialContext.cashBuffer)} is protected by your current setting.`}
            href="/dashboard/money/cashflow"
          />
        </section>
        <section className="grid min-w-0 content-start gap-2" aria-labelledby="money-cash-flow-heading">
          <h3 id="money-cash-flow-heading" className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-500">Cash Flow</h3>
          <CompactMetric
            label={model.financialContext.projectedSurplus >= 0 ? "Monthly Surplus" : "Monthly Shortfall"}
            value={formatCurrency(Math.abs(model.financialContext.projectedSurplus))}
            detail={`${formatCurrency(model.financialContext.monthlyIncome)} income · ${formatCurrency(model.financialContext.monthlyOutflow)} known outflow`}
            href="/dashboard/money/cashflow"
          />
        </section>
        <section className="grid min-w-0 content-start gap-2" aria-labelledby="money-debt-heading">
          <h3 id="money-debt-heading" className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-500">Debt</h3>
          <CompactMetric
            label="Debt Remaining"
            value={formatCurrency(model.financialContext.totalDebt)}
            detail={debtComponent?.available ? `Debt dimension ${debtComponent.score}/100 across ${model.financialContext.debts.length} tracked account${model.financialContext.debts.length === 1 ? "" : "s"}.` : `${model.financialContext.debts.length} active debt account${model.financialContext.debts.length === 1 ? "" : "s"} tracked.`}
            href="/dashboard/money/debts"
          />
        </section>
        <section className="grid min-w-0 gap-2 sm:grid-cols-2 xl:grid-cols-1" aria-labelledby="money-future-planning-heading">
          <h3 id="money-future-planning-heading" className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-500 sm:col-span-2 xl:col-span-1">Future Planning</h3>
          <CompactMetric
            label="Emergency Fund"
            value={emergencyFundComponent?.available ? `${emergencyFundComponent.score}/100` : "Not scored"}
            detail={emergencyFundComponent?.evidence[1] || `Protected reserve ${formatCurrency(model.financialContext.cashBuffer)}`}
            href="/dashboard/money/cashflow"
          />
          <CompactMetric
            label="Retirement"
            value={model.financialContext.retirementDataAvailable ? "In progress" : "Setup needed"}
            detail={model.financialContext.retirementDataAvailable ? "Current retirement planning data is available." : "Add retirement inputs before relying on a progress estimate."}
            href="/dashboard/money/retirement"
          />
        </section>
      </div>
      {financialHealth ? <details className="mt-3 border-t border-white/10 pt-3" data-financial-health-formula="true">
        <summary className="cursor-pointer rounded-lg text-xs font-bold text-cyan-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan-300">How is my score calculated?</summary>
        <p className="mt-3 text-xs leading-5 text-slate-400">{financialHealth.formula}</p>
        <div className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
          {financialHealth.components.map((component) => (
            <div key={component.id} className="rounded-lg border border-white/10 bg-black/10 p-3">
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs font-bold text-white">{component.label}</p>
                <span className="text-xs font-black text-slate-300">{component.available ? component.score : "N/A"} · {component.weight}%</span>
              </div>
              <p className="mt-1 text-[11px] leading-5 text-slate-500">{component.calculation}</p>
            </div>
          ))}
        </div>
        <p className="mt-3 text-xs leading-5 text-slate-500">{financialHealth.disclaimer}</p>
      </details> : null}
    </section>
  );
  const recommendationCards = (
    <section aria-labelledby="money-coach-recommendations">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 id="money-coach-recommendations" className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">Recommendation Cards</h2>
          <p className="mt-2 text-sm leading-6 text-slate-400">Decisions are saved to immutable Execution History. Choosing a lifecycle status does not move money or modify financial records.</p>
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
              <p className="mt-2 text-sm leading-6 text-slate-300">{recommendation.recommendation}</p>
              <details className="mt-3 rounded-lg border border-white/10 p-3">
                <summary className="cursor-pointer text-xs font-bold text-cyan-200">Evidence, confidence, and limitations</summary>
                <p className="mt-3 text-xs leading-5 text-slate-400">{recommendation.confidence.basis}</p>
                {recommendation.supportingEvidence.length ? <ul className="mt-2 list-disc space-y-1 pl-5 text-xs leading-5 text-slate-400">{recommendation.supportingEvidence.map((item) => <li key={`${item.label}-${String(item.value)}`}>{item.label}: {String(item.value)}</li>)}</ul> : null}
                <ul className="mt-2 list-disc space-y-1 pl-5 text-xs leading-5 text-slate-500">{recommendation.limitations.map((item) => <li key={item}>{item}</li>)}</ul>
              </details>
              <div className="mt-3 flex flex-wrap gap-2">
                <Link className="beast-button-secondary inline-flex min-h-11 items-center" href={recommendation.href}>View details</Link>
                {(!lifecycle || lifecycle.status === "proposed" || lifecycle.status === "deferred") ? <button type="button" className="beast-button min-h-11" disabled={pending || !executionStore} onClick={() => { void decideRecommendation(recommendation, "accepted"); }}>Accept</button> : null}
                {(!lifecycle || lifecycle.status === "proposed") ? <button type="button" className="beast-button-secondary min-h-11" disabled={pending || !executionStore} onClick={() => { void decideRecommendation(recommendation, "deferred"); }}>Defer</button> : null}
                {(!lifecycle || lifecycle.status === "proposed" || lifecycle.status === "deferred") ? <button type="button" className="beast-button-secondary min-h-11" disabled={pending || !executionStore} onClick={() => { void decideRecommendation(recommendation, "declined"); }}>Decline</button> : null}
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
  const notificationsPanel = (
    <section aria-labelledby="money-coach-notifications">
      <h2 id="money-coach-notifications" className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">Notifications</h2>
      <div className="mt-3 grid gap-2 md:grid-cols-2">
        {notifications.length ? notifications.map((notification) => (
          <article key={notification.id} className="rounded-xl border border-white/10 bg-white/[0.035] p-3">
            <p className={`text-[10px] font-black uppercase tracking-[0.14em] ${notification.kind === "attention" ? "text-amber-200" : notification.kind === "progress" ? "text-emerald-200" : "text-cyan-200"}`}>{notification.kind}</p>
            <h3 className="mt-1 font-black text-white">{notification.title}</h3>
            <p className="mt-1 text-sm leading-5 text-slate-400">{notification.detail}</p>
            {notification.href ? <Link className="mt-2 inline-flex text-xs font-bold text-cyan-200" href={notification.href}>View details <span aria-hidden="true">→</span></Link> : null}
          </article>
        )) : <p className="rounded-xl border border-white/10 p-3 text-sm text-slate-400">No material changes or alerts are available from the current saved records.</p>}
      </div>
    </section>
  );
  const learningPanel = (
    <section aria-labelledby="money-coach-learning">
      <h2 id="money-coach-learning" className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">Learning from Outcomes</h2>
      <div className="mt-3 grid gap-2">
        {outcomeLearning.length ? outcomeLearning.map((outcome) => (
          <article key={outcome.id} className="rounded-xl border border-white/10 bg-white/[0.035] p-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="font-black text-white">{outcome.recommendationTitle}</h3>
              <span className="text-xs font-bold text-slate-400">{outcome.status} · {new Date(outcome.recordedAt).toLocaleDateString()}</span>
            </div>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-sm leading-6 text-slate-400">{outcome.learning.map((item) => <li key={item}>{item}</li>)}</ul>
          </article>
        )) : <p className="rounded-xl border border-white/10 p-3 text-sm leading-6 text-slate-400">No outcomes have been reported yet. Learning appears only after you accept a recommendation and explicitly report what happened.</p>}
      </div>
    </section>
  );

  return (
    <ProfessionalConversationWorkspace
      history={historyPanel}
      historyOpen={historyOpen}
      onCloseHistory={() => setHistoryOpen(false)}
      historyDialogRef={historyDialogRef}
      professionalName="Money Coach"
      drawerId="money-coach-history-drawer"
    >
      <AgentExperience
      className="max-w-none !gap-4 border-white/10 bg-[#141a24] !p-3 sm:!p-4"
      composerPlacement="before-cards"
      header={
        <AgentHeader
          title={model.professional.identity.role}
          subtitle={`${model.behavior.communication.tone} guidance · ${model.behavior.communication.verbosity} detail`}
          avatar={<AgentAvatar name={model.professional.identity.role} initials="MC" size="md" />}
          status={<div className="flex items-center gap-2"><AgentStatus state={loading ? "loading" : error ? "error" : streamingTurnId ? "streaming" : "available"} /><button type="button" className="beast-button-secondary min-h-11 lg:hidden" aria-expanded={historyOpen} aria-controls="money-coach-history-drawer" onClick={() => setHistoryOpen(true)}>Conversations</button></div>}
        />
      }
      greeting={
        <AgentGreeting greeting={localGreeting}>
          <p>I reviewed your current BeastMoney records and organized the decisions that matter most today.</p>
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
        ) : (
          <div className="grid gap-4">
            <div className="grid items-start gap-3 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
              <section className="rounded-2xl border border-cyan-300/20 bg-cyan-300/[0.06] p-4" aria-labelledby="money-coach-executive-briefing">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-[10px] font-black uppercase tracking-[0.16em] text-cyan-300">Executive Briefing</p>
                  {financialHealth ? <span className="rounded-full border border-white/10 bg-black/15 px-2.5 py-1 text-[11px] font-bold text-slate-200">Health {financialHealth.score} · {titleCase(financialHealth.band)}</span> : null}
                </div>
                <h2 id="money-coach-executive-briefing" className="mt-2 text-lg font-black text-white">{model.primaryRecommendation.title}</h2>
                <p className="mt-2 text-sm leading-6 text-slate-300">{model.morningBriefing.summary}</p>
                <p className="mt-2 text-sm leading-5 text-slate-400">{model.primaryRecommendation.action}</p>
                <div className="mt-3 flex flex-wrap items-center gap-3">
                  <Link className="inline-flex min-h-11 items-center font-bold text-cyan-200" href={model.primaryRecommendation.href}>View recommended action <span aria-hidden="true" className="ml-2">→</span></Link>
                  <span className="text-xs text-slate-500">{model.morningBriefing.items.length} meaningful update{model.morningBriefing.items.length === 1 ? "" : "s"} in this review</span>
                </div>
              </section>
              <MorningFinancialBriefingPanel
                briefing={model.morningBriefing}
                defaultOpen={turns.length === 0}
              />
            </div>
            {financialSummary}
            {starterExperience}
            {recommendationCards}
            {notificationsPanel}
            {learningPanel}
          </div>
        )}
      suggestedActions={null}
      conversation={
        loading ? (
          <AgentLoadingState label="Loading Money Coach conversation" />
        ) : error ? (
          <AgentEmptyState title="Conversation unavailable" description="Reload your BeastMoney records to continue with Money Coach." />
        ) : (
          <div className="min-w-0">
            <section className="flex h-[30rem] min-w-0 flex-col" aria-label="Active Money Coach conversation">
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
            />
            </section>
          </div>
        )
      }
      composer={
        <ProfessionalConversationComposer id="money-coach-question">
          <div className="rounded-xl border border-white/10 bg-slate-950/50 p-3">
            <p className="text-sm font-bold text-white">Structured guidance only</p>
            <p className="mt-1 text-xs leading-5 text-slate-400">Use the evidence-backed suggested questions above. Money Coach does not provide an unrestricted chat input or execute financial transactions.</p>
            <p className="mt-2 text-xs leading-5 text-slate-500">{model.safetyNotice}</p>
          </div>
        </ProfessionalConversationComposer>
      }
      />
    </ProfessionalConversationWorkspace>
  );
}
