"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import {
  DashboardCard,
  SectionHeader,
} from "@/app/components/design/DashboardPrimitives";
import {
  BEAST_ADMIN_MESSAGE_UNREAD_EVENT,
  beastAdminMessageCategories,
  beastAdminMessageCategoryLabels,
  normalizeBeastAdminMessageBody,
  normalizeBeastAdminPrivateThread,
  type BeastAdminMessageCategory,
  type BeastAdminPrivateThread,
} from "@/lib/beastAdminMessaging";
import { createClient } from "@/lib/supabase/client";
import { BeastAdminPrivateMessageThread } from "./BeastAdminPrivateMessageThread";

function humanizeMessagingError(error: unknown) {
  const message =
    error && typeof error === "object" && "message" in error
      ? String(error.message)
      : "";
  if (/rate limit/i.test(message)) {
    return "You’ve sent several messages quickly. Wait a moment and try again.";
  }
  if (/suspended/i.test(message)) {
    return "This account is suspended and cannot send private messages.";
  }
  if (/safe plain text|between 1 and 5000/i.test(message)) {
    return "Use plain text between 1 and 5,000 characters.";
  }
  if (/function .* does not exist|schema cache/i.test(message)) {
    return "Private messaging is not connected in this environment.";
  }
  return "BeastOS could not complete the private message request.";
}

function announceUnreadChange() {
  window.dispatchEvent(new CustomEvent(BEAST_ADMIN_MESSAGE_UNREAD_EVENT));
}

export function BeastMemberAdminMessagesWorkspace() {
  const router = useRouter();
  const [thread, setThread] = useState<BeastAdminPrivateThread | null>(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [pendingAction, setPendingAction] = useState("");
  const [body, setBody] = useState("");
  const [category, setCategory] =
    useState<BeastAdminMessageCategory>("support");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let active = true;
    async function loadThread() {
      setLoading(true);
      setError("");
      try {
        const supabase = createClient();
        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser();
        if (userError || !user) throw userError || new Error("Authentication required.");
        const { data: profile, error: profileError } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", user.id)
          .maybeSingle();
        if (profileError) throw profileError;
        if (profile?.role === "admin") {
          router.replace("/dashboard/admin/messages");
          return;
        }
        const { data, error: loadError } = await supabase.rpc(
          "get_beast_member_admin_thread"
        );
        if (loadError) throw loadError;
        const normalized =
          data === null ? null : normalizeBeastAdminPrivateThread(data);
        if (data !== null && !normalized) {
          throw new Error("Private message data was invalid.");
        }
        if (!active) return;
        setThread(normalized);
        if (normalized?.unreadCount) {
          const { error: readError } = await supabase.rpc(
            "mark_beast_admin_message_thread_read",
            { selected_thread_id: normalized.id }
          );
          if (!readError && active) {
            setThread({ ...normalized, unreadCount: 0 });
            announceUnreadChange();
          }
        }
      } catch (loadError) {
        if (active) {
          setThread(null);
          setError(humanizeMessagingError(loadError));
        }
      } finally {
        if (active) setLoading(false);
      }
    }
    void loadThread();
    return () => {
      active = false;
    };
  }, [refreshKey, router]);

  async function sendMessage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const normalizedBody = normalizeBeastAdminMessageBody(body);
    if (!normalizedBody) {
      setError("Use safe plain text between 1 and 5,000 characters.");
      return;
    }
    setSending(true);
    setError("");
    setSuccess("");
    try {
      const supabase = createClient();
      const { data, error: sendError } = await supabase.rpc(
        "send_beast_admin_message",
        {
          selected_member_id: null,
          selected_body: normalizedBody,
          selected_category: category,
          selected_link_type: null,
          selected_link_id: null,
        }
      );
      if (sendError) throw sendError;
      const nextThread = normalizeBeastAdminPrivateThread(data);
      if (!nextThread) throw new Error("Private message data was invalid.");
      setThread(nextThread);
      setBody("");
      setSuccess("Your private message was sent to Beast Administration.");
      announceUnreadChange();
    } catch (sendError) {
      setError(humanizeMessagingError(sendError));
    } finally {
      setSending(false);
    }
  }

  async function updateArchive(action: "member_archive" | "member_reopen") {
    if (!thread) return;
    setPendingAction(action);
    setError("");
    setSuccess("");
    try {
      const supabase = createClient();
      const { data, error: actionError } = await supabase.rpc(
        "update_beast_admin_message_thread",
        {
          selected_thread_id: thread.id,
          selected_action: action,
          selected_link_type: null,
          selected_link_id: null,
        }
      );
      if (actionError) throw actionError;
      const nextThread = normalizeBeastAdminPrivateThread(data);
      if (!nextThread) throw new Error("Private message data was invalid.");
      setThread(nextThread);
      setSuccess(
        action === "member_archive"
          ? "The conversation was archived. Its history remains available."
          : "The conversation is back in your active inbox."
      );
    } catch (actionError) {
      setError(humanizeMessagingError(actionError));
    } finally {
      setPendingAction("");
    }
  }

  if (loading) {
    return (
      <DashboardCard accent="notifications">
        <SectionHeader
          eyebrow="Private messages"
          title="Opening your conversation with Beast Administration"
          description="Loading only your authenticated administrative thread."
        />
        <div
          className="mt-5 h-48 animate-pulse rounded-xl border border-[#2a3242] bg-[#111827]"
          aria-busy="true"
        />
      </DashboardCard>
    );
  }

  return (
    <div className="min-w-0 space-y-5">
      {error ? (
        <p
          role="alert"
          className="rounded-xl border border-red-300/30 bg-red-300/10 p-4 text-sm font-bold text-red-100"
        >
          {error}
        </p>
      ) : null}
      {success ? (
        <p
          role="status"
          className="rounded-xl border border-green-300/30 bg-green-300/10 p-4 text-sm font-bold text-green-100"
        >
          {success}
        </p>
      ) : null}

      {thread ? (
        <>
          <div className="flex flex-wrap justify-end gap-2">
            <button
              type="button"
              className="beast-button-secondary min-h-11"
              disabled={Boolean(pendingAction)}
              onClick={() =>
                void updateArchive(
                  thread.memberArchived
                    ? "member_reopen"
                    : "member_archive"
                )
              }
            >
              {thread.memberArchived ? "Return to inbox" : "Archive"}
            </button>
          </div>
          <BeastAdminPrivateMessageThread
            thread={thread}
            audience="member"
          />
        </>
      ) : (
        <DashboardCard accent="notifications">
          <SectionHeader
            eyebrow="Private account support"
            title="Start a conversation with Beast Administration"
            description="Ask for help with your Beast account, report a problem, or request support. This is private communication—not AI chat."
          />
        </DashboardCard>
      )}

      <DashboardCard accent="notifications">
        <SectionHeader
          eyebrow={thread ? "Reply" : "New support request"}
          title={
            thread
              ? "Continue the private conversation"
              : "How can Beast Administration help?"
          }
          description="Messages are retained as account and support history. Editing and silent deletion are not available."
        />
        <form onSubmit={sendMessage} className="mt-5 grid min-w-0 gap-4">
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className="beast-button-secondary min-h-10"
              onClick={() => setCategory("problem")}
            >
              Report a problem
            </button>
            <button
              type="button"
              className="beast-button-secondary min-h-10"
              onClick={() => setCategory("support")}
            >
              Request support
            </button>
          </div>
          <label className="grid gap-1.5 text-xs font-black uppercase tracking-wide text-[#9aa7b8]">
            Category
            <select
              value={category}
              onChange={(event) =>
                setCategory(event.target.value as BeastAdminMessageCategory)
              }
              className="min-h-11 rounded-lg border border-[#344052] bg-[#0b1220] px-3 py-2 text-sm normal-case tracking-normal text-white"
            >
              {beastAdminMessageCategories.map((option) => (
                <option key={option} value={option}>
                  {beastAdminMessageCategoryLabels[option]}
                </option>
              ))}
            </select>
          </label>
          <label className="grid min-w-0 gap-1.5 text-xs font-black uppercase tracking-wide text-[#9aa7b8]">
            Message
            <textarea
              value={body}
              onChange={(event) => setBody(event.target.value)}
              rows={6}
              maxLength={5000}
              placeholder="Describe the account question, problem, or support you need."
              className="min-h-36 w-full min-w-0 resize-y rounded-lg border border-[#344052] bg-[#0b1220] px-3 py-3 text-sm font-medium normal-case tracking-normal text-white outline-none placeholder:text-[#68768b] focus:border-sky-300/70"
            />
          </label>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-xs font-bold text-[#7f8da3]">
              {body.length.toLocaleString()} / 5,000 characters · Plain text
              only
            </p>
            <button
              type="submit"
              disabled={sending}
              className="beast-button min-h-11 disabled:cursor-wait disabled:opacity-60"
            >
              {sending ? "Sending…" : thread ? "Send reply" : "Send to Admin"}
            </button>
          </div>
        </form>
      </DashboardCard>
    </div>
  );
}
