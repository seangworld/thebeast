"use client";

import {
  useEffect,
  useRef,
  type MutableRefObject,
  type ReactNode,
} from "react";
import { useConversationScroll } from "./useConversationScroll";
import type { AgentConversationMessage } from "./AgentExperience";
import {
  ProfessionalConversationAvatar,
  type ProfessionalConversationAccent,
  type ProfessionalConversationIdentity,
} from "./ProfessionalConversationIdentity";

const professionalBubbleAccentClasses: Record<
  ProfessionalConversationAccent,
  string
> = {
  money: "border-cyan-300/15 bg-cyan-300/[0.045]",
  learning: "border-indigo-300/15 bg-indigo-300/[0.045]",
  health: "border-rose-300/15 bg-rose-300/[0.045]",
  neutral: "border-white/10 bg-white/[0.045]",
};

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
            className="beast-drawer ml-auto h-full w-full max-w-sm overflow-hidden rounded-beast-lg"
            role="dialog"
            tabIndex={-1}
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
  professionalIdentity?: ProfessionalConversationIdentity;
};

export function ProfessionalConversationTimeline({
  messages,
  conversationId,
  streaming,
  followLatestSignal,
  scrollPositions,
  professionalName,
  professionalIdentity,
}: ProfessionalConversationTimelineProps) {
  const headingRef = useRef<HTMLHeadingElement>(null);
  const previousConversationIdRef = useRef(conversationId);
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

  useEffect(() => {
    if (previousConversationIdRef.current !== conversationId) {
      previousConversationIdRef.current = conversationId;
      headingRef.current?.focus({ preventScroll: true });
    }
  }, [conversationId]);

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
          <h2
            ref={headingRef}
            id={headingId}
            tabIndex={-1}
            className="mb-2 text-lg font-black text-white outline-none focus-visible:ring-2 focus-visible:ring-cyan-300"
          >
            Conversation
          </h2>
          <ol
            className="grid gap-5"
            role="log"
            aria-live="polite"
            aria-relevant="additions text"
            data-agent-conversation-timeline="true"
          >
            {messages.map((message) => (
              <li
                key={message.id}
                className={`min-w-0 first:pt-3 ${
                  message.role === "user" ? "flex justify-end" : ""
                }`}
                data-message-role={message.role}
                aria-label={`Message from ${
                  message.role === "agent" && professionalIdentity
                    ? professionalIdentity.name
                    : message.author
                }`}
              >
                <div
                  className={`flex min-w-0 items-start gap-3 ${
                    message.role === "user"
                      ? "max-w-[min(88%,42rem)] flex-row-reverse"
                      : "w-full"
                  }`}
                >
                  {message.role === "agent" && professionalIdentity ? (
                    <div className="pt-0.5">
                      <ProfessionalConversationAvatar
                        identity={professionalIdentity}
                      />
                    </div>
                  ) : null}
                  <div
                    className={`min-w-0 ${
                      message.role === "user" ? "flex-1" : "w-full"
                    }`}
                  >
                    <div
                      className={`flex flex-wrap items-baseline gap-x-2 gap-y-1 ${
                        message.role === "user"
                          ? "justify-end"
                          : "justify-between"
                      }`}
                    >
                      <h3
                        className={`flex min-w-0 flex-wrap items-baseline gap-x-2 text-sm font-black ${
                          message.role === "agent"
                            ? "text-white"
                            : message.role === "user"
                              ? "text-cyan-200"
                              : "text-slate-300"
                        }`}
                      >
                        {message.role === "agent" && professionalIdentity ? (
                          <>
                            <span>{professionalIdentity.name}</span>
                            <span className="text-xs font-semibold text-slate-400">
                              {professionalIdentity.role}
                            </span>
                          </>
                        ) : (
                          message.author
                        )}
                      </h3>
                      {message.timestamp ? (
                        <time className="shrink-0 text-xs text-slate-500">
                          {message.timestamp}
                        </time>
                      ) : null}
                    </div>
                    <div
                      className={`mt-2 min-w-0 max-w-full overflow-x-auto break-words rounded-2xl border px-4 py-3 text-[15px] leading-7 text-slate-200 sm:px-5 sm:py-4 ${
                        message.role === "agent"
                          ? `rounded-tl-md ${
                              professionalBubbleAccentClasses[
                                professionalIdentity?.accent || "neutral"
                              ]
                            }`
                          : message.role === "user"
                            ? "rounded-tr-md border-cyan-300/20 bg-cyan-300/10"
                            : "border-white/10 bg-black/15 text-slate-300"
                      } [&_a]:font-bold [&_a]:text-cyan-200 [&_a]:underline-offset-4 [&_a:hover]:underline [&_details]:mt-4 [&_li]:my-1 [&_ol]:my-4 [&_ol]:list-decimal [&_ol]:pl-6 [&_p+p]:mt-4 [&_table]:my-5 [&_table]:w-full [&_table]:border-collapse [&_td]:border-b [&_td]:border-white/10 [&_td]:px-3 [&_td]:py-2 [&_th]:border-b [&_th]:border-white/15 [&_th]:px-3 [&_th]:py-2 [&_th]:text-left [&_ul]:my-4 [&_ul]:list-disc [&_ul]:pl-6`}
                      data-professional-accent={
                        message.role === "agent"
                          ? professionalIdentity?.accent
                          : undefined
                      }
                    >
                      {message.content}
                    </div>
                    {message.streaming ? (
                      <span className="sr-only">Response is streaming</span>
                    ) : null}
                  </div>
                </div>
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
