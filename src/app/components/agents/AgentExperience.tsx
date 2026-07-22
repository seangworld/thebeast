"use client";

import {
  type FormEvent,
  type KeyboardEvent,
  type ReactNode,
  useId,
} from "react";

export type AgentStatusState =
  | "available"
  | "loading"
  | "thinking"
  | "streaming"
  | "offline"
  | "error";

export type AgentConversationMessage = {
  id: string;
  role: "user" | "agent" | "system";
  author: string;
  content: ReactNode;
  timestamp?: string;
  streaming?: boolean;
};

export type AgentSuggestion = {
  id: string;
  label: string;
  disabled?: boolean;
  onSelect: () => void;
};

type AgentAvatarProps = {
  name: string;
  imageUrl?: string;
  initials?: string;
  size?: "sm" | "md" | "lg";
};

type AgentStatusProps = {
  state?: AgentStatusState;
  label?: string;
};

type AgentHeaderProps = {
  title: string;
  subtitle?: string;
  avatar?: ReactNode;
  status?: ReactNode;
};

type AgentGreetingProps = {
  greeting: string;
  children?: ReactNode;
};

type AgentContextSummaryProps = {
  title?: string;
  items: readonly ReactNode[];
  emptyState?: ReactNode;
};

type AgentConversationTimelineProps = {
  messages: readonly AgentConversationMessage[];
  title?: string;
  emptyState?: ReactNode;
};

type AgentConversationInputProps = {
  value: string;
  onChange: (value: string) => void;
  onSubmit: (value: string) => void | Promise<void>;
  label?: string;
  placeholder?: string;
  submitLabel?: string;
  disabled?: boolean;
  busy?: boolean;
};

type AgentSuggestedActionsProps = {
  actions: readonly AgentSuggestion[];
  label?: string;
};

type AgentSmartCardProps = {
  title: string;
  eyebrow?: string;
  description?: string;
  children?: ReactNode;
  action?: ReactNode;
};

type AgentThinkingIndicatorProps = {
  label?: string;
};

type AgentLoadingStateProps = {
  label?: string;
  lines?: number;
};

type AgentStreamingResponseAreaProps = {
  children: ReactNode;
  isStreaming: boolean;
  label?: string;
};

type AgentEmptyStateProps = {
  title: string;
  description: string;
  action?: ReactNode;
};

type AgentErrorStateProps = {
  title?: string;
  message: string;
  retryAction?: ReactNode;
};

type AgentExperienceProps = {
  header: ReactNode;
  greeting?: ReactNode;
  contextSummary?: ReactNode;
  smartCards?: ReactNode;
  suggestedActions?: ReactNode;
  conversation: ReactNode;
  composer: ReactNode;
  statusArea?: ReactNode;
  className?: string;
  composerPlacement?: "before-cards" | "after-conversation";
  cardsPlacement?: "before-conversation" | "after-conversation";
  cardsLayout?: "grid" | "stack";
};

const avatarSizes = {
  sm: "h-10 w-10 text-sm",
  md: "h-12 w-12 text-base",
  lg: "h-16 w-16 text-lg",
};

const statusStyles: Record<AgentStatusState, { dot: string; fallback: string }> = {
  available: { dot: "bg-green-400", fallback: "Available" },
  loading: { dot: "animate-pulse bg-sky-300", fallback: "Loading" },
  thinking: { dot: "animate-pulse bg-violet-300", fallback: "Thinking" },
  streaming: { dot: "animate-pulse bg-cyan-300", fallback: "Responding" },
  offline: { dot: "bg-slate-400", fallback: "Offline" },
  error: { dot: "bg-red-400", fallback: "Needs attention" },
};

export function AgentAvatar({
  name,
  imageUrl,
  initials,
  size = "md",
}: AgentAvatarProps) {
  const fallback =
    initials ||
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join("") ||
    "AI";

  return (
    <div
      className={`grid shrink-0 place-items-center overflow-hidden rounded-full border border-white/15 bg-gradient-to-br from-cyan-400/25 to-violet-400/25 font-black text-white ${avatarSizes[size]}`}
      aria-label={`${name} avatar`}
      data-agent-avatar="true"
    >
      {imageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element -- agent avatars may use runtime-provided URLs.
        <img className="h-full w-full object-cover" src={imageUrl} alt="" />
      ) : (
        <span aria-hidden="true">{fallback}</span>
      )}
    </div>
  );
}

export function AgentStatus({
  state = "available",
  label,
}: AgentStatusProps) {
  const style = statusStyles[state];
  return (
    <span
      className="inline-flex min-h-8 items-center gap-2 rounded-full border border-white/10 bg-black/20 px-3 text-xs font-bold text-slate-200"
      role="status"
      aria-live="polite"
      data-agent-status={state}
    >
      <span className={`h-2 w-2 rounded-full ${style.dot}`} aria-hidden="true" />
      {label || style.fallback}
    </span>
  );
}

export function AgentHeader({
  title,
  subtitle,
  avatar,
  status,
}: AgentHeaderProps) {
  return (
    <header className="flex min-w-0 flex-col gap-4 border-b border-white/10 pb-5 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex min-w-0 items-center gap-3">
        {avatar}
        <div className="min-w-0">
          <h1 className="break-words text-2xl font-black text-white">{title}</h1>
          {subtitle ? <p className="mt-1 text-sm text-slate-400">{subtitle}</p> : null}
        </div>
      </div>
      {status ? <div className="shrink-0">{status}</div> : null}
    </header>
  );
}

export function AgentGreeting({ greeting, children }: AgentGreetingProps) {
  const headingId = useId();
  return (
    <section className="grid gap-3" aria-labelledby={headingId}>
      <h2 id={headingId} className="text-xl font-black text-white sm:text-2xl">
        {greeting}
      </h2>
      {children ? <div className="max-w-3xl text-sm leading-7 text-slate-300 sm:text-base">{children}</div> : null}
    </section>
  );
}

export function AgentContextSummary({
  title = "What I found",
  items,
  emptyState,
}: AgentContextSummaryProps) {
  const headingId = useId();
  return (
    <section className="rounded-2xl border border-white/10 bg-black/15 p-4 sm:p-5" aria-labelledby={headingId}>
      <h2 id={headingId} className="text-sm font-black uppercase tracking-[0.14em] text-slate-400">
        {title}
      </h2>
      {items.length > 0 ? (
        <ul className="mt-3 grid gap-2 text-sm leading-6 text-slate-200">
          {items.map((item, index) => (
            <li key={index} className="flex gap-3">
              <span className="text-cyan-300" aria-hidden="true">•</span>
              <span className="min-w-0">{item}</span>
            </li>
          ))}
        </ul>
      ) : (
        emptyState || <p className="mt-3 text-sm text-slate-400">No new context is available yet.</p>
      )}
    </section>
  );
}

export function AgentConversationTimeline({
  messages,
  title = "Conversation",
  emptyState,
}: AgentConversationTimelineProps) {
  const headingId = useId();
  return (
    <section className="grid gap-4" aria-labelledby={headingId}>
      <h2 id={headingId} className="text-lg font-black text-white">{title}</h2>
      {messages.length > 0 ? (
        <ol
          className="grid gap-4"
          role="log"
          aria-live="polite"
          aria-relevant="additions text"
          data-agent-conversation-timeline="true"
        >
          {messages.map((message) => (
            <li
              key={message.id}
              className={`max-w-[92%] rounded-2xl border p-4 sm:max-w-[82%] ${
                message.role === "user"
                  ? "ml-auto border-cyan-300/25 bg-cyan-300/10"
                  : message.role === "system"
                    ? "mx-auto border-white/10 bg-white/5"
                    : "mr-auto border-white/10 bg-[#111827]"
              }`}
              data-message-role={message.role}
            >
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                <span className="text-xs font-black uppercase tracking-[0.12em] text-slate-400">{message.author}</span>
                {message.timestamp ? <time className="text-xs text-slate-500">{message.timestamp}</time> : null}
              </div>
              <div className="mt-2 whitespace-pre-wrap break-words text-sm leading-6 text-slate-100">{message.content}</div>
              {message.streaming ? <span className="sr-only">Response is streaming</span> : null}
            </li>
          ))}
        </ol>
      ) : (
        emptyState || <AgentEmptyState title="Start a conversation" description="Ask a question or choose a suggested action to begin." />
      )}
    </section>
  );
}

export function AgentConversationInput({
  value,
  onChange,
  onSubmit,
  label = "Message your specialist",
  placeholder = "Ask anything…",
  submitLabel = "Send",
  disabled = false,
  busy = false,
}: AgentConversationInputProps) {
  const inputId = useId();

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextValue = value.trim();
    if (!nextValue || disabled || busy) return;
    void onSubmit(nextValue);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
      event.preventDefault();
      event.currentTarget.form?.requestSubmit();
    }
  }

  return (
    <form className="flex min-w-0 flex-col gap-3 rounded-2xl border border-white/10 bg-[#111827] p-3 sm:flex-row sm:items-end" onSubmit={submit}>
      <div className="min-w-0 flex-1">
        <label htmlFor={inputId} className="sr-only">{label}</label>
        <textarea
          id={inputId}
          className="min-h-[52px] w-full resize-y rounded-xl border border-white/10 bg-black/20 px-3 py-3 text-base text-white outline-none placeholder:text-slate-500 focus:border-cyan-300 focus:ring-2 focus:ring-cyan-300/20 disabled:cursor-not-allowed disabled:opacity-60"
          rows={1}
          value={value}
          placeholder={placeholder}
          disabled={disabled || busy}
          aria-busy={busy}
          onChange={(event) => onChange(event.target.value)}
          onKeyDown={handleKeyDown}
        />
      </div>
      <button className="beast-button shrink-0 sm:min-w-[88px]" type="submit" disabled={disabled || busy || value.trim().length === 0}>
        {busy ? "Sending…" : submitLabel}
      </button>
    </form>
  );
}

export function AgentSuggestedActions({
  actions,
  label = "Suggested actions",
}: AgentSuggestedActionsProps) {
  if (actions.length === 0) return null;

  return (
    <section aria-label={label}>
      <ul className="flex flex-wrap gap-2">
        {actions.map((action) => (
          <li key={action.id}>
            <button
              type="button"
              className="beast-button-secondary min-h-11 max-w-full whitespace-normal text-left"
              disabled={action.disabled}
              onClick={action.onSelect}
            >
              {action.label}
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}

export function AgentSmartCard({
  title,
  eyebrow,
  description,
  children,
  action,
}: AgentSmartCardProps) {
  return (
    <article className="flex min-w-0 flex-col rounded-2xl border border-white/10 bg-[#111827] p-4 shadow-lg shadow-black/10">
      {eyebrow ? <p className="text-xs font-black uppercase tracking-[0.14em] text-cyan-300">{eyebrow}</p> : null}
      <h3 className="mt-1 break-words text-base font-black text-white">{title}</h3>
      {description ? <p className="mt-2 text-sm leading-6 text-slate-400">{description}</p> : null}
      {children ? <div className="mt-3 min-w-0 text-sm text-slate-200">{children}</div> : null}
      {action ? <div className="mt-4 pt-1">{action}</div> : null}
    </article>
  );
}

export function AgentThinkingIndicator({
  label = "Thinking…",
}: AgentThinkingIndicatorProps) {
  return (
    <div className="inline-flex min-h-11 items-center gap-3 rounded-2xl border border-white/10 bg-[#111827] px-4 text-sm font-semibold text-slate-300" role="status" aria-live="polite">
      <span className="flex gap-1" aria-hidden="true">
        {[0, 1, 2].map((dot) => (
          <span key={dot} className="h-2 w-2 animate-pulse rounded-full bg-cyan-300" style={{ animationDelay: `${dot * 150}ms` }} />
        ))}
      </span>
      {label}
    </div>
  );
}

export function AgentLoadingState({
  label = "Loading conversation",
  lines = 3,
}: AgentLoadingStateProps) {
  return (
    <div className="grid gap-3 rounded-2xl border border-white/10 bg-[#111827] p-4" role="status" aria-live="polite" aria-label={label} data-agent-loading-state="true">
      <span className="sr-only">{label}</span>
      {Array.from({ length: Math.max(1, lines) }, (_, index) => (
        <span
          key={index}
          className={`h-3 animate-pulse rounded-full bg-white/10 ${index === lines - 1 ? "w-2/3" : "w-full"}`}
          aria-hidden="true"
        />
      ))}
    </div>
  );
}

export function AgentStreamingResponseArea({
  children,
  isStreaming,
  label = "Specialist response",
}: AgentStreamingResponseAreaProps) {
  return (
    <div
      className="min-w-0 whitespace-pre-wrap break-words rounded-2xl border border-white/10 bg-[#111827] p-4 text-sm leading-7 text-slate-100"
      role="status"
      aria-live="polite"
      aria-busy={isStreaming}
      aria-label={label}
      data-agent-streaming-response={isStreaming ? "active" : "complete"}
    >
      {children}
      {isStreaming ? <span className="ml-1 inline-block h-4 w-1 animate-pulse bg-cyan-300 align-middle" aria-hidden="true" /> : null}
    </div>
  );
}

export function AgentEmptyState({
  title,
  description,
  action,
}: AgentEmptyStateProps) {
  return (
    <div className="rounded-2xl border border-dashed border-white/15 bg-black/10 p-5 text-center" data-agent-empty-state="true">
      <h3 className="font-black text-white">{title}</h3>
      <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-slate-400">{description}</p>
      {action ? <div className="mt-4 flex justify-center">{action}</div> : null}
    </div>
  );
}

export function AgentErrorState({
  title = "Something went wrong",
  message,
  retryAction,
}: AgentErrorStateProps) {
  return (
    <div className="rounded-2xl border border-red-400/35 bg-red-400/10 p-4 text-red-100" role="alert" data-agent-error-state="true">
      <h3 className="font-black">{title}</h3>
      <p className="mt-2 text-sm leading-6">{message}</p>
      {retryAction ? <div className="mt-4">{retryAction}</div> : null}
    </div>
  );
}

export function AgentExperience({
  header,
  greeting,
  contextSummary,
  smartCards,
  suggestedActions,
  conversation,
  composer,
  statusArea,
  className = "",
  composerPlacement = "after-conversation",
  cardsPlacement = "before-conversation",
  cardsLayout = "grid",
}: AgentExperienceProps) {
  const cards = smartCards ? (
    <section
      className={cardsLayout === "grid" ? "grid min-w-0 gap-3 sm:grid-cols-2 xl:grid-cols-3" : "grid min-w-0 gap-6"}
      aria-label="Specialist cards"
    >
      {smartCards}
    </section>
  ) : null;
  return (
    <section
      className={`mx-auto grid w-full max-w-5xl min-w-0 gap-6 rounded-2xl border border-white/10 bg-[#1a1f2b] p-4 shadow-[0_18px_60px_rgba(0,0,0,0.22)] sm:p-6 ${className}`}
      data-agent-experience="true"
    >
      {header}
      {greeting}
      {contextSummary}
      {composerPlacement === "before-cards" ? composer : null}
      {composerPlacement === "before-cards" ? suggestedActions : null}
      {cardsPlacement === "before-conversation" ? cards : null}
      {composerPlacement === "after-conversation" ? suggestedActions : null}
      <div className="border-t border-white/10 pt-6">{conversation}</div>
      {cardsPlacement === "after-conversation" ? cards : null}
      {statusArea}
      {composerPlacement === "after-conversation" ? composer : null}
    </section>
  );
}
