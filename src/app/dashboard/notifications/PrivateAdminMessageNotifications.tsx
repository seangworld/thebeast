"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  DashboardCard,
  SectionHeader,
} from "@/app/components/design/DashboardPrimitives";
import { BEAST_ADMIN_MESSAGE_UNREAD_EVENT } from "@/lib/beastAdminMessaging";
import { createClient } from "@/lib/supabase/client";

type PrivateMessageNotification = {
  id: string;
  threadId: string;
  title: string;
  summary: string;
  actionUrl: "/dashboard/messages" | "/dashboard/admin/messages";
  state: "Unread" | "Read";
  createdAt: string;
};

type PrivateMessageNotificationRow = {
  id: string;
  thread_id: string;
  title: string;
  summary: string;
  action_url: string;
  state: string;
  created_at: string;
};

function normalizePrivateMessageNotification(
  row: PrivateMessageNotificationRow
): PrivateMessageNotification | null {
  if (
    !row.id ||
    !row.thread_id ||
    !row.title.trim() ||
    !row.summary.trim() ||
    !["/dashboard/messages", "/dashboard/admin/messages"].includes(
      row.action_url
    ) ||
    !["Unread", "Read"].includes(row.state) ||
    Number.isNaN(Date.parse(row.created_at))
  ) {
    return null;
  }
  return {
    id: row.id,
    threadId: row.thread_id,
    title: row.title.trim(),
    summary: row.summary.trim(),
    actionUrl: row.action_url as PrivateMessageNotification["actionUrl"],
    state: row.state as PrivateMessageNotification["state"],
    createdAt: row.created_at,
  };
}

function formatNotificationDate(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export function PrivateAdminMessageNotifications() {
  const [notifications, setNotifications] = useState<
    PrivateMessageNotification[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [available, setAvailable] = useState(true);

  useEffect(() => {
    let active = true;
    async function loadNotifications() {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("beast_admin_message_notifications")
        .select(
          "id,thread_id,title,summary,action_url,state,created_at"
        )
        .order("created_at", { ascending: false })
        .limit(20);
      if (!active) return;
      if (error) {
        setAvailable(false);
        setNotifications([]);
      } else {
        setAvailable(true);
        setNotifications(
          ((data || []) as PrivateMessageNotificationRow[])
            .map(normalizePrivateMessageNotification)
            .filter(
              (item): item is PrivateMessageNotification => Boolean(item)
            )
        );
      }
      setLoading(false);
    }
    void loadNotifications();
    return () => {
      active = false;
    };
  }, []);

  async function markThreadRead(notification: PrivateMessageNotification) {
    if (notification.state !== "Unread") return;
    setNotifications((current) =>
      current.map((item) =>
        item.id === notification.id ? { ...item, state: "Read" } : item
      )
    );
    const supabase = createClient();
    const { error } = await supabase.rpc(
      "mark_beast_admin_message_thread_read",
      { selected_thread_id: notification.threadId }
    );
    if (error) {
      setNotifications((current) =>
        current.map((item) =>
          item.id === notification.id ? notification : item
        )
      );
      return;
    }
    window.dispatchEvent(new CustomEvent(BEAST_ADMIN_MESSAGE_UNREAD_EVENT));
  }

  if (loading) {
    return (
      <DashboardCard accent="notifications">
        <div
          className="h-24 animate-pulse rounded-xl border border-[#2a3242] bg-[#111827]"
          aria-label="Loading private message notifications"
          aria-busy="true"
        />
      </DashboardCard>
    );
  }

  if (!available || !notifications.length) return null;

  return (
    <DashboardCard accent="notifications">
      <SectionHeader
        eyebrow="Private Support"
        title="Beast Administration messages"
        description="Private account and support communication. Message bodies are opened only inside the protected Messages workspace."
      />
      <div className="mt-5 grid gap-3">
        {notifications.map((notification) => (
          <article
            key={notification.id}
            className={`rounded-xl border p-4 ${
              notification.state === "Unread"
                ? "border-sky-300/35 bg-sky-300/10"
                : "border-[#2a3242] bg-[#111827]"
            }`}
          >
            <div className="flex min-w-0 flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full border border-sky-300/35 px-2.5 py-1 text-xs font-black text-sky-100">
                    {notification.state}
                  </span>
                  <span className="text-xs font-bold text-[#7f8da3]">
                    {formatNotificationDate(notification.createdAt)}
                  </span>
                </div>
                <h3 className="mt-3 break-words font-black text-white">
                  {notification.title}
                </h3>
                <p className="mt-2 break-words text-sm leading-6 text-[#c7cfdb]">
                  {notification.summary}
                </p>
              </div>
              <Link
                href={notification.actionUrl}
                onClick={() => void markThreadRead(notification)}
                className="beast-button shrink-0 text-center"
              >
                Open private message
              </Link>
            </div>
          </article>
        ))}
      </div>
    </DashboardCard>
  );
}
