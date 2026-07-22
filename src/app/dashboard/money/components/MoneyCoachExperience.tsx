"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  AgentAvatar,
  AgentConversationInput,
  AgentEmptyState,
  AgentErrorState,
  AgentExperience,
  AgentGreeting,
  AgentHeader,
  AgentLoadingState,
  AgentStatus,
  AgentSuggestedActions,
  type AgentConversationMessage,
} from "@/app/components/agents";
import {
  ServerAgentConversationRepository,
  SupabaseAgentConversationStore,
  SupabaseAgentMemoryStore,
  type AgentConversationThread,
  type AgentMemoryRecord,
  type AgentMessage,
} from "@/lib/platform/agents";
import {
  answerMoneyCoachQuestion,
  buildMoneyCoachGreeting,
  type MoneyCoachExperienceModel,
} from "@/lib/moneyCoachExperience";

type MoneyCoachExperienceProps = {
  model: MoneyCoachExperienceModel;
  loading: boolean;
  error?: string;
  onRetry: () => void;
};

function MoneyCoachConversationTimeline({ messages }: { messages: readonly AgentConversationMessage[] }) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const region = scrollRef.current;
    if (region) region.scrollTo({ top: region.scrollHeight, behavior: "smooth" });
  }, [messages.length]);

  return (
    <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto scroll-smooth" data-money-coach-active-scroll="true">
      <section className="mx-auto w-full max-w-3xl px-1 pb-8 sm:px-4" aria-labelledby="money-coach-conversation-heading">
        <h2 id="money-coach-conversation-heading" className="mb-2 text-lg font-black text-white">Conversation</h2>
        <ol className="divide-y divide-white/[0.07]" role="log" aria-live="polite" aria-relevant="additions text" data-agent-conversation-timeline="true">
          {messages.map((message) => (
            <li key={message.id} className="py-6 first:pt-4 sm:py-8" data-message-role={message.role}>
              <div className="flex items-baseline justify-between gap-4">
                <h3 className={`text-sm font-black ${message.role === "agent" ? "text-white" : message.role === "user" ? "text-cyan-200" : "text-slate-300"}`}>{message.author}</h3>
                {message.timestamp ? <time className="shrink-0 text-xs text-slate-500">{message.timestamp}</time> : null}
              </div>
              <div className="mt-3 break-words text-[15px] leading-7 text-slate-200 [&_a]:font-bold [&_a]:text-cyan-200 [&_a]:underline-offset-4 [&_a:hover]:underline [&_details]:mt-4 [&_li]:my-1 [&_ol]:my-4 [&_ol]:list-decimal [&_ol]:pl-6 [&_p+p]:mt-4 [&_table]:my-5 [&_table]:w-full [&_table]:border-collapse [&_td]:border-b [&_td]:border-white/10 [&_td]:px-3 [&_td]:py-2 [&_th]:border-b [&_th]:border-white/15 [&_th]:px-3 [&_th]:py-2 [&_th]:text-left [&_ul]:my-4 [&_ul]:list-disc [&_ul]:pl-6">{message.content}</div>
              {message.streaming ? <span className="sr-only">Response is streaming</span> : null}
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}

export function MoneyCoachExperience({
  model,
  loading,
  error,
  onRetry,
}: MoneyCoachExperienceProps) {
  const router = useRouter();
  const [input, setInput] = useState("");
  const [turns, setTurns] = useState<{ id: string; question: string; response: string; href: string; action: string }[]>([]);
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
  const historyDialogRef = useRef<HTMLDivElement>(null);
  const ownerId = model.insights[0]?.ownerId || "authenticated-owner";

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
    let cancelled = false;
    async function loadServerHistory() {
      const client = createClient();
      const { data: { user }, error: authError } = await client.auth.getUser();
      if (authError || !user || user.id !== ownerId) throw authError || new Error("Money Coach history is not available for this owner.");
      const nextRepository = new ServerAgentConversationRepository(new SupabaseAgentConversationStore(client));
      const nextMemoryStore = new SupabaseAgentMemoryStore(client);
      await nextRepository.importLegacy({ ownerId, agentId: "beastmoney.money-coach", storage: window.localStorage });
      await nextMemoryStore.importLegacy({ ownerId, agentId: "beastmoney.money-coach", storage: window.localStorage });
      let available = await nextRepository.list({ ownerId, agentId: "beastmoney.money-coach", includeArchived: true });
      if (available.length === 0) available = [await nextRepository.create({ ownerId, agentId: "beastmoney.money-coach" })];
      if (cancelled) return;
      const active = available.find((thread) => !thread.archived) || available[0];
      setRepository(nextRepository); setMemoryStore(nextMemoryStore); setThreads(available); setActiveThreadId(active.id);
      setConversationTitle(active.title); restoreThread(active);
      setMemories(await nextMemoryStore.query({ ownerId, agentId: "beastmoney.money-coach" }));
    }
    void loadServerHistory().catch(() => {
      if (!cancelled) setHistoryError("Saved conversations are temporarily unavailable. Your current financial records are unaffected.");
    });
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ownerId]);

  function restoreThread(thread: AgentConversationThread) {
    const restored: typeof turns = [];
    for (let index = 0; index < thread.messages.length; index += 2) {
      const user = thread.messages[index]; const agent = thread.messages[index + 1];
      if (!user || !agent) continue;
      const content = agent.content as { text: string; href: string; action: string };
      restored.push({ id: user.id, question: String(user.content), response: content.text, href: content.href, action: content.action });
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
        author: "Money Coach",
        content: model.conversationOpening,
      },
      ...turns.flatMap<AgentConversationMessage>((turn) => [
        { id: `${turn.id}-user`, role: "user", author: "You", content: turn.question },
        { id: `${turn.id}-coach`, role: "agent", author: "Money Coach", content: <><p>{turn.response}</p><Link className="mt-3 inline-flex font-bold text-cyan-200" href={turn.href}>{turn.action} <span aria-hidden="true">→</span></Link></> },
      ]),
    ],
    [model.conversationOpening, turns]
  );

  function askQuestion(value: string) {
    const response = answerMoneyCoachQuestion(value, model);
    const timestamp = Date.now();
    const turn = { id: `money-${timestamp}`, question: value, response: response.text, href: response.href, action: response.action };
    setTurns((current) => [...current, turn]);
    if (repository && activeThreadId) {
      const now = new Date().toISOString();
      const messages: AgentMessage[] = [
        { id: `${turn.id}-user`, threadId: activeThreadId, sender: { kind: "user", id: ownerId }, recipient: { kind: "agent", id: "beastmoney.money-coach" }, content: value, timestamp: now },
        { id: `${turn.id}-coach`, threadId: activeThreadId, sender: { kind: "agent", id: "beastmoney.money-coach" }, recipient: { kind: "module", id: "beastmoney" }, content: { text: response.text, href: response.href, action: response.action }, timestamp: now },
      ];
      void repository.append(ownerId, activeThreadId, messages, { insightIds: model.insights.map((item) => item.id), actionIds: [response.action] }).then(async (updated) => {
        await repository.summarize(ownerId, activeThreadId, { overview: `Discussed ${value.slice(0, 100)}`, decisions: [], unresolvedFollowUps: [], updatedAt: now });
        setConversationTitle(updated.title); await refreshThreads();
      }).catch(() => setHistoryError("This response is visible now but could not be saved. Please retry before leaving this page."));
      const durableType = /\b(i prefer|my goal|i decided|remember that|always|never)\b/i.exec(value)?.[1];
      if (memoryStore && durableType) {
        const memoryType = durableType === "my goal" ? "financial-goal" : durableType === "i decided" ? "confirmed-decision" : "preference-or-constraint";
        const memory: AgentMemoryRecord = { id: `money-memory-${timestamp}`, agentId: "beastmoney.money-coach", ownerId, scope: "user", key: memoryType, value: { content: value, memoryType, confidence: "high", sourceConversationId: activeThreadId, sourceMessageId: messages[0].id, timestamp: now }, purpose: "Remember an explicit member preference, goal, decision, or recurring constraint.", evidence: [{ source: activeThreadId, capturedAt: now, description: messages[0].id }], createdAt: now, updatedAt: now };
        void memoryStore.put(memory).then(() => setMemories((current) => [...current, memory]));
      }
    }
    setInput("");
  }

  async function startConversation() {
    if (!repository) return; const thread = await repository.create({ ownerId, agentId: "beastmoney.money-coach" });
    setActiveThreadId(thread.id); setConversationTitle(thread.title); setTurns([]); await refreshThreads();
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

  function focusQuestionInput() {
    const region = document.getElementById("money-coach-question");
    region?.scrollIntoView({ behavior: "smooth", block: "center" });
    region?.querySelector("textarea")?.focus();
  }

  function followSuggestion(href?: string) {
    if (!href) return;
    if (href.startsWith("#")) {
      document.getElementById(href.slice(1))?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
      return;
    }
    router.push(href);
  }

  const localGreeting = localNow
    ? buildMoneyCoachGreeting(model.userFirstName, localNow)
    : model.userFirstName;
  const reviewIntroduction = model.importantItems[0]
    ? `I reviewed today’s plan. ${model.importantItems[0]}`
    : model.potentialIssues[0]
      ? `I reviewed today’s plan and found one item to discuss: ${model.potentialIssues[0]}`
      : model.wins[0]
        ? `I reviewed today’s plan. Here’s the strongest positive signal: ${model.wins[0]}`
        : model.introduction;
  const todayPriorities = model.insights.slice(0, 3);
  const recentThreads = threads.slice(0, 10);
  const olderThreads = threads.slice(10);
  const historyThreads = [...recentThreads, ...olderThreads];

  const historyPanel = (
    <aside className="flex h-full min-h-0 flex-col" aria-label="Saved Money Coach conversations">
      <div className="flex items-center justify-between gap-3 border-b border-white/10 p-4">
        <h2 className="text-base font-black text-white">Chat History</h2>
        <button type="button" className="text-sm font-bold text-slate-300 lg:hidden" onClick={() => setHistoryOpen(false)} aria-label="Close chat history">Close</button>
      </div>
      <div className="p-3 pb-0">
        <button type="button" className="beast-button w-full min-h-11" onClick={() => { void startConversation(); setHistoryOpen(false); }}>New conversation</button>
        {historyError ? <p className="mt-3 rounded-lg border border-red-300/20 bg-red-300/10 p-2 text-xs leading-5 text-red-100" role="alert">{historyError}</p> : null}
        <label className="mt-3 block text-xs font-bold text-slate-300">Search conversations
          <input className="mt-1 min-h-11 w-full rounded-xl border border-white/15 bg-slate-950 px-3 text-sm text-white" value={historySearch} onChange={(event) => { setHistorySearch(event.target.value); void refreshThreads(event.target.value); }} placeholder="Search chat history" />
        </label>
      </div>
      <div className="mt-3 min-h-0 flex-1 overflow-y-auto px-3 pb-3" data-money-coach-history-list="true">
        <div className="grid gap-2">
          {historyThreads.map((thread) => (
            <article key={thread.id} className={`rounded-xl border p-3 ${thread.id === activeThreadId ? "border-cyan-300/50 bg-cyan-300/10" : "border-white/10 bg-black/15"}`} aria-current={thread.id === activeThreadId ? "true" : undefined}>
              <button type="button" className="w-full text-left" onClick={() => openThread(thread)}>
                <span className="block truncate font-bold text-white">{thread.pinned ? "Pinned · " : ""}{thread.title}</span>
                <span className="mt-1 block text-xs text-slate-400">{new Date(thread.updatedAt).toLocaleDateString()} · {thread.messageCount} messages{thread.archived ? " · Archived" : ""}</span>
                {thread.id === activeThreadId ? <span className="mt-1 block text-xs font-bold text-cyan-200">Active conversation</span> : null}
              </button>
              <div className="mt-2 flex flex-wrap gap-x-3 gap-y-2">
                <button type="button" className="text-xs font-bold text-cyan-200" onClick={() => { void renameThread(thread); }}>Rename</button>
                <button type="button" className="text-xs font-bold text-cyan-200" onClick={() => { void repository?.pin(ownerId, thread.id, !thread.pinned).then(() => refreshThreads()); }}>{thread.pinned ? "Unpin" : "Pin"}</button>
                <button type="button" className="text-xs font-bold text-cyan-200" onClick={() => { void archiveThread(thread); }}>{thread.archived ? "Restore" : "Archive"}</button>
                <button type="button" className="text-xs font-bold text-red-200" onClick={() => { void deleteThread(thread); }}>Delete</button>
              </div>
            </article>
          ))}
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

  return (
    <AgentExperience
      className="border-green-400/25"
      composerPlacement="before-cards"
      header={
        <AgentHeader
          title="Money Coach"
          subtitle={`${model.behavior.communication.tone} guidance · ${model.behavior.communication.verbosity} detail`}
          avatar={<AgentAvatar name="Money Coach" initials="MC" size="lg" />}
          status={<AgentStatus state={loading ? "loading" : error ? "error" : "available"} />}
        />
      }
      greeting={
        <AgentGreeting greeting={localGreeting}>
          <p>{reviewIntroduction}</p>
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
        ) : todayPriorities.length > 0 ? (
          <section aria-labelledby="money-coach-priorities" className="mx-auto w-full max-w-3xl border-y border-white/[0.07] py-4">
            <h2 id="money-coach-priorities" className="text-xs font-black uppercase tracking-[0.14em] text-slate-400">Today&apos;s priorities</h2>
            <ul className="mt-3 grid gap-3">
              {todayPriorities.map((insight) => <li key={insight.id} className="flex min-w-0 items-start justify-between gap-4 text-sm"><span className="leading-6 text-slate-200">{insight.summary}</span>{insight.navigationTarget ? <Link href={insight.navigationTarget} className="shrink-0 font-bold text-cyan-200">Review</Link> : null}</li>)}
            </ul>
          </section>
        ) : null}
      suggestedActions={
        !loading && !error ? (
          <AgentSuggestedActions
            actions={model.suggestions.map((suggestion) => ({
              id: suggestion.id,
              label: suggestion.label,
              onSelect: suggestion.intent === "ask"
                ? focusQuestionInput
                : suggestion.prompt
                  ? () => askQuestion(suggestion.prompt || suggestion.label)
                  : () => followSuggestion(suggestion.href),
            }))}
          />
        ) : null
      }
      conversation={
        loading ? (
          <AgentLoadingState label="Loading Money Coach conversation" />
        ) : error ? (
          <AgentEmptyState title="Conversation unavailable" description="Reload your BeastMoney records to continue with Money Coach." />
        ) : (
          <div className="grid min-w-0 gap-4 lg:grid-cols-[minmax(0,1fr)_18rem]">
            <section className="flex h-[32rem] min-w-0 flex-col" aria-label="Active Money Coach conversation">
            <div className="mb-1 flex flex-wrap items-center justify-between gap-2 border-b border-white/[0.07] pb-3">
              <p className="truncate text-sm font-semibold text-slate-400">{conversationTitle}</p>
              <button type="button" className="beast-button-secondary min-h-11 lg:hidden" aria-expanded={historyOpen} aria-controls="money-coach-history-drawer" onClick={() => setHistoryOpen(true)}>Chat History</button>
            </div>
            <MoneyCoachConversationTimeline messages={messages} />
            </section>
            <div className="hidden h-[32rem] overflow-hidden rounded-2xl border border-white/10 bg-black/20 lg:block">{historyPanel}</div>
            {historyOpen ? <div className="fixed inset-0 z-50 bg-black/70 p-3 lg:hidden" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setHistoryOpen(false); }}><div ref={historyDialogRef} id="money-coach-history-drawer" className="ml-auto h-full max-h-[42rem] w-full max-w-sm overflow-hidden rounded-2xl border border-white/15 bg-slate-950 shadow-2xl" role="dialog" aria-modal="true" aria-label="Chat History">{historyPanel}</div></div> : null}
          </div>
        )
      }
      composer={
        <div id="money-coach-question" className="mx-auto w-full max-w-3xl [&_form]:rounded-2xl [&_form]:border-white/15 [&_form]:bg-[#111827] [&_form]:p-2 [&_form]:shadow-[0_12px_35px_rgba(0,0,0,0.18)] [&_textarea]:min-h-[44px] [&_textarea]:resize-none [&_textarea]:border-0 [&_textarea]:bg-transparent [&_textarea]:px-3 [&_textarea]:py-2.5 [&_textarea]:focus:ring-0 [&_button]:min-h-10 [&_button]:rounded-xl [&_button]:border [&_button]:border-white/10 [&_button]:bg-white/10 [&_button]:px-4 [&_button]:text-sm [&_button]:shadow-none [&_button:hover]:bg-white/15">
          <AgentConversationInput
            value={input}
            onChange={setInput}
            onSubmit={askQuestion}
            label="Ask Money Coach about the current BeastMoney plan"
            placeholder="Ask your Money Coach about bills, debt, retirement, cash flow, income, Velocity, or anything else…"
            disabled={loading || Boolean(error)}
          />
          <p className="mt-2 px-2 text-xs leading-5 text-slate-500">{model.safetyNotice}</p>
        </div>
      }
    />
  );
}
