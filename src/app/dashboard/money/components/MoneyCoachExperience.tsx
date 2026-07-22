"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AgentAvatar,
  AgentConversationInput,
  AgentConversationTimeline,
  AgentEmptyState,
  AgentErrorState,
  AgentExperience,
  AgentGreeting,
  AgentHeader,
  AgentLoadingState,
  AgentSmartCard,
  AgentStatus,
  AgentSuggestedActions,
  type AgentConversationMessage,
} from "@/app/components/agents";
import type { AgentMemoryRecord, InsightStatus } from "@/lib/platform/agents";
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
  const [insightStatuses, setInsightStatuses] = useState<Record<string, InsightStatus>>({});
  const [memoryHydrated, setMemoryHydrated] = useState(false);
  const [localNow, setLocalNow] = useState<Date | null>(null);
  const ownerId = model.insights[0]?.ownerId || "authenticated-owner";
  const memoryKey = `beastagents:beastmoney.money-coach:${ownerId}`;

  useEffect(() => setLocalNow(new Date()), []);

  useEffect(() => {
    try {
      const saved = window.sessionStorage.getItem(memoryKey);
      if (saved) {
        const record = JSON.parse(saved) as AgentMemoryRecord;
        const value = record.value as { title?: string; turns?: typeof turns; insightStatuses?: Record<string, InsightStatus> };
        setConversationTitle(value.title || "Current financial review");
        setTurns(value.turns || []);
        setInsightStatuses(value.insightStatuses || {});
      }
    } catch {
      // Invalid browser session memory is ignored; financial facts are rebuilt from source data.
    } finally {
      setMemoryHydrated(true);
    }
  // Hydrate only when the authenticated owner changes.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [memoryKey]);

  useEffect(() => {
    if (!memoryHydrated) return;
    const timestamp = new Date().toISOString();
    const record: AgentMemoryRecord = {
      id: `money-coach-session:${ownerId}`,
      agentId: "beastmoney.money-coach",
      ownerId,
      scope: "thread",
      key: "conversation-and-insight-review-state",
      value: { title: conversationTitle, turns, insightStatuses },
      purpose: "Resume the member's current Money Coach conversation and review choices.",
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    window.sessionStorage.setItem(memoryKey, JSON.stringify(record));
  }, [conversationTitle, insightStatuses, memoryHydrated, memoryKey, ownerId, turns]);

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
    setTurns((current) => [...current, { id: `money-${timestamp}`, question: value, response: response.text, href: response.href, action: response.action }]);
    if (turns.length === 0) setConversationTitle(value.slice(0, 60));
    setInput("");
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

  const visibleCards = model.cards.filter((card) => !["Dismissed", "Completed", "Archived"].includes(insightStatuses[card.insight.id] || card.insight.status));
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
  const groupFor = (card: (typeof visibleCards)[number]) => {
    if (["Needs Attention", "Upcoming"].includes(card.insight.category) || ["warning", "critical"].includes(card.insight.severity)) return "Needs Attention";
    if (card.insight.category === "Opportunities" || ["funding-sources", "velocity-banking", "income-pots"].includes(card.id)) return "Opportunities";
    return "Progress";
  };
  const reviewGroups = ["Needs Attention", "Progress", "Opportunities"]
    .map((title) => ({ title, cards: visibleCards.filter((card) => groupFor(card) === title) }))
    .filter((group) => group.cards.length > 0);

  return (
    <AgentExperience
      className="border-green-400/25"
      composerPlacement="before-cards"
      cardsPlacement="after-conversation"
      cardsLayout="stack"
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
        ) : null}
      smartCards={
        !loading && !error ? (
          <div id="money-coach-cards" className="grid gap-6">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.14em] text-cyan-200">Supporting evidence</p>
              <h2 className="mt-1 text-xl font-black text-white">Today&apos;s Financial Review</h2>
              <p className="mt-2 text-sm leading-6 text-slate-400">Use these details to support the conversation or open a workspace when you need to go deeper.</p>
            </div>
            <AgentSmartCard
              eyebrow="Recommended next step"
              title={model.primaryRecommendation.title}
              description={model.primaryRecommendation.action}
              action={<Link className="beast-button" href={model.primaryRecommendation.href}>Review recommendation</Link>}
            >
              <details>
                <summary className="cursor-pointer font-bold text-cyan-200">Explain Why</summary>
                <p className="mt-2 leading-6 text-slate-300">{model.primaryRecommendation.explainWhy}</p>
              </details>
            </AgentSmartCard>
            {reviewGroups.map((group) => (
              <section key={group.title} aria-labelledby={`money-review-${group.title.toLowerCase().replace(/\s+/g, "-")}`}>
                <h3 id={`money-review-${group.title.toLowerCase().replace(/\s+/g, "-")}`} className="mb-3 text-lg font-black text-white">{group.title}</h3>
                <div className="grid min-w-0 gap-3 sm:grid-cols-2 xl:grid-cols-3">
                  {group.cards.map((card) => (
                    <AgentSmartCard key={card.id} eyebrow={`${card.insight.priority} priority · ${card.summary}`} title={card.title} description={card.detail} action={<Link className="beast-button-secondary" href={card.href}>Review {card.title}</Link>}>
                      <details><summary className="cursor-pointer font-bold text-cyan-200">Explain Why</summary><p className="mt-2 leading-6 text-slate-300">{card.explainWhy}</p><p className="mt-2 text-sm text-slate-400"><strong>Rule:</strong> {card.insight.provenance.calculationOrRule}</p><p className="mt-1 text-sm text-slate-400"><strong>Limitations:</strong> {card.insight.provenance.limitations.join(" ")}</p></details>
                      <div className="mt-3 flex flex-wrap gap-2"><button type="button" className="beast-button-secondary min-h-11" onClick={() => setInsightStatuses((current) => ({ ...current, [card.insight.id]: "Reviewed" }))}>Mark reviewed</button><button type="button" className="beast-button-secondary min-h-11" onClick={() => setInsightStatuses((current) => ({ ...current, [card.insight.id]: "Dismissed" }))}>Dismiss</button></div>
                    </AgentSmartCard>
                  ))}
                </div>
              </section>
            ))}
          </div>
        ) : null
      }
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
          <div>
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm font-bold text-slate-300">{conversationTitle}</p>
              <button type="button" className="beast-button-secondary min-h-11" onClick={() => { setTurns([]); setConversationTitle("New conversation"); }}>New conversation</button>
            </div>
            <AgentConversationTimeline messages={messages} title="Conversation history" />
          </div>
        )
      }
      composer={
        <div id="money-coach-question" className="rounded-2xl border border-cyan-300/30 bg-gradient-to-br from-cyan-300/10 to-violet-300/10 p-4 shadow-[0_12px_40px_rgba(34,211,238,0.08)] sm:p-5">
          <AgentConversationInput
            value={input}
            onChange={setInput}
            onSubmit={askQuestion}
            label="Ask Money Coach about the current BeastMoney plan"
            placeholder="Ask your Money Coach about bills, debt, retirement, cash flow, income, Velocity, or anything else…"
            disabled={loading || Boolean(error)}
          />
          <p className="mt-3 text-xs leading-5 text-slate-400">{model.safetyNotice}</p>
        </div>
      }
    />
  );
}
