"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useSearchParams } from "next/navigation";
import {
  DashboardCard,
  MetricTile,
  SectionHeader,
} from "@/app/components/design/DashboardPrimitives";
import {
  BEAST_ADMIN_MESSAGE_UNREAD_EVENT,
  beastAdminMessageCategories,
  beastAdminMessageCategoryLabels,
  beastAdminMessageLinkTypeLabels,
  beastAdminMessageLinkTypes,
  filterBeastAdminMessageThreads,
  getBeastAdminMessageThreadStateLabel,
  normalizeBeastAdminMessageBody,
  normalizeBeastAdminMessageInboxSnapshot,
  normalizeBeastAdminPrivateThread,
  type BeastAdminMessageCategory,
  type BeastAdminMessageInboxFilters,
  type BeastAdminMessageLinkType,
  type BeastAdminPrivateThread,
} from "@/lib/beastAdminMessaging";
import {
  normalizeBeastAdminMemberDirectory,
  type BeastAdminMemberDirectoryEntry,
} from "@/lib/beastAdminMemberTimeline";
import { createClient } from "@/lib/supabase/client";
import { BeastAdminPrivateMessageThread } from "@/app/dashboard/messages/BeastAdminPrivateMessageThread";

const defaultFilters: BeastAdminMessageInboxFilters = {
  query: "",
  unread: "all",
  category: "all",
  status: "all",
  dateFrom: "",
  dateTo: "",
};

const fieldClassName =
  "min-h-11 w-full min-w-0 rounded-lg border border-[#344052] bg-[#0b1220] px-3 py-2 text-sm text-white outline-none focus:border-amber-300/70";

function formatInboxDate(value: string | null) {
  if (!value) return "No messages";
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function humanizeAdminMessageError(error: unknown) {
  const message =
    error && typeof error === "object" && "message" in error
      ? String(error.message)
      : "";
  if (/rate limit/i.test(message)) {
    return "Messages are being sent too quickly. Wait a moment and retry.";
  }
  if (/feedback record|account action|roadmap work/i.test(message)) {
    return message;
  }
  if (/safe plain text|between 1 and 5000/i.test(message)) {
    return "Use plain text between 1 and 5,000 characters.";
  }
  if (/permission|owner access|required|42501/i.test(message)) {
    return "Member Messages is restricted to Beast administrators.";
  }
  if (/function .* does not exist|schema cache/i.test(message)) {
    return "Private messaging is not connected in this environment.";
  }
  return "BeastAdmin could not complete the private message request.";
}

function announceUnreadChange() {
  window.dispatchEvent(new CustomEvent(BEAST_ADMIN_MESSAGE_UNREAD_EVENT));
}

export function BeastAdminMemberMessagesWorkspace() {
  const searchParams = useSearchParams();
  const requestedMemberId = searchParams.get("member") || "";
  const [threads, setThreads] = useState<BeastAdminPrivateThread[]>([]);
  const [members, setMembers] = useState<BeastAdminMemberDirectoryEntry[]>([]);
  const [selectedThreadId, setSelectedThreadId] = useState("");
  const [selectedThread, setSelectedThread] =
    useState<BeastAdminPrivateThread | null>(null);
  const [filters, setFilters] =
    useState<BeastAdminMessageInboxFilters>(defaultFilters);
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [composeOpen, setComposeOpen] = useState(false);
  const [selectedMemberId, setSelectedMemberId] = useState(requestedMemberId);
  const [body, setBody] = useState("");
  const [category, setCategory] =
    useState<BeastAdminMessageCategory>("support");
  const [linkType, setLinkType] = useState<BeastAdminMessageLinkType | "">("");
  const [linkId, setLinkId] = useState("");
  const [pending, setPending] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let active = true;
    async function loadInbox() {
      setLoading(true);
      setError("");
      try {
        const supabase = createClient();
        const [inboxResult, directoryResult] = await Promise.all([
          supabase.rpc("get_beast_admin_message_threads"),
          supabase.rpc("get_beast_admin_member_directory"),
        ]);
        if (inboxResult.error) throw inboxResult.error;
        if (directoryResult.error) throw directoryResult.error;
        const inbox = normalizeBeastAdminMessageInboxSnapshot(
          inboxResult.data
        );
        const directory = normalizeBeastAdminMemberDirectory(
          directoryResult.data
        );
        if (!inbox || !directory) {
          throw new Error("Private message directory data was invalid.");
        }
        if (!active) return;
        setThreads(inbox.threads);
        setMembers(
          directory.filter(
            (member) =>
              member.accountKind === "member" &&
              member.role !== "admin" &&
              member.accountStatus !== "deleted"
          )
        );
        const requestedThread = requestedMemberId
          ? inbox.threads.find(
              (thread) => thread.memberId === requestedMemberId
            )
          : null;
        if (requestedThread) {
          setSelectedThreadId(requestedThread.id);
        } else if (requestedMemberId) {
          setSelectedMemberId(requestedMemberId);
          setComposeOpen(true);
        } else {
          setSelectedThreadId((current) =>
            inbox.threads.some((thread) => thread.id === current)
              ? current
              : inbox.threads[0]?.id || ""
          );
        }
      } catch (loadError) {
        if (active) {
          setThreads([]);
          setMembers([]);
          setError(humanizeAdminMessageError(loadError));
        }
      } finally {
        if (active) setLoading(false);
      }
    }
    void loadInbox();
    return () => {
      active = false;
    };
  }, [refreshKey, requestedMemberId]);

  useEffect(() => {
    let active = true;
    if (!selectedThreadId) {
      setSelectedThread(null);
      return;
    }
    async function loadDetail() {
      setDetailLoading(true);
      setError("");
      try {
        const supabase = createClient();
        const { data, error: detailError } = await supabase.rpc(
          "get_beast_admin_message_thread",
          { selected_thread_id: selectedThreadId }
        );
        if (detailError) throw detailError;
        const detail = normalizeBeastAdminPrivateThread(data);
        if (!detail) throw new Error("Private message data was invalid.");
        if (!active) return;
        setSelectedThread(detail);
        setCategory(detail.category);
        setLinkType(detail.linkedObjectType || "");
        setLinkId(detail.linkedObjectId || "");
        if (detail.unreadCount) {
          const { error: readError } = await supabase.rpc(
            "mark_beast_admin_message_thread_read",
            { selected_thread_id: detail.id }
          );
          if (!readError && active) {
            setSelectedThread({ ...detail, unreadCount: 0 });
            setThreads((current) =>
              current.map((thread) =>
                thread.id === detail.id
                  ? { ...thread, unreadCount: 0 }
                  : thread
              )
            );
            announceUnreadChange();
          }
        }
      } catch (detailError) {
        if (active) {
          setSelectedThread(null);
          setError(humanizeAdminMessageError(detailError));
        }
      } finally {
        if (active) setDetailLoading(false);
      }
    }
    void loadDetail();
    return () => {
      active = false;
    };
  }, [selectedThreadId]);

  const visibleThreads = useMemo(
    () => filterBeastAdminMessageThreads(threads, filters),
    [filters, threads]
  );
  const unreadCount = threads.reduce(
    (sum, thread) => sum + thread.unreadCount,
    0
  );
  const openCount = threads.filter(
    (thread) => thread.status === "open" && !thread.adminArchived
  ).length;
  const resolvedCount = threads.filter(
    (thread) => thread.status === "resolved" && !thread.adminArchived
  ).length;

  function updateFilter<Key extends keyof BeastAdminMessageInboxFilters>(
    key: Key,
    value: BeastAdminMessageInboxFilters[Key]
  ) {
    setFilters((current) => ({ ...current, [key]: value }));
  }

  function resetComposer(memberId = "") {
    setSelectedMemberId(memberId);
    setBody("");
    setCategory("support");
    setLinkType("");
    setLinkId("");
  }

  async function sendMessage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const targetMemberId = composeOpen
      ? selectedMemberId
      : selectedThread?.memberId || selectedMemberId;
    const normalizedBody = normalizeBeastAdminMessageBody(body);
    if (!targetMemberId) {
      setError("Select a member before sending a private message.");
      return;
    }
    if (!normalizedBody) {
      setError("Use safe plain text between 1 and 5,000 characters.");
      return;
    }
    if ((linkType && !linkId.trim()) || (!linkType && linkId.trim())) {
      setError("Administrative links require both a type and record ID.");
      return;
    }

    setPending("send");
    setError("");
    setSuccess("");
    try {
      const supabase = createClient();
      const { data, error: sendError } = await supabase.rpc(
        "send_beast_admin_message",
        {
          selected_member_id: targetMemberId,
          selected_body: normalizedBody,
          selected_category: category,
          selected_link_type: linkType || null,
          selected_link_id: linkId.trim() || null,
        }
      );
      if (sendError) throw sendError;
      const detail = normalizeBeastAdminPrivateThread(data);
      if (!detail) throw new Error("Private message data was invalid.");
      setSelectedThread(detail);
      setSelectedThreadId(detail.id);
      setBody("");
      setComposeOpen(false);
      setSuccess(`Private message sent to ${detail.memberName}.`);
      setRefreshKey((current) => current + 1);
      announceUnreadChange();
    } catch (sendError) {
      setError(humanizeAdminMessageError(sendError));
    } finally {
      setPending("");
    }
  }

  async function updateThread(
    action:
      | "resolve"
      | "reopen"
      | "admin_archive"
      | "admin_unarchive"
      | "link"
      | "unlink"
  ) {
    if (!selectedThread) return;
    if (
      action === "link" &&
      (!linkType || !linkId.trim())
    ) {
      setError("Choose a link type and provide its persisted record ID.");
      return;
    }
    setPending(action);
    setError("");
    setSuccess("");
    try {
      const supabase = createClient();
      const { data, error: actionError } = await supabase.rpc(
        "update_beast_admin_message_thread",
        {
          selected_thread_id: selectedThread.id,
          selected_action: action,
          selected_link_type: action === "link" ? linkType : null,
          selected_link_id: action === "link" ? linkId.trim() : null,
        }
      );
      if (actionError) throw actionError;
      const detail = normalizeBeastAdminPrivateThread(data);
      if (!detail) throw new Error("Private message data was invalid.");
      setSelectedThread(detail);
      setSuccess(
        action === "resolve"
          ? "The support thread is resolved."
          : action === "reopen"
            ? "The support thread is open again."
            : action === "admin_archive"
              ? "The thread was archived without deleting its history."
              : action === "admin_unarchive"
                ? "The thread returned to the active inbox."
                : action === "link"
                  ? "Administrative work was linked to this thread."
                  : "The administrative link was removed."
      );
      setRefreshKey((current) => current + 1);
    } catch (actionError) {
      setError(humanizeAdminMessageError(actionError));
    } finally {
      setPending("");
    }
  }

  if (loading) {
    return (
      <DashboardCard accent="admin">
        <SectionHeader
          eyebrow="Private member messages"
          title="Loading the owner-authorized support inbox"
          description="BeastAdmin is loading real account identities and private administrative thread metadata."
        />
        <div className="mt-5 grid gap-3" aria-busy="true">
          {[1, 2, 3].map((item) => (
            <div
              key={item}
              className="h-20 animate-pulse rounded-xl border border-[#2a3242] bg-[#111827]"
            />
          ))}
        </div>
      </DashboardCard>
    );
  }

  return (
    <div className="min-w-0 space-y-6">
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

      <section className="grid min-w-0 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricTile
          label="Threads"
          value={String(threads.length)}
          detail="One durable thread per member"
          icon="T"
          tone="blue"
        />
        <MetricTile
          label="Unread"
          value={String(unreadCount)}
          detail="Member messages awaiting review"
          icon="U"
          tone="yellow"
        />
        <MetricTile
          label="Open"
          value={String(openCount)}
          detail="Active support conversations"
          icon="O"
          tone="green"
        />
        <MetricTile
          label="Resolved"
          value={String(resolvedCount)}
          detail="Retained completed conversations"
          icon="R"
          tone="purple"
        />
      </section>

      <DashboardCard accent="admin">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <SectionHeader
            eyebrow="Owner-only inbox"
            title="Private Member Messages"
            description="Account and support communication only. Messages never become AI context, analytics, professional memory, or cross-module understanding."
          />
          <button
            type="button"
            className="beast-button min-h-11 shrink-0"
            onClick={() => {
              resetComposer(requestedMemberId);
              setComposeOpen((current) => {
                if (!current) {
                  setSelectedThreadId("");
                  setSelectedThread(null);
                }
                return !current;
              });
            }}
          >
            {composeOpen ? "Close new message" : "New member message"}
          </button>
        </div>

        <div className="mt-5 grid min-w-0 gap-3 md:grid-cols-2 xl:grid-cols-4">
          <label className="grid min-w-0 gap-1.5 text-xs font-black uppercase tracking-wide text-[#9aa7b8] md:col-span-2">
            Member
            <input
              type="search"
              value={filters.query}
              onChange={(event) => updateFilter("query", event.target.value)}
              placeholder="Search member name or login email"
              className={fieldClassName}
            />
          </label>
          <label className="grid gap-1.5 text-xs font-black uppercase tracking-wide text-[#9aa7b8]">
            Read state
            <select
              value={filters.unread}
              onChange={(event) =>
                updateFilter(
                  "unread",
                  event.target.value as BeastAdminMessageInboxFilters["unread"]
                )
              }
              className={fieldClassName}
            >
              <option value="all">All</option>
              <option value="unread">Unread</option>
              <option value="read">No unread messages</option>
            </select>
          </label>
          <label className="grid gap-1.5 text-xs font-black uppercase tracking-wide text-[#9aa7b8]">
            Category
            <select
              value={filters.category}
              onChange={(event) =>
                updateFilter(
                  "category",
                  event.target
                    .value as BeastAdminMessageInboxFilters["category"]
                )
              }
              className={fieldClassName}
            >
              <option value="all">All categories</option>
              {beastAdminMessageCategories.map((option) => (
                <option key={option} value={option}>
                  {beastAdminMessageCategoryLabels[option]}
                </option>
              ))}
            </select>
          </label>
          <label className="grid gap-1.5 text-xs font-black uppercase tracking-wide text-[#9aa7b8]">
            Status
            <select
              value={filters.status}
              onChange={(event) =>
                updateFilter(
                  "status",
                  event.target
                    .value as BeastAdminMessageInboxFilters["status"]
                )
              }
              className={fieldClassName}
            >
              <option value="all">All states</option>
              <option value="open">Open</option>
              <option value="resolved">Resolved</option>
              <option value="archived">Archived</option>
            </select>
          </label>
          <label className="grid gap-1.5 text-xs font-black uppercase tracking-wide text-[#9aa7b8]">
            From date
            <input
              type="date"
              value={filters.dateFrom}
              onChange={(event) =>
                updateFilter("dateFrom", event.target.value)
              }
              className={fieldClassName}
            />
          </label>
          <label className="grid gap-1.5 text-xs font-black uppercase tracking-wide text-[#9aa7b8]">
            Through date
            <input
              type="date"
              value={filters.dateTo}
              onChange={(event) =>
                updateFilter("dateTo", event.target.value)
              }
              className={fieldClassName}
            />
          </label>
          <div className="flex items-end">
            <button
              type="button"
              className="beast-button-secondary min-h-11 w-full"
              onClick={() => setFilters(defaultFilters)}
            >
              Clear filters
            </button>
          </div>
        </div>
      </DashboardCard>

      {composeOpen ? (
        <DashboardCard accent="admin">
          <SectionHeader
            eyebrow="New private thread"
            title="Message an individual Beast member"
            description="The selected member receives a private BeastOS notification. No group, household, professional, or member-to-member delivery is available."
          />
          <form onSubmit={sendMessage} className="mt-5 grid min-w-0 gap-4">
            <label className="grid min-w-0 gap-1.5 text-xs font-black uppercase tracking-wide text-[#9aa7b8]">
              Member
              <select
                value={selectedMemberId}
                onChange={(event) => setSelectedMemberId(event.target.value)}
                className={fieldClassName}
              >
                <option value="">Select a member</option>
                {members.map((member) => (
                  <option key={member.id} value={member.id}>
                    {member.displayName}
                    {member.email ? ` · ${member.email}` : ""}
                    {member.accountStatus === "suspended"
                      ? " · Suspended"
                      : ""}
                  </option>
                ))}
              </select>
            </label>
            <AdminComposerFields
              body={body}
              category={category}
              linkType={linkType}
              linkId={linkId}
              onBodyChange={setBody}
              onCategoryChange={setCategory}
              onLinkTypeChange={setLinkType}
              onLinkIdChange={setLinkId}
            />
            <button
              type="submit"
              disabled={Boolean(pending)}
              className="beast-button min-h-11 justify-self-end disabled:cursor-wait disabled:opacity-60"
            >
              {pending === "send" ? "Sending…" : "Send private message"}
            </button>
          </form>
        </DashboardCard>
      ) : null}

      <section className="grid min-w-0 gap-5 xl:grid-cols-[minmax(17rem,0.75fr)_minmax(0,1.6fr)]">
        <DashboardCard accent="admin" className="min-w-0">
          <SectionHeader
            eyebrow="Conversation list"
            title={`${visibleThreads.length} matching thread${
              visibleThreads.length === 1 ? "" : "s"
            }`}
            description={
              threads.length
                ? "Choose a member thread to review its retained history."
                : "No member has started a private administrative thread, and no administrator has sent one."
            }
          />
          <div className="mt-5 grid max-h-[42rem] gap-2 overflow-y-auto pr-1">
            {visibleThreads.map((thread) => (
              <button
                key={thread.id}
                type="button"
                onClick={() => {
                  setSelectedThreadId(thread.id);
                  setComposeOpen(false);
                }}
                className={`min-w-0 rounded-xl border p-4 text-left ${
                  selectedThreadId === thread.id
                    ? "border-amber-300/50 bg-amber-300/10"
                    : "border-[#2a3242] bg-[#111827] hover:border-[#465266]"
                }`}
              >
                <div className="flex min-w-0 items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate font-black text-white">
                      {thread.memberName}
                    </p>
                    <p className="mt-1 truncate text-xs text-[#9aa7b8]">
                      {beastAdminMessageCategoryLabels[thread.category]} ·{" "}
                      {getBeastAdminMessageThreadStateLabel(thread, "admin")}
                    </p>
                  </div>
                  {thread.unreadCount ? (
                    <span className="shrink-0 rounded-full bg-amber-200 px-2 py-1 text-xs font-black text-[#1b1300]">
                      {thread.unreadCount}
                    </span>
                  ) : null}
                </div>
                <p className="mt-3 text-xs font-bold text-[#7f8da3]">
                  {formatInboxDate(thread.lastMessageAt)}
                </p>
              </button>
            ))}
            {!visibleThreads.length && threads.length ? (
              <div className="rounded-xl border border-dashed border-[#344052] p-6 text-center">
                <p className="font-black text-white">
                  No threads match these filters
                </p>
                <p className="mt-2 text-sm leading-6 text-[#9aa7b8]">
                  Adjust the member, category, status, unread, or date filters.
                </p>
              </div>
            ) : null}
          </div>
        </DashboardCard>

        <div className="min-w-0 space-y-5">
          {detailLoading ? (
            <DashboardCard accent="admin">
              <div
                className="h-64 animate-pulse rounded-xl border border-[#2a3242] bg-[#111827]"
                aria-busy="true"
              />
            </DashboardCard>
          ) : selectedThread ? (
            <>
              <div className="flex min-w-0 flex-wrap gap-2">
                <button
                  type="button"
                  className="beast-button-secondary min-h-11"
                  disabled={Boolean(pending)}
                  onClick={() =>
                    void updateThread(
                      selectedThread.status === "resolved"
                        ? "reopen"
                        : "resolve"
                    )
                  }
                >
                  {selectedThread.status === "resolved"
                    ? "Reopen"
                    : "Mark resolved"}
                </button>
                <button
                  type="button"
                  className="beast-button-secondary min-h-11"
                  disabled={Boolean(pending)}
                  onClick={() =>
                    void updateThread(
                      selectedThread.adminArchived
                        ? "admin_unarchive"
                        : "admin_archive"
                    )
                  }
                >
                  {selectedThread.adminArchived
                    ? "Return to inbox"
                    : "Archive"}
                </button>
              </div>
              <BeastAdminPrivateMessageThread
                thread={selectedThread}
                audience="admin"
              />
              <DashboardCard accent="admin">
                <SectionHeader
                  eyebrow="Admin reply"
                  title={`Reply to ${selectedThread.memberName}`}
                  description="The member receives a private BeastOS notification. Account-category sends add metadata-only evidence to the immutable account audit log."
                />
                <form onSubmit={sendMessage} className="mt-5 grid min-w-0 gap-4">
                  <AdminComposerFields
                    body={body}
                    category={category}
                    linkType={linkType}
                    linkId={linkId}
                    onBodyChange={setBody}
                    onCategoryChange={setCategory}
                    onLinkTypeChange={setLinkType}
                    onLinkIdChange={setLinkId}
                  />
                  <div className="flex flex-wrap justify-end gap-2">
                    {selectedThread.linkedObjectType ? (
                      <button
                        type="button"
                        className="beast-button-secondary min-h-11"
                        disabled={Boolean(pending)}
                        onClick={() => void updateThread("unlink")}
                      >
                        Remove current link
                      </button>
                    ) : null}
                    {linkType && linkId.trim() ? (
                      <button
                        type="button"
                        className="beast-button-secondary min-h-11"
                        disabled={Boolean(pending)}
                        onClick={() => void updateThread("link")}
                      >
                        Link without sending
                      </button>
                    ) : null}
                    <button
                      type="submit"
                      disabled={Boolean(pending)}
                      className="beast-button min-h-11 disabled:cursor-wait disabled:opacity-60"
                    >
                      {pending === "send" ? "Sending…" : "Send reply"}
                    </button>
                  </div>
                </form>
                {selectedThread.linkedObjectType ? (
                  <p className="mt-4 break-all rounded-xl border border-purple-300/25 bg-purple-300/10 p-4 text-sm font-bold text-purple-100">
                    Linked to{" "}
                    {
                      beastAdminMessageLinkTypeLabels[
                        selectedThread.linkedObjectType
                      ]
                    }
                    : {selectedThread.linkedObjectId}
                  </p>
                ) : null}
              </DashboardCard>
            </>
          ) : (
            <DashboardCard accent="admin">
              <SectionHeader
                eyebrow="Private thread"
                title="Choose a member conversation"
                description="Select a thread from the inbox, or start a new private member message."
              />
            </DashboardCard>
          )}
        </div>
      </section>
    </div>
  );
}

function AdminComposerFields({
  body,
  category,
  linkType,
  linkId,
  onBodyChange,
  onCategoryChange,
  onLinkTypeChange,
  onLinkIdChange,
}: {
  body: string;
  category: BeastAdminMessageCategory;
  linkType: BeastAdminMessageLinkType | "";
  linkId: string;
  onBodyChange: (value: string) => void;
  onCategoryChange: (value: BeastAdminMessageCategory) => void;
  onLinkTypeChange: (value: BeastAdminMessageLinkType | "") => void;
  onLinkIdChange: (value: string) => void;
}) {
  return (
    <>
      <label className="grid gap-1.5 text-xs font-black uppercase tracking-wide text-[#9aa7b8]">
        Category
        <select
          value={category}
          onChange={(event) =>
            onCategoryChange(event.target.value as BeastAdminMessageCategory)
          }
          className={fieldClassName}
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
          onChange={(event) => onBodyChange(event.target.value)}
          rows={6}
          maxLength={5000}
          placeholder="Write a private account or support message."
          className="min-h-36 w-full min-w-0 resize-y rounded-lg border border-[#344052] bg-[#0b1220] px-3 py-3 text-sm font-medium normal-case tracking-normal text-white outline-none placeholder:text-[#68768b] focus:border-amber-300/70"
        />
        <span className="text-right text-[11px] font-bold normal-case tracking-normal text-[#7f8da3]">
          {body.length.toLocaleString()} / 5,000 · Plain text only
        </span>
      </label>
      <div className="grid min-w-0 gap-3 md:grid-cols-2">
        <label className="grid gap-1.5 text-xs font-black uppercase tracking-wide text-[#9aa7b8]">
          Optional administrative link
          <select
            value={linkType}
            onChange={(event) =>
              onLinkTypeChange(
                event.target.value as BeastAdminMessageLinkType | ""
              )
            }
            className={fieldClassName}
          >
            <option value="">No linked work</option>
            {beastAdminMessageLinkTypes.map((option) => (
              <option key={option} value={option}>
                {beastAdminMessageLinkTypeLabels[option]}
              </option>
            ))}
          </select>
        </label>
        <label className="grid min-w-0 gap-1.5 text-xs font-black uppercase tracking-wide text-[#9aa7b8]">
          Persisted record ID
          <input
            value={linkId}
            onChange={(event) => onLinkIdChange(event.target.value)}
            placeholder="UUID from feedback, audit, or roadmap"
            className={fieldClassName}
          />
        </label>
      </div>
    </>
  );
}
