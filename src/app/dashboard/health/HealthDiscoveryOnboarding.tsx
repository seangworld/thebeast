"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { DashboardCard, SectionHeader } from "@/app/components/design/DashboardPrimitives";
import {
  buildHealthDiscoveryConversationHref,
  buildHealthDiscoveryProgress,
  healthDiscoveryTopics,
  normalizeHealthDiscoveryState,
  type HealthDiscoveryState,
  type HealthDiscoveryTopicId,
} from "@/lib/health/discovery";
import type { HealthRecord } from "@/lib/health/foundation";
import { createClient } from "@/lib/supabase/client";

type Props = {
  ownerId: string;
  records: HealthRecord[];
  recordsLoading: boolean;
  recordsUnavailable: boolean;
};

export function HealthDiscoveryOnboarding({
  ownerId,
  records,
  recordsLoading,
  recordsUnavailable,
}: Props) {
  const [state, setState] = useState<HealthDiscoveryState>({
    lastTopic: null,
    skippedTopics: [],
  });
  const [activeTopicId, setActiveTopicId] = useState<HealthDiscoveryTopicId | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [workflowUnavailable, setWorkflowUnavailable] = useState(false);

  const progress = useMemo(
    () => buildHealthDiscoveryProgress(records, state),
    [records, state]
  );
  const activeTopic =
    progress.topics.find((topic) => topic.id === activeTopicId) || progress.nextTopic;

  useEffect(() => {
    if (!ownerId) {
      if (!recordsLoading) setLoading(false);
      return;
    }
    let cancelled = false;
    async function load() {
      const client = createClient();
      const { data, error } = await client
        .from("beast_health_discovery")
        .select("last_topic, skipped_topics")
        .eq("owner_id", ownerId)
        .maybeSingle();
      if (cancelled) return;
      if (error) {
        setWorkflowUnavailable(true);
      } else {
        const nextState = normalizeHealthDiscoveryState(data);
        setState(nextState);
        setActiveTopicId(nextState.lastTopic);
      }
      setLoading(false);
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [ownerId, recordsLoading]);

  async function persist(nextState: HealthDiscoveryState) {
    if (!ownerId) return false;
    setSaving(true);
    const client = createClient();
    const { error } = await client.from("beast_health_discovery").upsert(
      {
        owner_id: ownerId,
        last_topic: nextState.lastTopic,
        skipped_topics: nextState.skippedTopics,
      },
      { onConflict: "owner_id" }
    );
    setSaving(false);
    if (error) {
      setWorkflowUnavailable(true);
      return false;
    }
    setState(nextState);
    return true;
  }

  async function chooseTopic(topicId: HealthDiscoveryTopicId) {
    const nextState = {
      lastTopic: topicId,
      skippedTopics: state.skippedTopics.filter((id) => id !== topicId),
    };
    setActiveTopicId(topicId);
    await persist(nextState);
  }

  async function skipCurrent() {
    if (!activeTopic || activeTopic.status === "unavailable") return;
    const skippedTopics = Array.from(new Set([...state.skippedTopics, activeTopic.id]));
    const next = progress.topics.find(
      (topic) =>
        topic.status === "available" &&
        topic.id !== activeTopic.id &&
        !skippedTopics.includes(topic.id)
    );
    const nextState: HealthDiscoveryState = {
      lastTopic: next?.id || null,
      skippedTopics,
    };
    setActiveTopicId(next?.id || null);
    await persist(nextState);
  }

  const busy = loading || recordsLoading;

  return (
    <section aria-labelledby="health-discovery-title">
      <DashboardCard accent="health">
        <SectionHeader
          eyebrow="Guided health discovery"
          title="Build your health profile over time"
          description="Start with one topic. You can skip anything and resume later; confirmed answers stay in your private BeastHealth record."
        />

        <div className="mt-5 grid gap-4 lg:grid-cols-[minmax(0,1.2fr)_minmax(18rem,0.8fr)]">
          <div className="min-w-0 rounded-2xl border border-red-300/20 bg-red-300/[0.05] p-4 sm:p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.16em] text-red-200">
                  Health Profile
                </p>
                <h2 id="health-discovery-title" className="mt-1 text-xl font-black text-white">
                  {progress.percent}% complete
                </h2>
              </div>
              <span className="text-sm font-bold text-[#c7cfdb]">
                {progress.completed} of {progress.total} available topics
              </span>
            </div>
            <div
              className="mt-3 h-2 overflow-hidden rounded-full bg-black/30"
              role="progressbar"
              aria-label="Health Profile completion"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={progress.percent}
            >
              <div
                className="h-full rounded-full bg-red-300 transition-[width]"
                style={{ width: `${progress.percent}%` }}
              />
            </div>

            {busy ? (
              <p className="mt-5 text-sm text-[#c7cfdb]" role="status">
                Loading your saved discovery progress…
              </p>
            ) : recordsUnavailable ? (
              <p className="mt-5 rounded-xl border border-amber-300/30 bg-amber-300/10 p-4 text-sm leading-6 text-amber-100">
                Health discovery cannot calculate progress while your records are unavailable.
              </p>
            ) : activeTopic ? (
              <div className="mt-5">
                <p className="text-xs font-black uppercase tracking-wide text-[#9aa7b8]">
                  One question for now
                </p>
                <h3 className="mt-2 text-lg font-black text-white">{activeTopic.label}</h3>
                <p className="mt-2 text-sm leading-6 text-[#dbe3ef]">{activeTopic.prompt}</p>
                <div className="mt-4 flex flex-wrap gap-2">
                  {activeTopic.source === "beastos" ? (
                    <Link href={activeTopic.href} className="beast-button-secondary inline-flex min-h-11 items-center">
                      View in BeastOS
                    </Link>
                  ) : (
                    <Link
                      href={buildHealthDiscoveryConversationHref(activeTopic)}
                      className="beast-button inline-flex min-h-11 items-center"
                    >
                      Talk with Health Advisor
                    </Link>
                  )}
                  {activeTopic.status !== "unavailable" ? (
                    <button
                      type="button"
                      className="beast-button-secondary min-h-11"
                      disabled={saving}
                      onClick={() => void skipCurrent()}
                    >
                      {saving ? "Saving…" : "Skip for now"}
                    </button>
                  ) : null}
                </div>
                {activeTopic.status === "unavailable" ? (
                  <p className="mt-3 text-xs leading-5 text-[#9aa7b8]">
                    Managed by BeastOS. Emergency Contacts is still planned, so it is excluded from completion until that source is available.
                  </p>
                ) : null}
              </div>
            ) : (
              <p className="mt-5 rounded-xl border border-emerald-300/20 bg-emerald-300/[0.06] p-4 text-sm leading-6 text-emerald-100">
                Your available discovery topics are complete. You can still review or update any area below.
              </p>
            )}

            {workflowUnavailable ? (
              <p className="mt-4 text-xs leading-5 text-amber-100" role="alert">
                Resume and skip preferences are temporarily unavailable. Your health records were not changed.
              </p>
            ) : null}
          </div>

          <div className="min-w-0">
            <p className="text-xs font-black uppercase tracking-[0.16em] text-[#9aa7b8]">
              Profile areas
            </p>
            <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
              {progress.categories.map((category) => (
                <div key={category.id} className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-bold text-white">{category.label}</span>
                    <span className="text-xs font-black text-red-200">{category.percent}%</span>
                  </div>
                  <div
                    className="mt-2 h-1.5 overflow-hidden rounded-full bg-black/30"
                    role="progressbar"
                    aria-label={`${category.label} completion`}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-valuenow={category.percent}
                  >
                    <div className="h-full rounded-full bg-red-300" style={{ width: `${category.percent}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <details className="mt-4 rounded-xl border border-white/10 bg-black/10 p-4">
          <summary className="cursor-pointer font-bold text-white">Choose another topic</summary>
          <div className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
            {progress.topics.map((topic) => (
              <button
                key={topic.id}
                type="button"
                className="min-h-11 rounded-xl border border-white/10 px-3 py-2 text-left text-sm transition hover:border-red-300/30 disabled:cursor-not-allowed disabled:opacity-60"
                disabled={saving || topic.status === "unavailable"}
                onClick={() => void chooseTopic(topic.id)}
                aria-label={`${topic.label}: ${topic.status}`}
              >
                <span className="block font-bold text-white">{topic.label}</span>
                <span className="mt-1 block text-xs capitalize text-[#9aa7b8]">
                  {topic.status === "unavailable" ? "Managed by BeastOS — planned" : topic.status}
                </span>
              </button>
            ))}
          </div>
        </details>
      </DashboardCard>
    </section>
  );
}
