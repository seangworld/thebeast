"use client";

import {
  beastAdminMessageCategoryLabels,
  getBeastAdminMessageThreadStateLabel,
  type BeastAdminPrivateThread,
} from "@/lib/beastAdminMessaging";

function formatMessageDate(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export function BeastAdminPrivateMessageThread({
  thread,
  audience,
}: {
  thread: BeastAdminPrivateThread;
  audience: "admin" | "member";
}) {
  return (
    <section
      className="min-w-0 rounded-2xl border border-[#2a3242] bg-[#0b1220]"
      aria-label="Private administrative conversation"
    >
      <header className="border-b border-[#2a3242] p-4 sm:p-5">
        <div className="flex min-w-0 flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-black uppercase tracking-wide text-sky-200">
              Private account and support communication
            </p>
            <h2 className="mt-2 break-words text-xl font-black text-white">
              {audience === "admin"
                ? thread.memberName
                : "Beast Administration"}
            </h2>
            {audience === "admin" ? (
              <p className="mt-1 break-all text-xs text-[#9aa7b8]">
                {thread.memberEmail || "Login email not provided"}
              </p>
            ) : null}
          </div>
          <div className="flex flex-wrap gap-2">
            <span className="rounded-full border border-sky-300/30 bg-sky-300/10 px-2.5 py-1 text-xs font-black text-sky-100">
              {beastAdminMessageCategoryLabels[thread.category]}
            </span>
            <span className="rounded-full border border-[#344052] px-2.5 py-1 text-xs font-black text-[#c7cfdb]">
              {getBeastAdminMessageThreadStateLabel(thread, audience)}
            </span>
          </div>
        </div>
      </header>

      <ol className="grid min-h-48 gap-4 p-4 sm:p-5">
        {thread.messages.length ? (
          thread.messages.map((message) => {
            const sentByAudience =
              audience === "admin"
                ? message.senderRole === "admin"
                : message.senderRole === "member";
            return (
              <li
                key={message.id}
                className={`flex min-w-0 ${
                  sentByAudience ? "justify-end" : "justify-start"
                }`}
              >
                <article
                  className={`max-w-[min(88%,44rem)] min-w-0 rounded-2xl border p-4 ${
                    sentByAudience
                      ? "border-amber-300/30 bg-amber-300/10"
                      : "border-[#344052] bg-[#111827]"
                  }`}
                >
                  <p className="text-[11px] font-black uppercase tracking-wide text-[#9aa7b8]">
                    {message.senderRole === "admin"
                      ? "Beast Administration"
                      : audience === "admin"
                        ? thread.memberName
                        : "You"}
                  </p>
                  <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-6 text-white">
                    {message.body}
                  </p>
                  <div className="mt-3 flex flex-wrap items-center gap-2 text-[11px] font-bold text-[#7f8da3]">
                    <span>{formatMessageDate(message.createdAt)}</span>
                    {sentByAudience ? (
                      <span>{message.readAt ? "Read" : "Sent"}</span>
                    ) : null}
                    <span>Editing unavailable</span>
                  </div>
                </article>
              </li>
            );
          })
        ) : (
          <li className="rounded-xl border border-dashed border-[#344052] p-8 text-center">
            <p className="font-black text-white">No messages yet</p>
            <p className="mt-2 text-sm leading-6 text-[#9aa7b8]">
              Start a private account or support conversation below.
            </p>
          </li>
        )}
      </ol>
    </section>
  );
}
