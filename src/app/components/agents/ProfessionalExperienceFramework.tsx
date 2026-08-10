"use client";

import Link from "next/link";
import type { ReactNode, RefObject } from "react";
import { AgentExperience } from "./AgentExperience";
import { ProfessionalConversationWorkspace } from "./ProfessionalConversationWorkspace";

export const professionalExperienceCapabilities = [
  "greeting",
  "conversation",
  "knowledge",
  "conversation-history",
  "memory",
  "time-awareness",
  "recommendations",
  "supporting-workspaces",
] as const;

export type ProfessionalExperienceCapability =
  (typeof professionalExperienceCapabilities)[number];

export type ProfessionalTimeAwarenessItem = {
  id: string;
  label: string;
  value: string;
  evidence?: string;
};

export type ProfessionalMemoryTimelineItem = {
  id: string;
  title: string;
  summary: string;
  occurredAt?: string;
  source?: string;
};

export type ProfessionalSupportingWorkspace = {
  id: string;
  label: string;
  description: string;
  href: string;
};

export type ProfessionalConversationHistoryItem = {
  id: string;
  title: string;
  updatedAt: string;
  messageCount: number;
  pinned: boolean;
  archived: boolean;
};

type ProfessionalExperienceFrameworkProps = {
  professionalId: string;
  professionalName: string;
  drawerId: string;
  history: ReactNode;
  historyOpen: boolean;
  onCloseHistory: () => void;
  historyDialogRef: RefObject<HTMLDivElement>;
  header: ReactNode;
  greeting: ReactNode;
  conversation: ReactNode;
  knowledge: ReactNode;
  timeAwareness: ReactNode;
  memory: ReactNode;
  recommendations: ReactNode;
  supportingWorkspaces: ReactNode;
  contextSummary?: ReactNode;
  statusArea?: ReactNode;
  safety?: ReactNode;
  className?: string;
};

function CapabilityRegion({
  capability,
  professionalName,
  children,
}: {
  capability: ProfessionalExperienceCapability;
  professionalName: string;
  children: ReactNode;
}) {
  return (
    <section
      className="min-w-0"
      aria-label={`${professionalName} ${capability.replaceAll("-", " ")}`}
      data-professional-capability={capability}
    >
      {children}
    </section>
  );
}

export function ProfessionalExperienceFramework({
  professionalId,
  professionalName,
  drawerId,
  history,
  historyOpen,
  onCloseHistory,
  historyDialogRef,
  header,
  greeting,
  conversation,
  knowledge,
  timeAwareness,
  memory,
  recommendations,
  supportingWorkspaces,
  contextSummary,
  statusArea,
  safety,
  className = "",
}: ProfessionalExperienceFrameworkProps) {
  return (
    <div
      data-professional-experience-framework={professionalId}
      data-professional-capabilities={professionalExperienceCapabilities.join(
        " "
      )}
    >
      <ProfessionalConversationWorkspace
        history={
          <CapabilityRegion
            capability="conversation-history"
            professionalName={professionalName}
          >
            {history}
          </CapabilityRegion>
        }
        historyOpen={historyOpen}
        onCloseHistory={onCloseHistory}
        historyDialogRef={historyDialogRef}
        professionalName={professionalName}
        drawerId={drawerId}
      >
        <AgentExperience
          className={`max-w-none border-white/10 bg-[#141a24] ${className}`}
          cardsPlacement="after-conversation"
          cardsLayout="stack"
          header={header}
          greeting={
            <CapabilityRegion
              capability="greeting"
              professionalName={professionalName}
            >
              {greeting}
            </CapabilityRegion>
          }
          contextSummary={contextSummary}
          suggestedActions={null}
          conversation={
            <CapabilityRegion
              capability="conversation"
              professionalName={professionalName}
            >
              {conversation}
            </CapabilityRegion>
          }
          smartCards={
            <div className="grid min-w-0 gap-5">
              <CapabilityRegion
                capability="knowledge"
                professionalName={professionalName}
              >
                {knowledge}
              </CapabilityRegion>
              <div className="grid min-w-0 gap-4 xl:grid-cols-2">
                <CapabilityRegion
                  capability="time-awareness"
                  professionalName={professionalName}
                >
                  {timeAwareness}
                </CapabilityRegion>
                <CapabilityRegion
                  capability="memory"
                  professionalName={professionalName}
                >
                  {memory}
                </CapabilityRegion>
              </div>
              <CapabilityRegion
                capability="recommendations"
                professionalName={professionalName}
              >
                {recommendations}
              </CapabilityRegion>
              <CapabilityRegion
                capability="supporting-workspaces"
                professionalName={professionalName}
              >
                {supportingWorkspaces}
              </CapabilityRegion>
              {safety}
            </div>
          }
          composer={null}
          statusArea={statusArea}
        />
      </ProfessionalConversationWorkspace>
    </div>
  );
}

export function ProfessionalExperienceBoundary({
  professionalId,
  professionalName,
  children,
}: {
  professionalId: string;
  professionalName: string;
  children: ReactNode;
}) {
  return (
    <section
      className="min-w-0"
      aria-label={`${professionalName} professional experience`}
      data-professional-experience-framework={professionalId}
      data-professional-capabilities={professionalExperienceCapabilities.join(
        " "
      )}
    >
      {children}
    </section>
  );
}

export function ProfessionalTimeAwareness({
  title,
  description,
  items,
  unavailableMessage,
}: {
  title: string;
  description: string;
  items: readonly ProfessionalTimeAwarenessItem[];
  unavailableMessage: string;
}) {
  return (
    <section
      className="h-full rounded-2xl border border-white/10 bg-black/10 p-4"
      data-professional-capability="time-awareness"
    >
      <p className="text-xs font-black uppercase tracking-[0.14em] text-cyan-300">
        Time awareness
      </p>
      <h2 className="mt-2 text-lg font-black text-white">{title}</h2>
      <p className="mt-2 text-sm leading-6 text-slate-400">{description}</p>
      {items.length ? (
        <dl className="mt-4 grid gap-3">
          {items.map((item) => (
            <div
              key={item.id}
              className="rounded-xl border border-white/10 bg-white/[0.03] p-3"
            >
              <dt className="text-xs font-black uppercase tracking-wide text-slate-500">
                {item.label}
              </dt>
              <dd className="mt-1 text-sm font-bold text-white">
                {item.value}
              </dd>
              {item.evidence ? (
                <dd className="mt-1 text-xs leading-5 text-slate-400">
                  {item.evidence}
                </dd>
              ) : null}
            </div>
          ))}
        </dl>
      ) : (
        <p className="mt-4 rounded-xl border border-dashed border-white/10 p-3 text-sm leading-6 text-slate-400">
          {unavailableMessage}
        </p>
      )}
    </section>
  );
}

export function ProfessionalMemoryTimeline({
  professionalName,
  items,
  emptyState,
}: {
  professionalName: string;
  items: readonly ProfessionalMemoryTimelineItem[];
  emptyState: string;
}) {
  return (
    <section
      className="h-full rounded-2xl border border-white/10 bg-black/10 p-4"
      data-professional-capability="memory"
    >
      <p className="text-xs font-black uppercase tracking-[0.14em] text-cyan-300">
        Relationship memory
      </p>
      <h2 className="mt-2 text-lg font-black text-white">
        What {professionalName} remembers
      </h2>
      <p className="mt-2 text-sm leading-6 text-slate-400">
        Only persisted, owner-scoped facts and conversation summaries appear
        here. Missing history is never inferred.
      </p>
      {items.length ? (
        <ol className="mt-4 grid gap-3">
          {items.map((item) => (
            <li
              key={item.id}
              className="rounded-xl border border-white/10 bg-white/[0.03] p-3"
            >
              <p className="font-bold text-white">{item.title}</p>
              <p className="mt-1 text-sm leading-6 text-slate-300">
                {item.summary}
              </p>
              {item.occurredAt || item.source ? (
                <p className="mt-2 text-xs leading-5 text-slate-500">
                  {[item.occurredAt, item.source].filter(Boolean).join(" · ")}
                </p>
              ) : null}
            </li>
          ))}
        </ol>
      ) : (
        <p className="mt-4 rounded-xl border border-dashed border-white/10 p-3 text-sm leading-6 text-slate-400">
          {emptyState}
        </p>
      )}
    </section>
  );
}

export function ProfessionalSupportingWorkspaces({
  professionalName,
  workspaces,
}: {
  professionalName: string;
  workspaces: readonly ProfessionalSupportingWorkspace[];
}) {
  return (
    <section
      className="rounded-2xl border border-white/10 bg-black/10 p-4"
      data-professional-capability="supporting-workspaces"
    >
      <p className="text-xs font-black uppercase tracking-[0.14em] text-cyan-300">
        Supporting workspaces
      </p>
      <h2 className="mt-2 text-lg font-black text-white">
        Continue with {professionalName}
      </h2>
      <p className="mt-2 text-sm leading-6 text-slate-400">
        Conversation remains primary. These workspaces hold the records and
        planning tools that support it.
      </p>
      <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {workspaces.map((workspace) => (
          <Link
            key={workspace.id}
            href={workspace.href}
            className="rounded-xl border border-white/10 bg-white/[0.03] p-3 transition hover:border-cyan-300/35 hover:bg-cyan-300/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan-300"
          >
            <span className="font-black text-white">{workspace.label}</span>
            <span className="mt-1 block text-sm leading-6 text-slate-400">
              {workspace.description}
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}

export function ProfessionalConversationHistory({
  professionalName,
  threads,
  activeThreadId,
  searchValue,
  loading = false,
  error,
  onSearchChange,
  onNewConversation,
  onOpen,
  onRename,
  onPin,
  onArchive,
  onDelete,
  onClose,
  footer,
}: {
  professionalName: string;
  threads: readonly ProfessionalConversationHistoryItem[];
  activeThreadId: string;
  searchValue: string;
  loading?: boolean;
  error?: string;
  onSearchChange: (value: string) => void;
  onNewConversation: () => void;
  onOpen: (thread: ProfessionalConversationHistoryItem) => void;
  onRename: (thread: ProfessionalConversationHistoryItem) => void;
  onPin: (thread: ProfessionalConversationHistoryItem) => void;
  onArchive: (thread: ProfessionalConversationHistoryItem) => void;
  onDelete: (thread: ProfessionalConversationHistoryItem) => void;
  onClose: () => void;
  footer?: ReactNode;
}) {
  const groups = [
    {
      id: "pinned",
      label: "Pinned conversations",
      items: threads.filter((thread) => thread.pinned && !thread.archived),
    },
    {
      id: "recent",
      label: "Recent conversations",
      items: threads.filter((thread) => !thread.pinned && !thread.archived),
    },
    {
      id: "archived",
      label: "Archived",
      items: threads.filter((thread) => thread.archived),
    },
  ];
  const idPrefix = professionalName.toLowerCase().replace(/[^a-z0-9]+/g, "-");

  return (
    <aside
      className="flex h-full min-h-0 flex-col bg-[#0d131e]"
      aria-label={`${professionalName} conversation navigation`}
      data-professional-conversation-history="true"
      data-professional-capability="conversation-history"
    >
      <div className="flex items-center justify-between gap-3 border-b border-white/10 p-4">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.16em] text-cyan-300">
            {professionalName}
          </p>
          <h2 className="mt-1 text-base font-black text-white">
            Conversations
          </h2>
        </div>
        <button
          type="button"
          className="text-sm font-bold text-slate-300"
          onClick={onClose}
          aria-label={`Close ${professionalName} conversation history`}
        >
          Close
        </button>
      </div>
      <div className="p-3">
        <button
          type="button"
          data-analytics-event="conversation_created"
          data-analytics-action="new_conversation"
          className="beast-button flex min-h-11 w-full items-center justify-center gap-2"
          disabled={loading}
          onClick={onNewConversation}
        >
          <span aria-hidden="true">＋</span>
          {loading ? "Loading conversations…" : "New conversation"}
        </button>
        {error ? (
          <p
            className="mt-3 rounded-lg border border-red-300/20 bg-red-300/10 p-2 text-xs leading-5 text-red-100"
            role="alert"
          >
            {error}
          </p>
        ) : null}
        <label className="mt-3 block text-xs font-bold text-slate-300">
          <span className="sr-only">
            Search {professionalName} conversations
          </span>
          <span className="relative block">
            <span
              className="pointer-events-none absolute left-3 top-3 text-slate-500"
              aria-hidden="true"
            >
              ⌕
            </span>
            <input
              className="min-h-11 w-full rounded-xl border border-white/10 bg-slate-950 pl-9 pr-3 text-sm text-white outline-none placeholder:text-slate-600 focus:border-cyan-300 focus:ring-2 focus:ring-cyan-300/20"
              value={searchValue}
              onChange={(event) => onSearchChange(event.target.value)}
              placeholder="Search"
            />
          </span>
        </label>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto px-3 pb-3">
        <div className="grid gap-5">
          {groups.map((group) =>
            group.items.length ? (
              <section
                key={group.id}
                aria-labelledby={`${idPrefix}-${group.id}-conversations`}
              >
                <h3
                  id={`${idPrefix}-${group.id}-conversations`}
                  className="px-2 text-[10px] font-black uppercase tracking-[0.16em] text-slate-500"
                >
                  {group.label}
                </h3>
                <div className="mt-2 grid gap-1">
                  {group.items.map((thread) => (
                    <article
                      key={thread.id}
                      className={`group rounded-xl border px-2 py-2.5 ${
                        thread.id === activeThreadId
                          ? "border-cyan-300/35 bg-cyan-300/10"
                          : "border-transparent hover:border-white/10 hover:bg-white/[0.04]"
                      }`}
                      aria-current={
                        thread.id === activeThreadId ? "page" : undefined
                      }
                    >
                      <button
                        type="button"
                        data-analytics-event="conversation_resumed"
                        data-analytics-action="open_conversation"
                        className="w-full rounded-md text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan-300"
                        onClick={() => onOpen(thread)}
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
                          onClick={() => onRename(thread)}
                        >
                          Rename
                        </button>
                        <button
                          type="button"
                          className="text-[11px] font-bold text-cyan-200"
                          onClick={() => onPin(thread)}
                        >
                          {thread.pinned ? "Unpin" : "Pin"}
                        </button>
                        <button
                          type="button"
                          className="text-[11px] font-bold text-cyan-200"
                          onClick={() => onArchive(thread)}
                        >
                          {thread.archived ? "Restore" : "Archive"}
                        </button>
                        <button
                          type="button"
                          className="text-[11px] font-bold text-red-200"
                          onClick={() => onDelete(thread)}
                        >
                          Delete
                        </button>
                      </div>
                    </article>
                  ))}
                </div>
              </section>
            ) : null
          )}
          {!loading && threads.length === 0 ? (
            <p className="py-4 text-sm text-slate-400">
              No matching conversations.
            </p>
          ) : null}
        </div>
      </div>
      {footer ? <div className="border-t border-white/10">{footer}</div> : null}
    </aside>
  );
}
