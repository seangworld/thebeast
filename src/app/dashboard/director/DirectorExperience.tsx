"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AgentConversationInput,
  AgentErrorState,
  AgentExperience,
  AgentGreeting,
  AgentHeader,
  AgentLoadingState,
  AgentSmartCard,
  AgentStatus,
  AgentSuggestedActions,
  type AgentConversationMessage,
} from "@/app/components/agents/AgentExperience";
import {
  ProfessionalConversationComposer,
  ProfessionalConversationTimeline,
  ProfessionalConversationWorkspace,
} from "@/app/components/agents/ProfessionalConversationWorkspace";
import {
  directorConversationIdentity,
  formatProfessionalMessageTime,
  ProfessionalConversationAvatar,
} from "@/app/components/agents/ProfessionalConversationIdentity";
import type { DirectorRecommendation } from "@/lib/director";

type DirectorMessage = {
  id: string;
  conversationId: string;
  role: "user" | "agent";
  text: string;
  recommendation: DirectorRecommendation | null;
  createdAt: string;
};

type DirectorConversation = {
  id: string;
  title: string;
  messageCount: number;
  pinned?: boolean;
  createdAt: string;
  updatedAt: string;
  messages: DirectorMessage[];
};

const openingMessage: AgentConversationMessage = {
  id: "director-opening",
  role: "agent",
  author: "Avery Stone",
  content:
    "I look across the parts of Beast you have approved, coordinate your specialists, and help you choose one clear next step. What would you like to work through?",
};

function DirectorHistory({
  conversations,
  activeId,
  loading,
  onNew,
  onSelect,
}: {
  conversations: readonly DirectorConversation[];
  activeId: string | null;
  loading: boolean;
  onNew: () => void;
  onSelect: (id: string) => void;
}) {
  return (
    <aside className="flex h-full min-w-0 flex-col bg-[#111827]" aria-label="Director conversation history">
      <div className="border-b border-white/10 p-4">
        <p className="text-xs font-black uppercase tracking-[0.14em] text-violet-200">
          Conversation history
        </p>
        <button
          type="button"
          className="beast-button mt-3 w-full"
          onClick={onNew}
          disabled={loading}
        >
          New Conversation
        </button>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto p-3">
        {loading ? (
          <AgentLoadingState label="Loading Director conversations" />
        ) : conversations.length ? (
          <ol className="grid gap-2">
            {conversations.map((conversation) => (
              <li key={conversation.id}>
                <button
                  type="button"
                  className={`w-full rounded-xl border p-3 text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-violet-300 ${
                    activeId === conversation.id
                      ? "border-violet-300/45 bg-violet-300/10"
                      : "border-white/10 bg-white/[0.03] hover:border-white/25"
                  }`}
                  onClick={() => onSelect(conversation.id)}
                  aria-current={activeId === conversation.id ? "page" : undefined}
                >
                  <span className="block truncate text-sm font-bold text-white">
                    {conversation.title}
                  </span>
                  <span className="mt-1 block text-xs text-slate-400">
                    {conversation.messageCount} messages · {new Date(conversation.updatedAt).toLocaleDateString()}
                  </span>
                </button>
              </li>
            ))}
          </ol>
        ) : (
          <p className="rounded-xl border border-dashed border-white/10 p-3 text-sm leading-6 text-slate-400">
            Start your first Director conversation. Each new conversation is saved as a separate thread.
          </p>
        )}
      </div>
    </aside>
  );
}

export default function DirectorExperience() {
  const [conversations, setConversations] = useState<DirectorConversation[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [question, setQuestion] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [followLatestSignal, setFollowLatestSignal] = useState(0);
  const historyDialogRef = useRef<HTMLDivElement>(null);
  const historyTriggerRef = useRef<HTMLButtonElement>(null);
  const scrollPositions = useRef(new Map<string, number>());

  const refresh = useCallback(async (preferredId?: string) => {
    const response = await fetch("/api/director/conversations", {
      credentials: "same-origin",
      cache: "no-store",
    });
    const payload = (await response.json()) as {
      conversations?: DirectorConversation[];
      error?: string;
    };
    if (!response.ok || !payload.conversations) {
      throw new Error(payload.error || "Director conversations are unavailable.");
    }
    setConversations(payload.conversations);
    setActiveId((current) =>
      preferredId && payload.conversations?.some((item) => item.id === preferredId)
        ? preferredId
        : current && payload.conversations?.some((item) => item.id === current)
          ? current
          : payload.conversations?.[0]?.id || null
    );
  }, []);

  useEffect(() => {
    void refresh()
      .catch((loadError) =>
        setError(
          loadError instanceof Error
            ? loadError.message
            : "Director conversations are unavailable."
        )
      )
      .finally(() => setLoading(false));
  }, [refresh]);

  useEffect(() => {
    if (!historyOpen) return;
    historyDialogRef.current?.focus();
    const close = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setHistoryOpen(false);
        historyTriggerRef.current?.focus();
      }
    };
    window.addEventListener("keydown", close);
    return () => window.removeEventListener("keydown", close);
  }, [historyOpen]);

  const activeConversation = conversations.find(
    (conversation) => conversation.id === activeId
  );
  const messages = useMemo<AgentConversationMessage[]>(() => {
    if (!activeConversation?.messages.length) return [openingMessage];
    return activeConversation.messages.map((message) => ({
      id: message.id,
      role: message.role,
      author: message.role === "agent" ? "Avery Stone" : "You",
      content: message.text,
      timestamp: formatProfessionalMessageTime(message.createdAt),
    }));
  }, [activeConversation]);
  const latestRecommendation = [...(activeConversation?.messages || [])]
    .reverse()
    .find((message) => message.role === "agent" && message.recommendation)
    ?.recommendation;

  async function createConversation() {
    setSending(true);
    setError(null);
    try {
      const response = await fetch("/api/director/conversations", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "create" }),
      });
      const payload = (await response.json()) as {
        conversation?: DirectorConversation;
        error?: string;
      };
      if (!response.ok || !payload.conversation) {
        throw new Error(payload.error || "A new conversation could not be created.");
      }
      await refresh(payload.conversation.id);
      setQuestion("");
      setHistoryOpen(false);
      setFollowLatestSignal((value) => value + 1);
    } catch (createError) {
      setError(
        createError instanceof Error
          ? createError.message
          : "A new conversation could not be created."
      );
    } finally {
      setSending(false);
    }
  }

  async function submit(value: string) {
    setSending(true);
    setError(null);
    try {
      const response = await fetch("/api/director/conversations", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: value, conversationId: activeId }),
      });
      const payload = (await response.json()) as {
        conversation?: { id: string };
        error?: string;
      };
      if (!response.ok || !payload.conversation) {
        throw new Error(payload.error || "The Director could not respond.");
      }
      await refresh(payload.conversation.id);
      setQuestion("");
      setFollowLatestSignal((current) => current + 1);
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "The Director could not respond."
      );
    } finally {
      setSending(false);
    }
  }

  const history = (
    <DirectorHistory
      conversations={conversations}
      activeId={activeId}
      loading={loading}
      onNew={() => void createConversation()}
      onSelect={(id) => {
        setActiveId(id);
        setHistoryOpen(false);
        setFollowLatestSignal((value) => value + 1);
      }}
    />
  );

  return (
    <ProfessionalConversationWorkspace
      history={history}
      historyOpen={historyOpen}
      onCloseHistory={() => {
        setHistoryOpen(false);
        historyTriggerRef.current?.focus();
      }}
      historyDialogRef={historyDialogRef}
      professionalName="Director"
      drawerId="director-conversation-history"
    >
      <AgentExperience
        className="max-w-none border-violet-300/15 bg-[#141824]"
        header={
          <AgentHeader
            title="Avery Stone"
            subtitle="Digital Staff Director · Coordinates your specialists"
            avatar={
              <ProfessionalConversationAvatar
                identity={directorConversationIdentity}
                size="lg"
              />
            }
            status={<AgentStatus state={sending ? "thinking" : "available"} />}
          />
        }
        greeting={
          <AgentGreeting greeting="One clear next step across Beast">
            The Director looks across your Beast experience, coordinates your specialists, and helps you decide what matters most next. Only approved, owner-scoped summaries are used.
          </AgentGreeting>
        }
        suggestedActions={
          <AgentSuggestedActions
            label="Questions for the Director"
            actions={[
              {
                id: "priority",
                label: "What matters most right now?",
                onSelect: () => setQuestion("What matters most right now, why, and who should help me?"),
              },
              {
                id: "cross-module",
                label: "Check my plans for conflicts",
                onSelect: () => setQuestion("Do my money, education, health, or goal plans conflict?"),
              },
            ]}
          />
        }
        conversation={
          <div className="grid min-w-0 gap-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <button
                ref={historyTriggerRef}
                type="button"
                className="beast-button-secondary lg:hidden"
                aria-controls="director-conversation-history"
                aria-expanded={historyOpen}
                onClick={() => setHistoryOpen(true)}
              >
                Conversation history
              </button>
              <button
                type="button"
                className="beast-button-secondary"
                disabled={sending}
                onClick={() => void createConversation()}
              >
                New Conversation
              </button>
            </div>
            <div className="h-[min(58vh,38rem)] min-h-[24rem] overflow-hidden rounded-2xl border border-white/10 bg-black/10">
              <ProfessionalConversationTimeline
                messages={messages}
                conversationId={activeId || "director-new"}
                streaming={sending}
                followLatestSignal={followLatestSignal}
                scrollPositions={scrollPositions}
                professionalName="Director"
                professionalIdentity={directorConversationIdentity}
              />
            </div>
            <ProfessionalConversationComposer id="director-question">
              <AgentConversationInput
                value={question}
                onChange={setQuestion}
                onSubmit={submit}
                label="Ask the Director"
                placeholder="Ask what changed, what matters most, or which specialist should help…"
                submitLabel="Ask Director"
                busy={sending}
                disabled={loading}
              />
            </ProfessionalConversationComposer>
          </div>
        }
        smartCards={
          latestRecommendation ? (
            <>
              <AgentSmartCard
                eyebrow="One priority"
                title={latestRecommendation.whatChanged}
                description={latestRecommendation.whyItMatters}
                action={
                  <Link className="beast-button-secondary inline-flex" href={latestRecommendation.recommendedHref}>
                    Open {latestRecommendation.recommendedProfessional}
                  </Link>
                }
              >
                <p className="leading-6 text-slate-300">{latestRecommendation.nextStep}</p>
              </AgentSmartCard>
              <AgentSmartCard
                eyebrow="Who contributed"
                title="Specialist and record sources"
                description="Every coordinated recommendation shows its source, date, confidence, and important limitation."
              >
                {latestRecommendation.contributions.length ? (
                  <ul className="grid gap-3">
                    {latestRecommendation.contributions.map((contribution) => (
                      <li key={contribution.professionalId} className="rounded-xl border border-white/10 p-3">
                        <Link className="font-bold text-cyan-200" href={contribution.href}>
                          {contribution.professionalName}
                        </Link>
                        <p className="mt-1 text-sm leading-6 text-slate-300">{contribution.supportingRecord}</p>
                        <p className="mt-1 text-xs text-slate-500">
                          {contribution.source} · {new Date(contribution.date).toLocaleDateString()} · {contribution.confidence} confidence
                        </p>
                        <p className="mt-2 text-xs leading-5 text-amber-100">{contribution.importantLimitation}</p>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="leading-6 text-slate-400">No specialist summary was needed for this answer.</p>
                )}
              </AgentSmartCard>
              <AgentSmartCard
                eyebrow="Why this recommendation"
                title="Limits and conflicts"
              >
                <ul className="grid gap-2 leading-6 text-slate-300">
                  {[...latestRecommendation.conflicts, ...latestRecommendation.limitations].map((item) => (
                    <li key={item}>• {item}</li>
                  ))}
                </ul>
              </AgentSmartCard>
            </>
          ) : (
            <AgentSmartCard
              eyebrow="How this helps"
              title="Ask across modules without losing specialist boundaries"
              description="The Director chooses one priority, explains why, names the specialist who should help, and links you to the right workspace."
            />
          )
        }
        statusArea={
          error ? (
            <AgentErrorState
              title="Director unavailable"
              message={error}
              retryAction={
                <button className="beast-button-secondary" type="button" onClick={() => void refresh()}>
                  Try again
                </button>
              }
            />
          ) : null
        }
        composer={null}
        cardsPlacement="after-conversation"
        cardsLayout="stack"
      />
    </ProfessionalConversationWorkspace>
  );
}
