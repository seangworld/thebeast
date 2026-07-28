"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  DashboardCard,
  GuidedEmptyState,
  MetricTile,
  ModuleBadge,
  SectionHeader,
} from "@/app/components/design/DashboardPrimitives";
import {
  buildHealthAdvisorModel,
  healthAdvisorProfessionalId,
  type HealthAdvisorRecommendation,
  type HealthDocumentContext,
} from "@/lib/health/healthAdvisor";
import {
  normalizeHealthRecord,
  type HealthRecord,
  type HealthRecordRow,
} from "@/lib/health/foundation";
import {
  SupabaseExecutionHistoryStore,
  type ProfessionalExecutionHistory,
  type RecommendationLifecycleStatus,
} from "@/lib/platform/agents";
import {
  getDocumentAISummary,
  loadUserDocuments,
  type BeastDocumentDataClient,
} from "@/lib/platform/documents";
import { createClient } from "@/lib/supabase/client";
import { BeastHealthShell } from "./BeastHealthShell";

function formatDate(value: string | null) {
  if (!value) return "Not recorded";
  const date = new Date(
    /^\d{4}-\d{2}-\d{2}$/.test(value) ? `${value}T12:00:00` : value
  );
  return date.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function buildDocumentContext(
  records: readonly HealthRecord[],
  documents: Awaited<ReturnType<typeof loadUserDocuments>>["documents"]
) {
  const recordReferences: HealthDocumentContext[] = records
    .filter(
      (record) =>
        record.recordType === "document" && record.status !== "archived"
    )
    .map((record) => ({
      id: `health-record:${record.id}`,
      title: record.title,
      sourceLabel: record.source || "Owner-entered BeastHealth reference",
      updatedAt: record.updatedAt,
      permission: "Not Requested",
    }));
  const sharedDocuments: HealthDocumentContext[] = documents
    .filter(
      (document) =>
        document.category === "Health" &&
        document.status !== "Archived" &&
        document.status !== "Deleted"
    )
    .map((document) => {
      const intelligence = getDocumentAISummary(document);
      return {
        id: document.id,
        title: document.title,
        sourceLabel: intelligence.sourceLabel,
        updatedAt: document.updatedAt,
        permission: intelligence.permission,
        summary: intelligence.summary,
      };
    });
  return [...sharedDocuments, ...recordReferences];
}

export function HealthAdvisorWorkspace() {
  const [ownerId, setOwnerId] = useState("");
  const [records, setRecords] = useState<HealthRecord[]>([]);
  const [documents, setDocuments] = useState<HealthDocumentContext[]>([]);
  const [history, setHistory] = useState<ProfessionalExecutionHistory>();
  const [store, setStore] = useState<SupabaseExecutionHistoryStore | null>(
    null
  );
  const [loading, setLoading] = useState(true);
  const [dataError, setDataError] = useState("");
  const [historyError, setHistoryError] = useState("");
  const [pendingId, setPendingId] = useState("");

  async function refreshHistory(
    nextStore = store,
    selectedOwnerId = ownerId
  ) {
    if (!nextStore || !selectedOwnerId) return;
    setHistory(
      await nextStore.listProfessionalHistory(
        selectedOwnerId,
        healthAdvisorProfessionalId
      )
    );
  }

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      const client = createClient();
      const { data: auth, error: authError } = await client.auth.getUser();
      if (authError) throw authError;
      const userId = auth.user?.id;
      if (!userId) throw new Error("Sign in is required.");
      const [healthResult, documentResult] = await Promise.all([
        client
          .from("beast_health_records")
          .select(
            "id, owner_id, record_type, title, status, occurred_on, source, details, notes, created_at, updated_at"
          )
          .eq("owner_id", userId)
          .order("occurred_on", { ascending: false, nullsFirst: false })
          .order("created_at", { ascending: false }),
        loadUserDocuments(client as unknown as BeastDocumentDataClient),
      ]);
      if (healthResult.error) throw healthResult.error;
      const nextRecords = (
        (healthResult.data || []) as HealthRecordRow[]
      )
        .map(normalizeHealthRecord)
        .filter((record): record is HealthRecord => Boolean(record));
      const nextStore = new SupabaseExecutionHistoryStore(client);
      if (cancelled) return;
      setOwnerId(userId);
      setRecords(nextRecords);
      setDocuments(
        buildDocumentContext(nextRecords, documentResult.documents)
      );
      setStore(nextStore);
      setDataError(
        documentResult.status === "unavailable"
          ? "Medical documents are temporarily unavailable. Health Advisor is using BeastHealth records only."
          : ""
      );
      try {
        await refreshHistory(nextStore, userId);
        if (!cancelled) setHistoryError("");
      } catch {
        if (!cancelled) {
          setHistoryError(
            "Recommendation history is unavailable. Record summaries remain available, but decisions and outcomes cannot be saved."
          );
        }
      }
      if (!cancelled) setLoading(false);
    }
    void load().catch(() => {
      if (cancelled) return;
      setDataError(
        "Health Advisor could not load owner health records. No health summary or recommendation was generated."
      );
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
    // The initial owner-scoped load creates the history store for later actions.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const model = useMemo(
    () => buildHealthAdvisorModel({ records, documents, history }),
    [documents, history, records]
  );

  async function decideRecommendation(
    recommendation: HealthAdvisorRecommendation,
    nextStatus: Extract<
      RecommendationLifecycleStatus,
      "accepted" | "declined" | "deferred"
    >
  ) {
    if (!store || !ownerId) {
      setHistoryError(
        "Recommendation decisions cannot be saved until Execution History is available."
      );
      return;
    }
    setPendingId(recommendation.sourceRecommendationId);
    setHistoryError("");
    try {
      let lifecycle = recommendation.lifecycle;
      let requestStatus = lifecycle
        ? history?.requests.find(
            (request) => request.id === lifecycle?.requestId
          )?.status
        : undefined;
      if (!lifecycle) {
        const requestId = await store.create({
          professionalId: healthAdvisorProfessionalId,
          requestType: "health_record_recommendation_review",
          title: recommendation.title,
          actionClassification: "recommendation_only",
          contextReferences: [{
            source: "beasthealth",
            sourceRecommendationId: recommendation.sourceRecommendationId,
          }],
          limitations: recommendation.limitations,
        });
        await store.transition(
          requestId,
          "analyzing",
          "owner",
          { source: "health_advisor_record_review" },
          recommendation.supportingEvidence
        );
        requestStatus = "analyzing";
        lifecycle = await store.createRecommendation({
          ownerId,
          requestId,
          professionalId: healthAdvisorProfessionalId,
          title: recommendation.title,
          recommendation: recommendation.recommendation,
          confidence: recommendation.confidence,
          limitations: recommendation.limitations,
          supportingEvidence: [{
            source: "beasthealth",
            sourceRecommendationId: recommendation.sourceRecommendationId,
          }, ...recommendation.supportingEvidence],
        });
      }
      if (lifecycle.status !== nextStatus) {
        await store.transitionRecommendation({
          recommendationId: lifecycle.id,
          status: nextStatus,
          reason: `Owner selected ${nextStatus} in Health Advisor.`,
          confidence: recommendation.confidence,
          limitations: recommendation.limitations,
          supportingEvidence: recommendation.supportingEvidence,
        });
      }
      await store.recordDecision({
        ownerId,
        requestId: lifecycle.requestId,
        decisionScope: "owner",
        decision: nextStatus === "accepted" ? "approved" : nextStatus,
        reason: `Health Advisor organizational recommendation ${nextStatus}.`,
        limitationsAcknowledged: recommendation.limitations,
      });
      if (requestStatus === "queued" || requestStatus === "awaiting_context") {
        await store.transition(
          lifecycle.requestId,
          "analyzing",
          "owner",
          { recommendationStatus: nextStatus }
        );
      }
      if (requestStatus === "analyzing") {
        await store.transition(
          lifecycle.requestId,
          nextStatus === "accepted"
            ? "approved"
            : nextStatus === "deferred"
              ? "awaiting_context"
              : "canceled",
          "owner",
          { recommendationStatus: nextStatus }
        );
      }
      await refreshHistory();
    } catch {
      setHistoryError(
        "The decision could not be saved. No health record or clinical action was changed."
      );
    } finally {
      setPendingId("");
    }
  }

  async function recordOutcome(
    recommendation: HealthAdvisorRecommendation,
    outcomeStatus: "successful" | "neutral" | "unsuccessful"
  ) {
    if (!store || !ownerId || !recommendation.lifecycle) return;
    setPendingId(recommendation.sourceRecommendationId);
    setHistoryError("");
    const learning =
      outcomeStatus === "successful"
        ? "Owner reported that this guidance helped with record review or appointment preparation."
        : outcomeStatus === "neutral"
          ? "Owner reported no clear preparation benefit from this guidance."
          : "Owner reported that this guidance did not help with preparation.";
    try {
      const request = history?.requests.find(
        (item) => item.id === recommendation.lifecycle?.requestId
      );
      if (request?.status === "approved") {
        await store.transition(
          request.id,
          "executing",
          "owner",
          { source: "owner_reported_preparation_outcome" }
        );
      }
      await store.recordResultAndOutcome({
        ownerId,
        requestId: recommendation.lifecycle.requestId,
        outcomeStatus,
        recommendationTitle: recommendation.title,
        memberLearning: [learning],
        actualResult: {
          source: "owner_report",
          status: outcomeStatus,
          scope: "record_review_or_appointment_preparation",
        },
        limitations: [
          "This measures preparation usefulness, not a medical or treatment outcome.",
          "The report was not independently verified.",
        ],
        supportingEvidence: [{
          source: "owner_report",
          sourceRecommendationId: recommendation.sourceRecommendationId,
        }],
      });
      await store.transitionRecommendation({
        recommendationId: recommendation.lifecycle.id,
        status: "completed",
        reason: learning,
      });
      if (request?.status === "approved") {
        await store.transition(
          request.id,
          "completed",
          "owner",
          {
            outcomeStatus,
            source: "owner_report",
            scope: "preparation_usefulness",
          }
        );
      }
      await refreshHistory();
    } catch {
      setHistoryError(
        "The outcome could not be saved. No health record or clinical action was changed."
      );
    } finally {
      setPendingId("");
    }
  }

  return (
    <BeastHealthShell
      title="Health Advisor"
      description="Evidence-backed record review and appointment preparation within strict medical safety boundaries."
    >
      <section className="space-y-6" aria-label="Health Advisor workspace" data-health-advisor-active="true">
        <DashboardCard accent="health">
          <SectionHeader eyebrow="Executive Health Briefing" title={model.executiveBriefing.title} description={model.executiveBriefing.summary} action={<ModuleBadge module="health" label="Advisor active" />} />
          <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <MetricTile label="Health records" value={String(model.executiveBriefing.totalRecords)} detail="Excludes archived" icon="HR" tone="red" />
            <MetricTile label="Health areas" value={String(model.executiveBriefing.populatedAreas)} detail="Saved areas only" icon="HA" tone="purple" />
            <MetricTile label="Medical documents" value={String(model.executiveBriefing.documentCount)} detail="Owner-authorized context" icon="MD" tone="blue" />
            <MetricTile label="Last record update" value={formatDate(model.executiveBriefing.lastUpdatedAt)} detail="Freshness, not clinical status" icon="LU" tone="yellow" />
          </div>
          {loading ? <p className="mt-4 text-sm text-[#c7cfdb]" role="status">Loading owner-authorized health context…</p> : null}
          {dataError ? <p className="mt-4 rounded-xl border border-amber-300/30 bg-amber-300/10 p-4 text-sm leading-6 text-amber-100" role="alert">{dataError}</p> : null}
        </DashboardCard>

        <div className="grid gap-6 xl:grid-cols-2">
          <DashboardCard accent="health">
            <SectionHeader eyebrow="Medication Review" title="Saved medication list" description="Names, schedules, dates, and sources are shown exactly from owner records. Health Advisor does not check interactions or change medications." />
            <div className="mt-4 grid gap-3">
              {model.medicationReview.length ? model.medicationReview.map((item) => (
                <article key={item.id} className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
                  <div className="flex flex-wrap justify-between gap-2"><h3 className="font-black text-white">{item.title}</h3><span className="text-xs font-bold text-red-100">{item.status}</span></div>
                  {item.context ? <p className="mt-2 text-sm leading-6 text-[#c7cfdb]">{item.context}</p> : null}
                  <p className="mt-2 text-xs text-[#9aa7b8]">Date: {formatDate(item.date)} · Source: {item.source || "Not recorded"}</p>
                </article>
              )) : <GuidedEmptyState title="No medications saved" description="Health Advisor will not infer a medication list." guidance="Add a medication only from information you know, then verify it with a qualified clinician or pharmacist." nextAction={{ label: "Open Medications", href: "/dashboard/health/medications" }} />}
            </div>
          </DashboardCard>

          <DashboardCard accent="blue">
            <SectionHeader eyebrow="Appointment Preparation" title={model.appointmentPreparation.nextAppointment?.title || "No upcoming appointment saved"} description={model.appointmentPreparation.nextAppointment ? `Saved date: ${formatDate(model.appointmentPreparation.nextAppointment.occurredOn)}` : "Add an appointment to organize questions and records without inventing care priorities."} />
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <div className="rounded-xl border border-white/10 p-4"><p className="text-xs font-black uppercase text-blue-200">Records to review</p><p className="mt-2 text-2xl font-black text-white">{model.appointmentPreparation.recordsToReview.length}</p></div>
              <div className="rounded-xl border border-white/10 p-4"><p className="text-xs font-black uppercase text-blue-200">Documents to review</p><p className="mt-2 text-2xl font-black text-white">{model.appointmentPreparation.documentsToReview.length}</p></div>
            </div>
            <Link href="/dashboard/health/appointments" className="beast-button-secondary mt-4 inline-flex">Manage appointments</Link>
          </DashboardCard>
        </div>

        <DashboardCard accent="beastos">
          <SectionHeader eyebrow="Questions for Providers" title="Bring questions, not conclusions" description="These prompts organize known records. A qualified clinician decides what is medically relevant." />
          <ol className="mt-4 grid gap-3 md:grid-cols-2">
            {model.appointmentPreparation.questions.map((question, index) => <li key={question} className="rounded-xl border border-white/10 bg-white/[0.03] p-4 text-sm leading-6 text-[#dbe3ef]"><span className="mr-2 font-black text-red-200">{index + 1}.</span>{question}</li>)}
          </ol>
        </DashboardCard>

        <div className="grid gap-6 xl:grid-cols-2">
          <DashboardCard accent="documents">
            <SectionHeader eyebrow="Document Understanding" title="Permissioned medical document context" description="Only saved summaries with explicit permission are shown. Original documents and clinician interpretation remain authoritative." />
            <div className="mt-4 grid gap-3">
              {model.documentUnderstanding.length ? model.documentUnderstanding.map((document) => (
                <article key={document.id} className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
                  <div className="flex flex-wrap justify-between gap-2"><h3 className="font-black text-white">{document.title}</h3><span className="text-xs font-bold text-red-100">{document.permission}</span></div>
                  <p className="mt-2 text-xs text-[#9aa7b8]">{document.sourceLabel} · Updated {formatDate(document.updatedAt)}</p>
                  <p className="mt-3 text-sm leading-6 text-[#c7cfdb]">{document.summary || (document.permission === "Blocked" ? "Document understanding is blocked by owner-controlled permission." : "No permissioned summary is available. Health Advisor will not infer document contents.")}</p>
                </article>
              )) : <p className="rounded-xl border border-white/10 p-4 text-sm leading-6 text-[#c7cfdb]">No medical document context is available. Health Advisor does not generate placeholder summaries.</p>}
            </div>
            <Link href="/dashboard/uploads" className="beast-button-secondary mt-4 inline-flex">Review BeastDocuments</Link>
          </DashboardCard>

          <DashboardCard accent="health">
            <SectionHeader eyebrow="Timeline Summaries" title={`${model.timelineSummary.totalEvents} saved timeline event${model.timelineSummary.totalEvents === 1 ? "" : "s"}`} description="The summary groups and orders saved records. It does not infer trends, causes, or clinical meaning." />
            <div className="mt-4 flex flex-wrap gap-2">{model.timelineSummary.byType.map((item) => <span key={item.kind} className="rounded-full border border-white/10 px-3 py-2 text-xs font-bold text-[#dbe3ef]">{item.kind.replace("_", " ")} · {item.count}</span>)}</div>
            <div className="mt-4 grid gap-3">{model.timelineSummary.recentEvents.slice(0, 4).map((event) => <div key={event.id} className="rounded-xl border border-white/10 p-4"><p className="text-xs font-black uppercase text-red-200">{formatDate(event.date)} · {event.recordType.replace("_", " ")}</p><p className="mt-2 font-black text-white">{event.title}</p></div>)}</div>
            <Link href="/dashboard/health/timeline" className="beast-button-secondary mt-4 inline-flex">Open Health Timeline</Link>
          </DashboardCard>
        </div>

        <DashboardCard accent="health">
          <SectionHeader eyebrow="Health Recommendations" title="Review organizational suggestions" description="Accepting records a decision in Execution History. It never changes care, medication, appointments, or clinical records automatically." action={history === undefined && !historyError ? <span className="text-xs text-[#9aa7b8]" role="status">Loading history…</span> : undefined} />
          {historyError ? <p className="mt-4 rounded-xl border border-amber-300/30 bg-amber-300/10 p-4 text-sm leading-6 text-amber-100" role="alert">{historyError}</p> : null}
          <div className="mt-5 grid gap-4 lg:grid-cols-2">
            {model.recommendations.length ? model.recommendations.map((recommendation) => {
              const lifecycle = recommendation.lifecycle;
              const pending = pendingId === recommendation.sourceRecommendationId;
              return (
                <article key={recommendation.sourceRecommendationId} className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-xs font-black uppercase text-red-200">{lifecycle?.status || "proposed"}</p><h3 className="mt-2 font-black text-white">{recommendation.title}</h3></div><span className="rounded-full border border-white/10 px-3 py-1 text-xs font-bold text-[#dbe3ef]">{recommendation.confidence.label} · {recommendation.confidence.score}%</span></div>
                  <p className="mt-3 text-sm leading-6 text-[#c7cfdb]">{recommendation.recommendation}</p>
                  <details className="mt-4 rounded-xl border border-white/10 p-3"><summary className="cursor-pointer text-sm font-bold text-red-100">Evidence, confidence, and limitations</summary><p className="mt-3 text-xs leading-5 text-[#9aa7b8]">{recommendation.confidence.basis}</p><ul className="mt-2 list-disc space-y-1 pl-5 text-xs leading-5 text-[#9aa7b8]">{recommendation.limitations.map((item) => <li key={item}>{item}</li>)}</ul></details>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <Link href={recommendation.href} className="beast-button-secondary inline-flex min-h-11 items-center">Review source</Link>
                    {(!lifecycle || ["proposed", "deferred"].includes(lifecycle.status)) ? <button type="button" className="beast-button min-h-11" disabled={pending || !store} onClick={() => { void decideRecommendation(recommendation, "accepted"); }}>Accept for review</button> : null}
                    {(!lifecycle || lifecycle.status === "proposed") ? <button type="button" className="beast-button-secondary min-h-11" disabled={pending || !store} onClick={() => { void decideRecommendation(recommendation, "deferred"); }}>Defer</button> : null}
                    {(!lifecycle || ["proposed", "deferred"].includes(lifecycle.status)) ? <button type="button" className="beast-button-secondary min-h-11" disabled={pending || !store} onClick={() => { void decideRecommendation(recommendation, "declined"); }}>Decline</button> : null}
                  </div>
                  {lifecycle?.status === "accepted" ? <div className="mt-4 border-t border-white/10 pt-4"><p className="text-xs font-bold text-[#c7cfdb]">Did this help with record review or appointment preparation?</p><div className="mt-2 flex flex-wrap gap-2"><button type="button" className="beast-button-secondary min-h-11" disabled={pending} onClick={() => { void recordOutcome(recommendation, "successful"); }}>It helped</button><button type="button" className="beast-button-secondary min-h-11" disabled={pending} onClick={() => { void recordOutcome(recommendation, "neutral"); }}>No clear change</button><button type="button" className="beast-button-secondary min-h-11" disabled={pending} onClick={() => { void recordOutcome(recommendation, "unsuccessful"); }}>It did not help</button></div></div> : null}
                </article>
              );
            }) : <p className="rounded-xl border border-white/10 p-4 text-sm leading-6 text-[#c7cfdb]">No evidence-backed organizational recommendation is available from the current records.</p>}
          </div>
        </DashboardCard>

        <DashboardCard accent="blue">
          <SectionHeader eyebrow="Outcomes" title="Learning from preparation outcomes" description="Learning appears only after the owner reports whether accepted guidance helped with preparation. It never treats a health outcome as caused by Health Advisor." />
          <div className="mt-4 grid gap-3">
            {model.outcomeLearning.length ? model.outcomeLearning.map((outcome) => <article key={outcome.id} className="rounded-xl border border-white/10 p-4"><div className="flex flex-wrap justify-between gap-2"><h3 className="font-black text-white">{outcome.recommendationTitle}</h3><span className="text-xs font-bold text-blue-100">{outcome.status} · {formatDate(outcome.recordedAt)}</span></div><ul className="mt-2 list-disc space-y-1 pl-5 text-sm leading-6 text-[#c7cfdb]">{outcome.learning.map((item) => <li key={item}>{item}</li>)}</ul></article>) : <p className="rounded-xl border border-white/10 p-4 text-sm leading-6 text-[#c7cfdb]">No preparation outcomes have been reported. No learning is inferred.</p>}
          </div>
        </DashboardCard>

        <DashboardCard accent="beastos">
          <SectionHeader eyebrow="Medical Safety Boundary" title="Health Advisor never diagnoses or replaces clinicians" description="Every summary and recommendation remains subordinate to original records, qualified clinical judgment, and emergency services." />
          <ul className="mt-4 list-disc space-y-2 pl-5 text-sm leading-6 text-[#dbe3ef]">{model.safety.map((item) => <li key={item}>{item}</li>)}</ul>
          <p className="mt-4 rounded-xl border border-red-300/25 bg-red-300/[0.08] p-4 text-sm font-semibold leading-6 text-red-50">If you may be experiencing an urgent or emergency health concern, use appropriate local emergency or qualified clinical care instead of BeastHealth.</p>
        </DashboardCard>
      </section>
    </BeastHealthShell>
  );
}
