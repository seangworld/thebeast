"use client";

import Link from "next/link";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
} from "react";
import {
  ProfessionalKnowledgeWorkspace,
  type ProfessionalKnowledgeConfidence,
  type ProfessionalKnowledgeItem,
  type ProfessionalKnowledgeModel,
} from "@/app/components/agents";
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
  buildHealthAdvisorDataState,
  buildHealthAdvisorGreeting,
  healthAdvisorIntroduction,
  resolveHealthAdvisorMemberName,
  type HealthAdvisorIdentityProfile,
} from "@/lib/health/healthAdvisorPresentation";
import {
  healthWorkspaceHrefs,
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
  const [memberName, setMemberName] = useState<string | null>(null);
  const [memberTimeZone, setMemberTimeZone] = useState<string | null>(null);
  const [localNow, setLocalNow] = useState<Date | null>(null);
  const [records, setRecords] = useState<HealthRecord[]>([]);
  const [documents, setDocuments] = useState<HealthDocumentContext[]>([]);
  const [history, setHistory] = useState<ProfessionalExecutionHistory>();
  const [store, setStore] = useState<SupabaseExecutionHistoryStore | null>(
    null
  );
  const [loading, setLoading] = useState(true);
  const [recordsUnavailable, setRecordsUnavailable] = useState(false);
  const [dataError, setDataError] = useState("");
  const [historyError, setHistoryError] = useState("");
  const [pendingId, setPendingId] = useState("");
  const [knowledgePrompt, setKnowledgePrompt] =
    useState<ProfessionalKnowledgeItem | null>(null);
  const [knowledgeAnswer, setKnowledgeAnswer] = useState("");
  const [pendingKnowledgeAnswer, setPendingKnowledgeAnswer] = useState("");
  const [knowledgeSaveState, setKnowledgeSaveState] = useState<
    "idle" | "review" | "saving" | "saved" | "error"
  >("idle");
  const knowledgeInputRef = useRef<HTMLTextAreaElement>(null);

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
    setLocalNow(new Date());
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      const client = createClient();
      const { data: auth, error: authError } = await client.auth.getUser();
      if (authError) throw authError;
      const userId = auth.user?.id;
      if (!userId) throw new Error("Sign in is required.");
      const [healthResult, documentResult, profileResult] = await Promise.all([
        client
          .from("beast_health_records")
          .select(
            "id, owner_id, record_type, title, status, occurred_on, source, details, notes, created_at, updated_at"
          )
          .eq("owner_id", userId)
          .order("occurred_on", { ascending: false, nullsFirst: false })
          .order("created_at", { ascending: false }),
        loadUserDocuments(client as unknown as BeastDocumentDataClient),
        client
          .from("profiles")
          .select(
            "preferred_name, display_name, full_name, username, timezone"
          )
          .eq("id", userId)
          .maybeSingle(),
      ]);
      if (healthResult.error) throw healthResult.error;
      const nextRecords = (
        (healthResult.data || []) as HealthRecordRow[]
      )
        .map(normalizeHealthRecord)
        .filter((record): record is HealthRecord => Boolean(record));
      const nextStore = new SupabaseExecutionHistoryStore(client);
      if (cancelled) return;
      const profile = profileResult.error
        ? null
        : (profileResult.data as HealthAdvisorIdentityProfile | null);
      setOwnerId(userId);
      setMemberName(resolveHealthAdvisorMemberName(profile, auth.user));
      setMemberTimeZone(profile?.timezone || null);
      setRecords(nextRecords);
      setRecordsUnavailable(false);
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
      setRecordsUnavailable(true);
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
  const greeting = localNow
    ? buildHealthAdvisorGreeting({
        memberName,
        now: localNow,
        timeZone: memberTimeZone,
      })
    : null;
  const medicationCount = model.medicationReview.length;
  const appointmentCount =
    model.timelineSummary.byType.find(
      (item) => item.kind === "appointment"
    )?.count || 0;
  const dataState = buildHealthAdvisorDataState({
    totalRecords: model.executiveBriefing.totalRecords,
    populatedAreas: model.executiveBriefing.populatedAreas,
    medicationCount,
    appointmentCount,
  });
  const knowledgeModel = useMemo<ProfessionalKnowledgeModel>(() => {
    const activeRecords = records.filter(
      (record) => record.status !== "archived"
    );
    const recordsByKind = activeRecords.reduce<
      Map<HealthRecord["recordType"], HealthRecord[]>
    >((groups, record) => {
      const group = groups.get(record.recordType) || [];
      group.push(record);
      groups.set(record.recordType, group);
      return groups;
    }, new Map());
    const known = Array.from(recordsByKind.entries()).flatMap(
      ([recordType, groupedRecords]): ProfessionalKnowledgeItem[] => {
        const directRecords =
          recordType === "profile"
            ? groupedRecords.filter((record) => !record.details.topic)
            : groupedRecords;
        if (!directRecords.length) return [];
        return [{
          id: `health-known-${recordType}`,
          label:
            recordType === "profile"
              ? "Health background"
              : recordType === "provider"
                ? "Care team"
                : recordType === "family_history"
                  ? "Family history"
                  : healthWorkspaceHrefs[recordType]
                    .split("/")
                    .at(-1)
                    ?.replaceAll("-", " ") || recordType,
          summary: `${directRecords.length} saved ${directRecords.length === 1 ? "record" : "records"}: ${directRecords
            .slice(0, 3)
            .map((record) => record.title)
            .join(", ")}${directRecords.length > 3 ? "…" : ""}`,
          confidence: "high",
          action: {
            label: "Review or edit",
            mode: "edit",
            href: healthWorkspaceHrefs[recordType],
          },
        }];
      }
    );
    for (const record of activeRecords.filter(
      (item) => item.recordType === "profile" && item.details.topic
    )) {
      known.push({
        id: `health-known-conversation-${record.id}`,
        label: record.title,
        summary:
          typeof record.details.context === "string"
            ? record.details.context
            : "Member-reported context is saved.",
        confidence: "high",
        action: {
          label: "Review or edit",
          mode: "edit",
          href: healthWorkspaceHrefs.profile,
        },
      });
    }
    const confidence = (
      label: HealthAdvisorRecommendation["confidence"]["label"]
    ): ProfessionalKnowledgeConfidence =>
      label === "high"
        ? "high"
        : label === "moderate"
          ? "medium"
          : label === "low"
            ? "low"
            : "unknown";
    const thinking = model.recommendations.map(
      (recommendation): ProfessionalKnowledgeItem => ({
        id: `health-thinking-${recommendation.sourceRecommendationId}`,
        label: recommendation.title,
        summary: recommendation.recommendation,
        confidence: confidence(recommendation.confidence.label),
        why: recommendation.confidence.basis,
        evidence: recommendation.supportingEvidence.map((evidence) => {
          const source = evidence.source;
          return `Evidence source: ${
            typeof source === "string" ? source : "saved BeastHealth context"
          }`;
        }),
        action: {
          label: "Review source",
          mode: "detail",
          href: recommendation.href,
        },
      })
    );
    const neededCandidates: {
      id: string;
      label: string;
      summary: string;
      prompt: string;
      kind: HealthRecord["recordType"];
    }[] = [
      {
        id: "health-background-needed",
        label: "Health background",
        summary:
          "Member-reported health background would improve record organization and appointment preparation.",
        prompt:
          "Tell me the health background or allergy information you want me to remember for future preparation.",
        kind: "profile",
      },
      {
        id: "health-medications-needed",
        label: "Current medication status",
        summary:
          "Knowing whether you take any medications would make record review more complete.",
        prompt:
          "What would you like me to know about your current medication status? It is okay to say that you do not take any.",
        kind: "medication",
      },
      {
        id: "health-conditions-needed",
        label: "Known condition status",
        summary:
          "Only conditions the member reports or verifies should become part of the health story.",
        prompt:
          "Are there any clinician-confirmed conditions or ongoing health concerns you want included in your health story?",
        kind: "condition",
      },
      {
        id: "health-care-team-needed",
        label: "Care team",
        summary:
          "Provider or specialist context can improve appointment and document preparation.",
        prompt:
          "Which doctor, practice, or specialist should I know about for future appointment preparation?",
        kind: "provider",
      },
    ];
    const needed = neededCandidates
      .filter(
        (candidate) =>
          !recordsByKind.has(candidate.kind) &&
          !activeRecords.some(
            (record) =>
              record.recordType === "profile" &&
              record.details.topic === candidate.id
          )
      )
      .map(
        (candidate): ProfessionalKnowledgeItem => ({
          id: candidate.id,
          label: candidate.label,
          summary: candidate.summary,
          confidence: "unknown",
          action: {
            label: "Talk with Health Advisor",
            mode: "conversation",
            prompt: candidate.prompt,
          },
        })
      );

    return {
      professionalId: healthAdvisorProfessionalId,
      professionalName: "Health Advisor",
      known,
      thinking,
      needed,
    };
  }, [model.recommendations, records]);

  function beginKnowledgeConversation(item: ProfessionalKnowledgeItem) {
    if (item.action.mode !== "conversation") return;
    setKnowledgePrompt(item);
    setKnowledgeAnswer("");
    setPendingKnowledgeAnswer("");
    setKnowledgeSaveState("idle");
    window.requestAnimationFrame(() =>
      knowledgeInputRef.current?.focus({ preventScroll: true })
    );
  }

  function reviewKnowledgeAnswer(event: FormEvent) {
    event.preventDefault();
    const answer = knowledgeAnswer.trim();
    if (!answer) return;
    setPendingKnowledgeAnswer(answer);
    setKnowledgeSaveState("review");
  }

  async function confirmKnowledgeAnswer() {
    if (!ownerId || !knowledgePrompt || !pendingKnowledgeAnswer) return;
    setKnowledgeSaveState("saving");
    setDataError("");
    try {
      const client = createClient();
      const { data, error } = await client
        .from("beast_health_records")
        .insert({
          owner_id: ownerId,
          record_type: "profile",
          title: knowledgePrompt.label,
          status: "active",
          occurred_on: null,
          source: "Member-reported Health Advisor conversation",
          details: {
            context: pendingKnowledgeAnswer,
            topic: knowledgePrompt.id,
            provenance: "member_confirmed_conversation",
          },
          notes: null,
        })
        .select(
          "id, owner_id, record_type, title, status, occurred_on, source, details, notes, created_at, updated_at"
        )
        .single();
      if (error) throw error;
      const saved = normalizeHealthRecord(data as HealthRecordRow);
      if (!saved) throw new Error("The saved health context was invalid.");
      setRecords((current) => [saved, ...current]);
      setKnowledgeSaveState("saved");
      setKnowledgePrompt(null);
      setKnowledgeAnswer("");
      setPendingKnowledgeAnswer("");
    } catch {
      setKnowledgeSaveState("error");
    }
  }

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
      <section className="space-y-4" aria-label="Health Advisor workspace" data-health-advisor-active="true">
        <div className="rounded-xl border border-red-200/15 bg-red-200/[0.04] px-4 py-3">
          {greeting ? (
            <h2 className="text-lg font-black text-white">{greeting}</h2>
          ) : (
            <p className="text-sm font-bold text-[#c7cfdb]" role="status">
              Preparing your Health Advisor…
            </p>
          )}
          <p className="mt-1 text-sm leading-6 text-[#dbe3ef]">
            {healthAdvisorIntroduction}
          </p>
          <p className="mt-1 text-xs leading-5 text-[#9aa7b8]">
            {loading
              ? "Loading your owner-authorized health context. No health history will be inferred."
              : recordsUnavailable
                ? "Your saved health records are unavailable. I will not infer a health history or record counts."
                : dataState}
          </p>
          {!loading &&
          !recordsUnavailable &&
          model.executiveBriefing.totalRecords === 0 ? (
            <nav
              aria-label="Health Advisor starting points"
              className="mt-2 flex flex-wrap gap-x-4 gap-y-2 text-xs font-bold"
            >
              <Link className="text-red-100 hover:text-white" href="/dashboard/health/profile">
                Health Profile
              </Link>
              <Link className="text-red-100 hover:text-white" href="/dashboard/health/medications">
                Medications
              </Link>
              <Link className="text-red-100 hover:text-white" href="/dashboard/health/appointments">
                Appointments
              </Link>
            </nav>
          ) : null}
        </div>

        {!loading && !recordsUnavailable ? (
          <DashboardCard accent="health">
            <ProfessionalKnowledgeWorkspace
              model={knowledgeModel}
              onAction={beginKnowledgeConversation}
            />
            {knowledgePrompt ? (
              <section
                className="mt-5 rounded-2xl border border-red-200/15 bg-black/10 p-4"
                aria-label="Health Advisor knowledge conversation"
              >
                <p className="text-xs font-black uppercase tracking-[0.14em] text-red-200">
                  Health Advisor
                </p>
                <p className="mt-2 text-sm leading-6 text-[#dbe3ef]">
                  {knowledgePrompt.action.mode === "conversation"
                    ? knowledgePrompt.action.prompt
                    : ""}
                </p>
                <form className="mt-4 grid gap-3" onSubmit={reviewKnowledgeAnswer}>
                  <label className="grid gap-2 text-sm font-bold text-white">
                    Your answer
                    <textarea
                      ref={knowledgeInputRef}
                      className="beast-input min-h-28 min-w-0 resize-y"
                      value={knowledgeAnswer}
                      maxLength={1000}
                      onChange={(event) => {
                        setKnowledgeAnswer(event.target.value);
                        if (knowledgeSaveState !== "idle") {
                          setKnowledgeSaveState("idle");
                        }
                      }}
                    />
                  </label>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="submit"
                      className="beast-button min-h-11"
                      disabled={!knowledgeAnswer.trim()}
                    >
                      Review before saving
                    </button>
                    <button
                      type="button"
                      className="beast-button-secondary min-h-11"
                      onClick={() => setKnowledgePrompt(null)}
                    >
                      Not now
                    </button>
                  </div>
                </form>
                {knowledgeSaveState === "review" ? (
                  <div className="mt-4 rounded-xl border border-white/10 p-4">
                    <p className="text-xs font-black uppercase text-red-200">
                      Confirm member-reported context
                    </p>
                    <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-[#dbe3ef]">
                      {pendingKnowledgeAnswer}
                    </p>
                    <p className="mt-2 text-xs leading-5 text-[#9aa7b8]">
                      Saving adds this as member-reported context. It does not
                      confirm a diagnosis, medication, allergy, or clinical
                      conclusion.
                    </p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <button
                        type="button"
                        className="beast-button min-h-11"
                        onClick={() => void confirmKnowledgeAnswer()}
                      >
                        Save confirmed context
                      </button>
                      <button
                        type="button"
                        className="beast-button-secondary min-h-11"
                        onClick={() => setKnowledgeSaveState("idle")}
                      >
                        Keep editing
                      </button>
                    </div>
                  </div>
                ) : null}
                {knowledgeSaveState === "saving" ? (
                  <p className="mt-3 text-sm text-[#c7cfdb]" role="status">
                    Saving confirmed health context…
                  </p>
                ) : null}
                {knowledgeSaveState === "error" ? (
                  <p
                    className="mt-3 rounded-xl border border-amber-300/30 bg-amber-300/10 p-3 text-sm text-amber-100"
                    role="alert"
                  >
                    The context could not be saved. Your answer is still here
                    so you can retry.
                  </p>
                ) : null}
              </section>
            ) : knowledgeSaveState === "saved" ? (
              <p
                className="mt-4 rounded-xl border border-emerald-300/25 bg-emerald-300/10 p-3 text-sm text-emerald-100"
                role="status"
              >
                Saved as member-reported health context.
              </p>
            ) : null}
          </DashboardCard>
        ) : null}

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

        <div className="grid gap-4 xl:grid-cols-2">
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

        <div className="grid gap-4 xl:grid-cols-2">
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
