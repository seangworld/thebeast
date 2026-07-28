"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import {
  DashboardCard,
  GuidedEmptyState,
  MetricTile,
  SectionHeader,
} from "@/app/components/design/DashboardPrimitives";
import {
  buildHealthOverview,
  buildHealthTimeline,
  healthAdvisorReadiness,
  healthRecordKinds,
  healthWorkspaceDefinitions,
  healthWorkspaceHrefs,
  normalizeHealthRecord,
  type HealthRecord,
  type HealthRecordKind,
  type HealthRecordRow,
  type HealthRecordStatus,
} from "@/lib/health/foundation";
import { createClient } from "@/lib/supabase/client";
import { BeastHealthShell } from "./BeastHealthShell";

const statusOptions: HealthRecordStatus[] = [
  "active",
  "historical",
  "resolved",
  "planned",
];

function formatKind(kind: HealthRecordKind) {
  return healthWorkspaceDefinitions[kind].title;
}

function formatDate(value: string) {
  const date = new Date(/^\d{4}-\d{2}-\d{2}$/.test(value) ? `${value}T12:00:00` : value);
  return date.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function RecordList({
  records,
  onArchive,
  pendingId,
}: {
  records: readonly HealthRecord[];
  onArchive: (record: HealthRecord) => void;
  pendingId: string;
}) {
  return (
    <div className="grid gap-3">
      {records.map((record) => (
        <article
          key={record.id}
          className="rounded-xl border border-white/10 bg-white/[0.03] p-4"
        >
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xs font-black uppercase tracking-wide text-red-200">
                {formatKind(record.recordType)} · {record.status}
              </p>
              <h3 className="mt-2 break-words font-black text-white">
                {record.title}
              </h3>
            </div>
            <span className="text-xs font-bold text-[#9aa7b8]">
              {formatDate(record.occurredOn || record.createdAt)}
            </span>
          </div>
          {record.details.context ? (
            <p className="mt-3 whitespace-pre-wrap break-words text-sm leading-6 text-[#c7cfdb]">
              {String(record.details.context)}
            </p>
          ) : null}
          {record.source ? (
            <p className="mt-2 break-words text-xs text-[#9aa7b8]">
              Source: {record.source}
            </p>
          ) : null}
          {record.notes ? (
            <details className="mt-3 rounded-lg border border-white/10 p-3">
              <summary className="cursor-pointer text-sm font-bold text-red-100">
                Notes
              </summary>
              <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-6 text-[#c7cfdb]">
                {record.notes}
              </p>
            </details>
          ) : null}
          <button
            type="button"
            className="beast-button-secondary mt-4 min-h-11"
            disabled={pendingId === record.id}
            onClick={() => onArchive(record)}
          >
            {record.status === "archived" ? "Restore" : "Archive"}
          </button>
        </article>
      ))}
    </div>
  );
}

function useHealthRecords() {
  const [ownerId, setOwnerId] = useState("");
  const [records, setRecords] = useState<HealthRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function load() {
    setLoading(true);
    const client = createClient();
    const { data: auth, error: authError } = await client.auth.getUser();
    if (authError) throw authError;
    const userId = auth.user?.id;
    if (!userId) throw new Error("Sign in is required.");
    const { data, error: recordsError } = await client
      .from("beast_health_records")
      .select(
        "id, owner_id, record_type, title, status, occurred_on, source, details, notes, created_at, updated_at"
      )
      .eq("owner_id", userId)
      .order("occurred_on", { ascending: false, nullsFirst: false })
      .order("created_at", { ascending: false });
    if (recordsError) throw recordsError;
    setOwnerId(userId);
    setRecords(
      ((data || []) as HealthRecordRow[])
        .map(normalizeHealthRecord)
        .filter((record): record is HealthRecord => Boolean(record))
    );
    setError("");
    setLoading(false);
  }

  useEffect(() => {
    void load().catch(() => {
      setError(
        "Health records are unavailable. The BeastHealth beta migration may still need owner review and application."
      );
      setLoading(false);
    });
  }, []);

  return { ownerId, records, loading, error, setError, reload: load };
}

export function HealthRecordWorkspace({ kind }: { kind: HealthRecordKind }) {
  const definition = healthWorkspaceDefinitions[kind];
  const { ownerId, records, loading, error, setError, reload } =
    useHealthRecords();
  const [title, setTitle] = useState("");
  const [context, setContext] = useState("");
  const [source, setSource] = useState("");
  const [notes, setNotes] = useState("");
  const [occurredOn, setOccurredOn] = useState("");
  const [status, setStatus] = useState<HealthRecordStatus>("active");
  const [saving, setSaving] = useState(false);
  const [pendingId, setPendingId] = useState("");
  const visibleRecords = records.filter((record) => record.recordType === kind);

  async function createRecord(event: FormEvent) {
    event.preventDefault();
    if (!ownerId || !title.trim()) return;
    setSaving(true);
    setError("");
    try {
      const client = createClient();
      const { error: insertError } = await client
        .from("beast_health_records")
        .insert({
          owner_id: ownerId,
          record_type: kind,
          title: title.trim(),
          status,
          occurred_on: occurredOn || null,
          source: source.trim() || null,
          details: { context: context.trim() || null },
          notes: notes.trim() || null,
        });
      if (insertError) throw insertError;
      setTitle("");
      setContext("");
      setSource("");
      setNotes("");
      setOccurredOn("");
      setStatus("active");
      await reload();
    } catch {
      setError("The record could not be saved. Your form values were preserved.");
    } finally {
      setSaving(false);
    }
  }

  async function archiveRecord(record: HealthRecord) {
    setPendingId(record.id);
    setError("");
    try {
      const client = createClient();
      const { error: updateError } = await client
        .from("beast_health_records")
        .update({ status: record.status === "archived" ? "active" : "archived" })
        .eq("id", record.id)
        .eq("owner_id", ownerId);
      if (updateError) throw updateError;
      await reload();
    } catch {
      setError("The record status could not be changed. No local record was removed.");
    } finally {
      setPendingId("");
    }
  }

  return (
    <BeastHealthShell title={definition.title} description={definition.description}>
      <section className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
        <DashboardCard accent="health">
          <SectionHeader
            eyebrow="Owner record"
            title={`Add ${definition.singular}`}
            description={definition.guidance}
          />
          <form className="mt-5 grid gap-4" onSubmit={createRecord}>
            <label className="grid gap-2 text-sm font-bold text-[#dbe3ef]">
              {definition.titleLabel}
              <input
                className="beast-input min-w-0"
                maxLength={200}
                required
                value={title}
                onChange={(event) => setTitle(event.target.value)}
              />
            </label>
            <label className="grid gap-2 text-sm font-bold text-[#dbe3ef]">
              {definition.detailLabel}
              <textarea
                className="beast-input min-h-24 min-w-0 resize-y"
                maxLength={1000}
                value={context}
                onChange={(event) => setContext(event.target.value)}
              />
            </label>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="grid min-w-0 gap-2 text-sm font-bold text-[#dbe3ef]">
                Date
                <input
                  type="date"
                  className="beast-input min-w-0"
                  value={occurredOn}
                  onChange={(event) => setOccurredOn(event.target.value)}
                />
              </label>
              <label className="grid min-w-0 gap-2 text-sm font-bold text-[#dbe3ef]">
                Status
                <select
                  className="beast-input min-w-0"
                  value={status}
                  onChange={(event) =>
                    setStatus(event.target.value as HealthRecordStatus)
                  }
                >
                  {statusOptions.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <label className="grid gap-2 text-sm font-bold text-[#dbe3ef]">
              {definition.sourceLabel}
              <input
                className="beast-input min-w-0"
                maxLength={300}
                value={source}
                onChange={(event) => setSource(event.target.value)}
              />
            </label>
            <label className="grid gap-2 text-sm font-bold text-[#dbe3ef]">
              Private notes
              <textarea
                className="beast-input min-h-24 min-w-0 resize-y"
                maxLength={4000}
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
              />
            </label>
            <button
              type="submit"
              className="beast-button-primary min-h-11 w-full sm:w-fit"
              disabled={saving || loading || !ownerId}
            >
              {saving ? "Saving…" : `Save ${definition.singular}`}
            </button>
          </form>
        </DashboardCard>

        <DashboardCard accent="red">
          <SectionHeader
            eyebrow="Private records"
            title={`${definition.title} history`}
            description="Only records saved by the signed-in owner appear here."
          />
          {error ? (
            <p className="mt-4 rounded-xl border border-amber-300/30 bg-amber-300/10 p-4 text-sm leading-6 text-amber-100" role="alert">
              {error}
            </p>
          ) : null}
          <div className="mt-5">
            {loading ? (
              <p role="status" className="text-sm text-[#c7cfdb]">
                Loading health records…
              </p>
            ) : visibleRecords.length ? (
              <RecordList
                records={visibleRecords}
                onArchive={(record) => void archiveRecord(record)}
                pendingId={pendingId}
              />
            ) : (
              <GuidedEmptyState
                title={`No ${definition.title.toLowerCase()} saved`}
                description="No placeholder or example health records are shown."
                guidance={definition.guidance}
                nextAction={{ label: "Review Health Overview", href: "/dashboard/health" }}
              />
            )}
          </div>
        </DashboardCard>
      </section>
    </BeastHealthShell>
  );
}

export function HealthOverviewWorkspace() {
  const { records, loading, error } = useHealthRecords();
  const overview = useMemo(() => buildHealthOverview(records), [records]);
  const recent = useMemo(() => buildHealthTimeline(records).slice(0, 5), [records]);

  return (
    <BeastHealthShell
      title="Health Overview"
      description="A private, owner-controlled view of your BeastHealth records."
    >
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricTile label="Active records" value={String(overview.totalRecords)} detail="Excludes archived records" icon="HR" tone="red" />
        <MetricTile label="Conditions" value={String(overview.counts.condition)} detail="Owner-entered records" icon="CO" tone="red" />
        <MetricTile label="Medications" value={String(overview.counts.medication)} detail="Owner-entered records" icon="RX" tone="purple" />
        <MetricTile label="Providers" value={String(overview.counts.provider)} detail="Private directory" icon="PD" tone="blue" />
      </section>

      {error ? (
        <p className="rounded-xl border border-amber-300/30 bg-amber-300/10 p-4 text-sm leading-6 text-amber-100" role="alert">
          {error}
        </p>
      ) : null}

      <section className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <DashboardCard accent="health">
          <SectionHeader
            eyebrow="Health areas"
            title="Build the record at your pace"
            description="Every count comes from saved owner records. Empty areas remain explicit."
          />
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            {healthRecordKinds.map((kind) => {
              const definition = healthWorkspaceDefinitions[kind];
              const href = healthWorkspaceHrefs[kind];
              return (
                <Link
                  key={kind}
                  href={href}
                  className="rounded-xl border border-white/10 bg-white/[0.03] p-4 transition hover:border-red-300/30 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-300"
                >
                  <div className="flex items-center justify-between gap-3">
                    <h3 className="font-black text-white">{definition.title}</h3>
                    <span className="rounded-full border border-white/10 px-2 py-1 text-xs font-bold text-red-100">
                      {overview.counts[kind]}
                    </span>
                  </div>
                  <p className="mt-2 text-sm leading-6 text-[#aeb8c7]">
                    {definition.description}
                  </p>
                </Link>
              );
            })}
          </div>
        </DashboardCard>

        <DashboardCard accent="beastos">
          <SectionHeader
            eyebrow="Health Advisor readiness"
            title="Prepared, not activated"
            description="The data and shared platform boundaries are ready for future governed integration."
          />
          <dl className="mt-5 grid gap-3 text-sm">
            <div className="rounded-xl border border-white/10 p-4">
              <dt className="font-black text-white">Health Advisor</dt>
              <dd className="mt-1 text-[#c7cfdb]">{healthAdvisorReadiness.status}</dd>
            </div>
            <div className="rounded-xl border border-white/10 p-4">
              <dt className="font-black text-white">Execution and recommendations</dt>
              <dd className="mt-1 text-[#c7cfdb]">Disabled</dd>
            </div>
            <div className="rounded-xl border border-white/10 p-4">
              <dt className="font-black text-white">Confidence and outcome learning</dt>
              <dd className="mt-1 text-[#c7cfdb]">Prepared contracts; no active health records</dd>
            </div>
          </dl>
          <Link href="/dashboard/health/ai-advisor" className="beast-button-secondary mt-4 inline-flex">
            Review safety boundary
          </Link>
        </DashboardCard>
      </section>

      <DashboardCard accent="health">
        <SectionHeader
          eyebrow="Recent record activity"
          title="Health Timeline preview"
          description="Chronology is derived only from saved records and dates."
        />
        <div className="mt-5">
          {loading ? (
            <p role="status" className="text-sm text-[#c7cfdb]">Loading health records…</p>
          ) : recent.length ? (
            <div className="grid gap-3">
              {recent.map((item) => (
                <div key={item.id} className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
                  <p className="text-xs font-black uppercase tracking-wide text-red-200">{formatKind(item.recordType)} · {formatDate(item.date)}</p>
                  <p className="mt-2 font-black text-white">{item.title}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="rounded-xl border border-white/10 p-4 text-sm leading-6 text-[#c7cfdb]">
              No health activity exists yet. BeastHealth does not create sample records.
            </p>
          )}
        </div>
        <Link href="/dashboard/health/timeline" className="beast-button-secondary mt-4 inline-flex">
          Open Health Timeline
        </Link>
      </DashboardCard>
    </BeastHealthShell>
  );
}

export function HealthTimelineWorkspace() {
  const { records, loading, error } = useHealthRecords();
  const timeline = useMemo(() => buildHealthTimeline(records), [records]);
  return (
    <BeastHealthShell
      title="Health Timeline"
      description="A chronological view derived from owner-entered BeastHealth records."
    >
      <DashboardCard accent="health">
        <SectionHeader
          eyebrow="Chronology"
          title="Health record history"
          description="Dates and sources remain visible. No event or trend is inferred."
        />
        {error ? <p className="mt-4 rounded-xl border border-amber-300/30 bg-amber-300/10 p-4 text-sm text-amber-100" role="alert">{error}</p> : null}
        <div className="mt-5">
          {loading ? (
            <p role="status" className="text-sm text-[#c7cfdb]">Loading timeline…</p>
          ) : timeline.length ? (
            <ol className="grid gap-3">
              {timeline.map((item) => (
                <li key={item.id} className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
                  <p className="text-xs font-black uppercase tracking-wide text-red-200">{formatDate(item.date)} · {formatKind(item.recordType)}</p>
                  <h2 className="mt-2 font-black text-white">{item.title}</h2>
                  <p className="mt-1 text-sm text-[#c7cfdb]">{item.status}{item.source ? ` · Source: ${item.source}` : ""}</p>
                </li>
              ))}
            </ol>
          ) : (
            <GuidedEmptyState
              title="No health timeline yet"
              description="The timeline appears after you save a dated health record."
              guidance="No placeholder health activity is generated."
              nextAction={{ label: "Open Health Overview", href: "/dashboard/health" }}
            />
          )}
        </div>
      </DashboardCard>
    </BeastHealthShell>
  );
}
