"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import {
  DashboardCard,
  GuidedEmptyState,
  SectionHeader,
} from "@/app/components/design/DashboardPrimitives";
import {
  buildHealthTimeline,
  healthWorkspaceDefinitions,
  healthWorkspaceHrefs,
  normalizeHealthRecord,
  type HealthRecord,
  type HealthRecordKind,
  type HealthRecordRow,
  type HealthRecordStatus,
} from "@/lib/health/foundation";
import { buildHealthAdvisorModel } from "@/lib/health/healthAdvisor";
import { createClient } from "@/lib/supabase/client";
import { BeastHealthShell } from "./BeastHealthShell";

const statusOptions: HealthRecordStatus[] = [
  "active",
  "historical",
  "resolved",
  "planned",
];

const healthWorkspacePresentation: Record<
  HealthRecordKind,
  {
    eyebrow: string;
    collectionTitle: string;
    collectionDescription: string;
    emptyGuidance: string;
  }
> = {
  profile: {
    eyebrow: "Personal health context",
    collectionTitle: "Your health background",
    collectionDescription:
      "Keep the background, preferences, and care context you want available during preparation.",
    emptyGuidance:
      "Start with one confirmed piece of health context that would help you prepare for a clinician conversation.",
  },
  condition: {
    eyebrow: "Known conditions",
    collectionTitle: "Condition record",
    collectionDescription:
      "Review the conditions and statuses you entered without adding diagnostic interpretation.",
    emptyGuidance:
      "Add only a condition you already know, using the wording and source available to you.",
  },
  medication: {
    eyebrow: "Medication organization",
    collectionTitle: "Medication list",
    collectionDescription:
      "Keep names, schedules, sources, and status together for clinician or pharmacist review.",
    emptyGuidance:
      "Add a medication from a label, prescription, or other source you can verify.",
  },
  procedure: {
    eyebrow: "Procedure history",
    collectionTitle: "Procedure record",
    collectionDescription:
      "Organize procedure dates, facilities, and recovery context without clinical interpretation.",
    emptyGuidance:
      "Add a known procedure and its source so it can appear in your timeline.",
  },
  vital: {
    eyebrow: "Recorded measurements",
    collectionTitle: "Vitals log",
    collectionDescription:
      "Review measurements exactly as entered, including date, unit, and source context.",
    emptyGuidance:
      "Add a dated measurement with its unit and source. BeastHealth will not interpret it.",
  },
  document: {
    eyebrow: "Medical references",
    collectionTitle: "Health document references",
    collectionDescription:
      "Keep health-specific document references easy to find while originals remain authoritative.",
    emptyGuidance:
      "Add a reference to a real document without entering conclusions that are not in the source.",
  },
  lifestyle: {
    eyebrow: "Personal context",
    collectionTitle: "Lifestyle context",
    collectionDescription:
      "Organize owner-entered sleep, movement, nutrition, and wellness context without medical coaching.",
    emptyGuidance:
      "Add a habit or cadence you want available as context for future provider questions.",
  },
  family_history: {
    eyebrow: "Family context",
    collectionTitle: "Family health history",
    collectionDescription:
      "Review sensitive relationship-backed context without inferring personal risk.",
    emptyGuidance:
      "Add only family history you know, including the relationship and source when available.",
  },
  provider: {
    eyebrow: "Care contacts",
    collectionTitle: "Provider directory",
    collectionDescription:
      "Keep practices, specialties, and contact context together for appointment preparation.",
    emptyGuidance:
      "Add a provider or practice you use; confirm credentials and network status independently.",
  },
  appointment: {
    eyebrow: "Visit planning",
    collectionTitle: "Appointments",
    collectionDescription:
      "Review upcoming and historical visits with the preparation context you entered.",
    emptyGuidance:
      "Add a confirmed visit date and verify instructions directly with the provider.",
  },
};

function formatKind(kind: HealthRecordKind) {
  return healthWorkspaceDefinitions[kind].title;
}

function formatDate(value: string | null) {
  if (!value) return "Not recorded";
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
  const activeRecords = visibleRecords.filter(
    (record) => record.status !== "archived"
  );
  const presentation = healthWorkspacePresentation[kind];

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
      <section
        className="grid gap-4 xl:grid-cols-[minmax(0,1.15fr)_minmax(20rem,0.85fr)]"
        data-health-record-purpose={kind}
      >
        <DashboardCard accent="red">
          <SectionHeader
            eyebrow={presentation.eyebrow}
            title={presentation.collectionTitle}
            description={presentation.collectionDescription}
          />
          <div className="mt-4 flex flex-wrap gap-2 text-xs font-bold text-[#c7cfdb]">
            <span className="rounded-full border border-white/10 px-3 py-1.5">
              {activeRecords.length} active
            </span>
            <span className="rounded-full border border-white/10 px-3 py-1.5">
              {visibleRecords.length} total
            </span>
          </div>
          {error ? (
            <p className="mt-4 rounded-xl border border-amber-300/30 bg-amber-300/10 p-4 text-sm leading-6 text-amber-100" role="alert">
              {error}
            </p>
          ) : null}
          <div className="mt-4">
            {loading ? (
              <p role="status" className="text-sm text-[#c7cfdb]">
                Loading {definition.title.toLowerCase()}…
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
                guidance={presentation.emptyGuidance}
                nextAction={{ label: "Ask Health Advisor", href: "/dashboard/health/ai-advisor" }}
              />
            )}
          </div>
        </DashboardCard>

        <DashboardCard accent="health">
          <SectionHeader
            eyebrow="Add verified information"
            title={`Add ${definition.singular}`}
            description={definition.guidance}
          />
          <form className="mt-4 grid gap-3" onSubmit={createRecord}>
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
      </section>
    </BeastHealthShell>
  );
}

export function HealthOverviewWorkspace() {
  const { records, loading, error } = useHealthRecords();
  const model = useMemo(
    () => buildHealthAdvisorModel({ records }),
    [records]
  );
  const recentChanges = useMemo(
    () =>
      records
        .filter((record) => record.status !== "archived")
        .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))
        .slice(0, 4),
    [records]
  );

  return (
    <BeastHealthShell
      title="BeastHealth"
      description="Your Health Advisor-led briefing, preparation, and private health record workspace."
    >
      {error ? (
        <p className="rounded-xl border border-amber-300/30 bg-amber-300/10 p-4 text-sm leading-6 text-amber-100" role="alert">
          {error}
        </p>
      ) : null}

      <section className="space-y-4" aria-label="Health Advisor dashboard">
        <DashboardCard accent="health">
          <SectionHeader
            eyebrow="Executive Health Briefing"
            title={model.executiveBriefing.title}
            description={model.executiveBriefing.summary}
            action={
              <Link
                href="/dashboard/health/ai-advisor"
                className="beast-button inline-flex min-h-11 items-center"
              >
                Open Health Advisor
              </Link>
            }
          />
          <div className="mt-4 flex flex-wrap gap-2 text-xs font-bold text-[#dbe3ef]">
            <span className="rounded-full border border-red-300/20 bg-red-300/[0.06] px-3 py-2">
              {model.executiveBriefing.totalRecords} active records
            </span>
            <span className="rounded-full border border-red-300/20 bg-red-300/[0.06] px-3 py-2">
              {model.executiveBriefing.populatedAreas} populated areas
            </span>
            <span className="rounded-full border border-white/10 px-3 py-2 text-[#aeb8c7]">
              {model.executiveBriefing.lastUpdatedAt
                ? `Updated ${formatDate(model.executiveBriefing.lastUpdatedAt)}`
                : "No saved update"}
            </span>
          </div>
          {loading ? (
            <p className="mt-4 text-sm text-[#c7cfdb]" role="status">
              Loading owner-authorized health context…
            </p>
          ) : null}
        </DashboardCard>

        <div className="grid gap-4 xl:grid-cols-2">
          <DashboardCard accent="health">
            <SectionHeader
              eyebrow="Recent changes"
              title="What changed in your record"
              description="Changes are based only on saved record timestamps."
            />
            <div className="mt-4 grid gap-2">
              {recentChanges.length ? (
                recentChanges.map((record) => (
                  <Link
                    key={record.id}
                    href={healthWorkspaceDefinitions[record.recordType] ? healthWorkspaceHrefs[record.recordType] : "/dashboard/health"}
                    className="flex items-start justify-between gap-3 rounded-xl border border-white/10 bg-white/[0.03] p-3 transition hover:border-red-300/30"
                  >
                    <span>
                      <span className="block text-xs font-black uppercase tracking-wide text-red-200">
                        {formatKind(record.recordType)}
                      </span>
                      <span className="mt-1 block font-bold text-white">{record.title}</span>
                    </span>
                    <span className="shrink-0 text-xs font-bold text-[#9aa7b8]">
                      {formatDate(record.updatedAt)}
                    </span>
                  </Link>
                ))
              ) : (
                <p className="rounded-xl border border-white/10 p-4 text-sm leading-6 text-[#c7cfdb]">
                  No recent record changes exist. BeastHealth does not create sample activity.
                </p>
              )}
            </div>
          </DashboardCard>

          <DashboardCard accent="blue">
            <SectionHeader
              eyebrow="Upcoming appointments"
              title={model.appointmentPreparation.nextAppointment?.title || "No upcoming appointment saved"}
              description={
                model.appointmentPreparation.nextAppointment
                  ? `Saved date: ${formatDate(model.appointmentPreparation.nextAppointment.occurredOn)}. Confirm details directly with the provider.`
                  : "Add a confirmed appointment to prepare questions and records."
              }
            />
            <div className="mt-4 flex flex-wrap gap-2 text-xs font-bold text-[#dbe3ef]">
              <span className="rounded-full border border-white/10 px-3 py-2">
                {model.appointmentPreparation.recordsToReview.length} records to review
              </span>
            </div>
            <Link href="/dashboard/health/appointments" className="beast-button-secondary mt-4 inline-flex">
              Manage appointments
            </Link>
          </DashboardCard>
        </div>

        <div className="grid gap-4 xl:grid-cols-2">
          <DashboardCard accent="health">
            <SectionHeader
              eyebrow="Medication summary"
              title={`${model.medicationReview.length} saved medication${model.medicationReview.length === 1 ? "" : "s"}`}
              description="Names and schedules are shown exactly from owner records. No interaction or prescription guidance is provided."
            />
            <div className="mt-4 grid gap-2">
              {model.medicationReview.slice(0, 4).map((medication) => (
                <div key={medication.id} className="rounded-xl border border-white/10 p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="font-bold text-white">{medication.title}</p>
                    <span className="text-xs font-bold text-red-100">{medication.status}</span>
                  </div>
                  {medication.context ? (
                    <p className="mt-1 text-sm text-[#c7cfdb]">{medication.context}</p>
                  ) : null}
                </div>
              ))}
              {!model.medicationReview.length ? (
                <p className="rounded-xl border border-white/10 p-4 text-sm leading-6 text-[#c7cfdb]">
                  No medication records exist. Health Advisor will not infer a medication list.
                </p>
              ) : null}
            </div>
            <Link href="/dashboard/health/medications" className="beast-button-secondary mt-4 inline-flex">
              Review medications
            </Link>
          </DashboardCard>

          <DashboardCard accent="beastos">
            <SectionHeader
              eyebrow="Timeline summary"
              title={`${model.timelineSummary.totalEvents} saved event${model.timelineSummary.totalEvents === 1 ? "" : "s"}`}
              description="This is an organizational chronology, not a clinical trend analysis."
            />
            <div className="mt-4 flex flex-wrap gap-2">
              {model.timelineSummary.byType.map((item) => (
                <span key={item.kind} className="rounded-full border border-white/10 px-3 py-2 text-xs font-bold text-[#dbe3ef]">
                  {formatKind(item.kind)} · {item.count}
                </span>
              ))}
              {!model.timelineSummary.byType.length ? (
                <p className="text-sm leading-6 text-[#c7cfdb]">No dated health activity exists yet.</p>
              ) : null}
            </div>
            <Link href="/dashboard/health/timeline" className="beast-button-secondary mt-4 inline-flex">
              Open Health Timeline
            </Link>
          </DashboardCard>
        </div>

        <DashboardCard accent="blue">
          <SectionHeader
            eyebrow="Suggested questions for providers"
            title="Prepare questions, not conclusions"
            description="Questions are derived from saved context. A qualified clinician determines what is medically relevant."
          />
          <ol className="mt-4 grid gap-3 md:grid-cols-2">
            {model.appointmentPreparation.questions.map((question, index) => (
              <li key={question} className="rounded-xl border border-white/10 bg-white/[0.03] p-4 text-sm leading-6 text-[#dbe3ef]">
                <span className="mr-2 font-black text-red-200">{index + 1}.</span>
                {question}
              </li>
            ))}
          </ol>
        </DashboardCard>

        <DashboardCard accent="health">
          <SectionHeader
            eyebrow="Recommended actions"
            title="Organize the next review"
            description="These actions organize records and preparation only. They do not diagnose, prescribe, or change care."
          />
          <div className="mt-4 grid gap-3 lg:grid-cols-2">
            {model.recommendations.length ? (
              model.recommendations.slice(0, 4).map((recommendation) => (
                <article key={recommendation.sourceRecommendationId} className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <h3 className="font-black text-white">{recommendation.title}</h3>
                    <span className="rounded-full border border-white/10 px-2 py-1 text-xs font-bold text-[#dbe3ef]">
                      {recommendation.confidence.label} support
                    </span>
                  </div>
                  <p className="mt-2 text-sm leading-6 text-[#c7cfdb]">{recommendation.recommendation}</p>
                  <Link href={recommendation.href} className="mt-3 inline-flex text-sm font-black text-red-100 underline decoration-red-300/40 underline-offset-4">
                    Review source
                  </Link>
                </article>
              ))
            ) : (
              <p className="rounded-xl border border-white/10 p-4 text-sm leading-6 text-[#c7cfdb]">
                No evidence-backed organizational action is available from the current records.
              </p>
            )}
          </div>
          <p className="mt-4 rounded-xl border border-red-300/25 bg-red-300/[0.08] p-4 text-sm font-semibold leading-6 text-red-50">
            Health Advisor never diagnoses or prescribes. Original records and qualified clinicians remain authoritative.
          </p>
        </DashboardCard>
      </section>
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
