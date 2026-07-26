"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  DashboardCard,
  SectionHeader,
} from "@/app/components/design/DashboardPrimitives";
import { createClient } from "@/lib/supabase/client";

type FeedbackReleaseNotification = {
  id: string;
  title: string;
  summary: string;
  actionUrl: string;
  state: "Unread" | "Read" | "Dismissed";
  createdAt: string;
};

type FeedbackReleaseNotificationRow = {
  id: string;
  title: string;
  summary: string;
  action_url: string;
  state: string;
  created_at: string;
};

function normalizeNotification(
  row: FeedbackReleaseNotificationRow
): FeedbackReleaseNotification | null {
  if (
    !row.id ||
    !row.title.trim() ||
    !row.summary.trim() ||
    !row.action_url.startsWith("/") ||
    !["Unread", "Read", "Dismissed"].includes(row.state) ||
    Number.isNaN(Date.parse(row.created_at))
  ) {
    return null;
  }

  return {
    id: row.id,
    title: row.title.trim(),
    summary: row.summary.trim(),
    actionUrl: row.action_url,
    state: row.state as FeedbackReleaseNotification["state"],
    createdAt: row.created_at,
  };
}

function formatNotificationDate(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export function FeedbackReleaseNotifications() {
  const [notifications, setNotifications] = useState<
    FeedbackReleaseNotification[]
  >([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    async function loadNotifications() {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("beast_member_notifications")
        .select("id,title,summary,action_url,state,created_at")
        .eq("source", "admin_feedback")
        .neq("state", "Dismissed")
        .order("created_at", { ascending: false })
        .limit(10);

      if (!active) return;
      if (!error) {
        setNotifications(
          ((data || []) as FeedbackReleaseNotificationRow[])
            .map(normalizeNotification)
            .filter(
              (item): item is FeedbackReleaseNotification => Boolean(item)
            )
        );
      }
      setLoading(false);
    }

    loadNotifications();
    return () => {
      active = false;
    };
  }, []);

  async function markRead(notification: FeedbackReleaseNotification) {
    if (notification.state !== "Unread") return;

    setNotifications((current) =>
      current.map((item) =>
        item.id === notification.id ? { ...item, state: "Read" } : item
      )
    );

    const supabase = createClient();
    const { error } = await supabase.rpc(
      "mark_beast_member_notification_read",
      {
        selected_notification_id: notification.id,
      }
    );

    if (error) {
      setNotifications((current) =>
        current.map((item) =>
          item.id === notification.id ? notification : item
        )
      );
    }
  }

  if (loading) {
    return (
      <DashboardCard accent="notifications">
        <div
          className="h-24 animate-pulse rounded-xl border border-[#2a3242] bg-[#111827]"
          aria-label="Loading feedback updates"
          aria-busy="true"
        />
      </DashboardCard>
    );
  }

  if (!notifications.length) return null;

  return (
    <DashboardCard accent="notifications">
      <SectionHeader
        eyebrow="You Helped Improve Beast"
        title="Feedback updates"
        description="When something you reported is implemented, BeastAdmin closes the loop here."
      />
      <div className="mt-5 grid gap-3">
        {notifications.map((notification) => (
          <article
            key={notification.id}
            className={`rounded-xl border p-4 ${
              notification.state === "Unread"
                ? "border-green-300/35 bg-green-300/10"
                : "border-[#2a3242] bg-[#111827]"
            }`}
          >
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full border border-green-300/35 px-2.5 py-1 text-xs font-black text-green-100">
                    {notification.state}
                  </span>
                  <span className="text-xs font-bold text-[#7f8da3]">
                    {formatNotificationDate(notification.createdAt)}
                  </span>
                </div>
                <h3 className="mt-3 font-black text-white">
                  {notification.title}
                </h3>
                <p className="mt-2 text-sm leading-6 text-[#c7cfdb]">
                  {notification.summary}
                </p>
              </div>
              <Link
                href={notification.actionUrl}
                className="beast-button shrink-0 text-center"
                onClick={() => markRead(notification)}
              >
                View release
              </Link>
            </div>
          </article>
        ))}
      </div>
    </DashboardCard>
  );
}
