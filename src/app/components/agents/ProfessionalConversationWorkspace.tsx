"use client";

import type { MutableRefObject, ReactNode } from "react";
import { useConversationScroll } from "./useConversationScroll";
import type { AgentConversationMessage } from "./AgentExperience";

type ProfessionalConversationWorkspaceProps = {
  history: ReactNode;
  children: ReactNode;
  historyOpen: boolean;
  onCloseHistory: () => void;
  historyDialogRef: React.RefObject<HTMLDivElement>;
  professionalName: string;
  drawerId: string;
};

export function ProfessionalConversationWorkspace({
  history,
  children,
  historyOpen,
  onCloseHistory,
  historyDialogRef,
  professionalName,
  drawerId,
}: ProfessionalConversationWorkspaceProps) {
  return (
    <div
      className="mx-auto grid w-full max-w-[1600px] min-w-0 gap-4 lg:grid-cols-[18rem_minmax(0,1fr)]"
      data-professional-conversation-workspace="true"
    >
      <div className="sticky top-4 hidden h-[calc(100vh-8rem)] min-h-[36rem] overflow-hidden rounded-2xl border border-white/10 shadow-[0_20px_70px_rgba(0,0,0,0.24)] lg:block">
        {history}
      </div>
      {children}
      {historyOpen ? (
        <div
          className="fixed inset-0 z-50 bg-black/70 p-3 lg:hidden"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) onCloseHistory();
          }}
        >
          <div
            ref={historyDialogRef}
            id={drawerId}
            className="ml-auto h-full max-h-[calc(100vh-1.5rem)] w-full max-w-sm overflow-hidden rounded-2xl border border-white/15 bg-slate-950 shadow-2xl"
            role="dialog"
            aria-modal="true"
            aria-label={`${professionalName} conversations`}
          >
            {history}
          </div>
        </div>
      ) : null}
    </div>
  );
}

type ProfessionalConversationTimelineProps = {
  messages: readonly AgentConversationMessage[];
  conversationId: string;
  streaming: boolean;
  followLatestSignal?: number;
  scrollPositions: MutableRefObject<Map<string, number>>;
  professionalName: string;
};

export function ProfessionalConversationTimeline({
  messages,
  conversationId,
  streaming,
  followLatestSignal,
  scrollPositions,
  professionalName,
}: ProfessionalConversationTimelineProps) {
  const {
    contentRef,
    handleScroll,
    handleTouchMove,
    handleTouchStart,
    handleWheel,
    scrollRef,
    scrollToLatest,
    showJumpToLatest,
  } = useConversationScroll({
    conversationId,
    messageCount: messages.length,
    streaming,
    followLatestSignal,
    scrollPositions,
  });
  const headingId = `${professionalName.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-conversation-heading`;

  return (
    <div className="relative min-h-0 flex-1">
      <div
        ref={scrollRef}
        className="h-full overflow-y-auto overscroll-contain"
        data-professional-active-scroll="true"
        onScroll={handleScroll}
        onWheel={handleWheel}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
      >
        <section
          ref={contentRef}
          className="mx-auto w-full max-w-3xl px-1 pb-8 sm:px-4"
          aria-labelledby={headingId}
        >
          <h2 id={headingId} className="mb-2 text-lg font-black text-white">
            Conversation
          </h2>
          <ol
            className="divide-y divide-white/[0.07]"
            role="log"
            aria-live="polite"
            aria-relevant="additions text"
            data-agent-conversation-timeline="true"
          >
            {messages.map((message) => (
              <li
                key={message.id}
                className="py-6 first:pt-4 sm:py-8"
                data-message-role={message.role}
              >
                <div className="flex items-baseline justify-between gap-4">
                  <h3
                    className={`text-sm font-black ${
                      message.role === "agent"
                        ? "text-white"
                        : message.role === "user"
                          ? "text-cyan-200"
                          : "text-slate-300"
                    }`}
                  >
                    {message.author}
                  </h3>
                  {message.timestamp ? (
                    <time className="shrink-0 text-xs text-slate-500">
                      {message.timestamp}
                    </time>
                  ) : null}
                </div>
                <div className="mt-3 break-words text-[15px] leading-7 text-slate-200 [&_a]:font-bold [&_a]:text-cyan-200 [&_a]:underline-offset-4 [&_a:hover]:underline [&_details]:mt-4 [&_li]:my-1 [&_ol]:my-4 [&_ol]:list-decimal [&_ol]:pl-6 [&_p+p]:mt-4 [&_table]:my-5 [&_table]:w-full [&_table]:border-collapse [&_td]:border-b [&_td]:border-white/10 [&_td]:px-3 [&_td]:py-2 [&_th]:border-b [&_th]:border-white/15 [&_th]:px-3 [&_th]:py-2 [&_th]:text-left [&_ul]:my-4 [&_ul]:list-disc [&_ul]:pl-6">
                  {message.content}
                </div>
                {message.streaming ? (
                  <span className="sr-only">Response is streaming</span>
                ) : null}
              </li>
            ))}
          </ol>
        </section>
      </div>
      {showJumpToLatest ? (
        <button
          type="button"
          className="absolute bottom-3 left-1/2 min-h-11 -translate-x-1/2 rounded-full border border-cyan-300/30 bg-slate-950/95 px-4 py-2 text-xs font-black text-cyan-100 shadow-xl backdrop-blur transition hover:border-cyan-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan-300"
          onClick={() => scrollToLatest("smooth")}
          aria-label={`Jump to latest ${professionalName} response`}
        >
          Jump to Latest <span aria-hidden="true">↓</span>
        </button>
      ) : null}
    </div>
  );
}

export function ProfessionalConversationComposer({
  id,
  children,
}: {
  id: string;
  children: ReactNode;
}) {
  return (
    <div
      id={id}
      className="mx-auto w-full max-w-3xl [&_form]:rounded-2xl [&_form]:border-white/15 [&_form]:bg-[#111827] [&_form]:p-2 [&_form]:shadow-[0_12px_35px_rgba(0,0,0,0.18)] [&_textarea]:min-h-[44px] [&_textarea]:resize-none [&_textarea]:border-0 [&_textarea]:bg-transparent [&_textarea]:px-3 [&_textarea]:py-2.5 [&_textarea]:focus:ring-0 [&_button]:min-h-10 [&_button]:rounded-xl [&_button]:border [&_button]:border-white/10 [&_button]:bg-white/10 [&_button]:px-4 [&_button]:text-sm [&_button]:shadow-none [&_button:hover]:bg-white/15"
    >
      {children}
    </div>
  );
}
