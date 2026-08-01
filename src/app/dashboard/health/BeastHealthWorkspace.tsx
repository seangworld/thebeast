"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  useEffect,
  useMemo,
  useState,
  type FormEvent,
} from "react";
import {
  ProfessionalKnowledgeWorkspace,
  type ProfessionalKnowledgeItem,
  type ProfessionalKnowledgeModel,
} from "@/app/components/agents";
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
import {
  buildHealthAdvisorModel,
  healthAdvisorProfessionalId,
  type HealthAdvisorRecommendation,
} from "@/lib/health/healthAdvisor";
import { createClient } from "@/lib/supabase/client";
import { BeastHealthShell } from "./BeastHealthShell";
import { HealthDiscoveryOnboarding } from "./HealthDiscoveryOnboarding";
import { HealthDocumentExtractionReview } from "./HealthDocumentExtractionReview";
import { LivingHealthTimeline } from "./LivingHealthTimeline";

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

const healthWorkspaceConversationTopics: Record<
  HealthRecordKind,
  {
    knowledgeId: string;
    conversationTitle: string;
    openingPrompt: string;
    emptyPrompt: string;
  }
> = {
  profile: {
    knowledgeId: "health-background-needed",
    conversationTitle: "health background",
    openingPrompt:
      "I want to review the health background and care preferences that would help you support me.",
    emptyPrompt:
      "Help me begin my health background with one useful piece of context.",
  },
  condition: {
    knowledgeId: "health-conditions-needed",
    conversationTitle: "conditions",
    openingPrompt:
      "I want to review my saved conditions and make sure the record reflects only what I know.",
    emptyPrompt:
      "I want to tell you about a condition that belongs in my health record.",
  },
  medication: {
    knowledgeId: "health-medications-needed",
    conversationTitle: "medications",
    openingPrompt:
      "I want to review my saved medications, schedules, and sources.",
    emptyPrompt:
      "I want to tell you about a medication that belongs in my health record.",
  },
  procedure: {
    knowledgeId: "health-procedures-needed",
    conversationTitle: "procedures",
    openingPrompt:
      "I want to review my procedure history and the context I have saved.",
    emptyPrompt:
      "I want to tell you about a procedure that belongs in my health record.",
  },
  vital: {
    knowledgeId: "health-vitals-needed",
    conversationTitle: "vitals",
    openingPrompt:
      "I want to review the measurements I have recorded without interpreting them.",
    emptyPrompt:
      "I want to record a dated vital measurement and its source.",
  },
  document: {
    knowledgeId: "health-documents-needed",
    conversationTitle: "medical documents",
    openingPrompt:
      "I want to review the medical documents connected to my health story.",
    emptyPrompt:
      "I want to tell you about a medical document that should be part of my health context.",
  },
  lifestyle: {
    knowledgeId: "health-lifestyle-needed",
    conversationTitle: "lifestyle context",
    openingPrompt:
      "I want to review the lifestyle context that may help me prepare for care conversations.",
    emptyPrompt:
      "I want to share a lifestyle detail that would be useful health context.",
  },
  family_history: {
    knowledgeId: "health-family-history-needed",
    conversationTitle: "family health history",
    openingPrompt:
      "I want to review the family health history I know and where it came from.",
    emptyPrompt:
      "I want to share a family health history detail that I know.",
  },
  provider: {
    knowledgeId: "health-care-team-needed",
    conversationTitle: "care team",
    openingPrompt:
      "I want to review the providers and practices involved in my care.",
    emptyPrompt:
      "I want to tell you about a provider or practice involved in my care.",
  },
  appointment: {
    knowledgeId: "health-appointments-needed",
    conversationTitle: "appointments",
    openingPrompt:
      "I want to review my appointments and prepare the right records and questions.",
    emptyPrompt:
      "I want to tell you about an appointment that belongs in my health record.",
  },
};

function buildHealthAdvisorConversationHref(
  kind: HealthRecordKind,
  prompt: string,
  recordId?: string
) {
  const parameters = new URLSearchParams({
    topic: kind,
    prompt,
  });
  if (recordId) parameters.set("record", recordId);
  return `/dashboard/health/ai-advisor?${parameters.toString()}#health-advisor-conversation`;
}

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

function formatRecordSummary(record: HealthRecord) {
  const context =
    typeof record.details.context === "string"
      ? record.details.context.trim()
      : "";
  const parts = [
    record.status,
    record.occurredOn ? formatDate(record.occurredOn) : null,
    record.source ? `Source: ${record.source}` : null,
  ].filter(Boolean);
  return context || parts.join(" · ");
}

function recommendationMatchesWorkspace(
  recommendation: HealthAdvisorRecommendation,
  kind: HealthRecordKind
) {
  return recommendation.href === healthWorkspaceHrefs[kind];
}

function toKnowledgeConfidence(
  confidence: HealthAdvisorRecommendation["confidence"]["label"]
) {
  if (confidence === "moderate") return "medium" as const;
  if (confidence === "insufficient") return "unknown" as const;
  return confidence;
}

function buildWorkspaceKnowledgeModel(input: {
  kind: HealthRecordKind;
  records: readonly HealthRecord[];
  recommendations: readonly HealthAdvisorRecommendation[];
}): ProfessionalKnowledgeModel {
  const definition = healthWorkspaceDefinitions[input.kind];
  const topic = healthWorkspaceConversationTopics[input.kind];
  const visible = input.records.filter(
    (record) =>
      record.recordType === input.kind && record.status !== "archived"
  );
  const known: ProfessionalKnowledgeItem[] = visible.map((record) => ({
    id: `health-workspace-known-${record.id}`,
    label: record.title,
    summary: formatRecordSummary(record),
    confidence: "high",
    action: {
      label: "View record",
      mode: "detail",
      href: `${healthWorkspaceHrefs[input.kind]}#health-record-${record.id}`,
    },
  }));
  const thinking: ProfessionalKnowledgeItem[] = input.recommendations
    .filter((recommendation) =>
      recommendationMatchesWorkspace(recommendation, input.kind)
    )
    .map((recommendation) => ({
      id: `health-workspace-thinking-${recommendation.sourceRecommendationId}`,
      label: recommendation.title,
      summary: recommendation.recommendation,
      confidence: toKnowledgeConfidence(recommendation.confidence.label),
      why: recommendation.confidence.basis,
      evidence: recommendation.supportingEvidence.map((evidence) =>
        "healthRecordId" in evidence
          ? `Saved record ${String(evidence.healthRecordId)}`
          : "Owner-authorized BeastHealth context"
      ),
      action: {
        label: "Discuss this",
        mode: "conversation",
        prompt: `Help me understand this organizational recommendation: ${recommendation.title}.`,
      },
    }));
  const needed: ProfessionalKnowledgeItem[] = [];

  if (!visible.length) {
    needed.push({
      id: `health-workspace-needed-${topic.knowledgeId}`,
      label: `Current ${topic.conversationTitle}`,
      summary: `No current ${definition.title.toLowerCase()} are saved. Health Advisor will not infer them.`,
      confidence: "unknown",
      action: {
        label: "Talk with Health Advisor",
        mode: "conversation",
        prompt: topic.emptyPrompt,
      },
    });
  } else {
    const missingSource = visible.filter((record) => !record.source);
    const missingDate = visible.filter((record) => !record.occurredOn);
    const missingContext = visible.filter(
      (record) =>
        typeof record.details.context !== "string" ||
        !record.details.context.trim()
    );
    if (missingSource.length) {
      needed.push({
        id: `health-workspace-needed-${input.kind}-source`,
        label: "Source context",
        summary: `${missingSource.length} saved ${definition.singular}${missingSource.length === 1 ? "" : "s"} ${missingSource.length === 1 ? "does" : "do"} not include a source.`,
        confidence: "unknown",
        action: {
          label: "Add through conversation",
          mode: "conversation",
          prompt: `Help me add source context to my saved ${topic.conversationTitle}.`,
        },
      });
    }
    if (missingDate.length) {
      needed.push({
        id: `health-workspace-needed-${input.kind}-date`,
        label: "Timeline context",
        summary: `${missingDate.length} saved ${definition.singular}${missingDate.length === 1 ? "" : "s"} ${missingDate.length === 1 ? "does" : "do"} not include a date.`,
        confidence: "unknown",
        action: {
          label: "Add through conversation",
          mode: "conversation",
          prompt: `Help me add accurate timeline context to my saved ${topic.conversationTitle}.`,
        },
      });
    }
    if (missingContext.length) {
      needed.push({
        id: `health-workspace-needed-${input.kind}-context`,
        label: "Useful context",
        summary: `${missingContext.length} saved ${definition.singular}${missingContext.length === 1 ? "" : "s"} ${missingContext.length === 1 ? "has" : "have"} no supporting context.`,
        confidence: "unknown",
        action: {
          label: "Add through conversation",
          mode: "conversation",
          prompt: `Help me add only the context I know about my saved ${topic.conversationTitle}.`,
        },
      });
    }
  }

  return {
    professionalId: `${healthAdvisorProfessionalId}.${input.kind}`,
    professionalName: "Health Advisor",
    known,
    thinking,
    needed,
    emptyStates: {
      known: `No ${definition.title.toLowerCase()} are confirmed yet. Start with Health Advisor when you are ready.`,
      thinking:
        "Health Advisor has no evidence-backed observation for this workspace yet.",
      needed:
        "The saved records include the basic source, date, and context fields Health Advisor uses here.",
    },
  };
}

type HealthRecordUpdate = {
  title: string;
  context: string;
  source: string;
  notes: string;
  occurredOn: string;
  status: HealthRecordStatus;
  linkedDocumentId: string;
  linkedAppointmentId: string;
};

function RecordEditor({
  record,
  relatedRecords,
  pending,
  onSave,
}: {
  record: HealthRecord;
  relatedRecords: readonly HealthRecord[];
  pending: boolean;
  onSave: (record: HealthRecord, update: HealthRecordUpdate) => void;
}) {
  const [title, setTitle] = useState(record.title);
  const [context, setContext] = useState(
    typeof record.details.context === "string"
      ? record.details.context
      : ""
  );
  const [source, setSource] = useState(record.source || "");
  const [notes, setNotes] = useState(record.notes || "");
  const [occurredOn, setOccurredOn] = useState(record.occurredOn || "");
  const [status, setStatus] = useState<HealthRecordStatus>(
    record.status === "archived" ? "active" : record.status
  );
  const [linkedDocumentId, setLinkedDocumentId] = useState(
    typeof record.details.linked_document_id === "string"
      ? record.details.linked_document_id
      : ""
  );
  const [linkedAppointmentId, setLinkedAppointmentId] = useState(
    typeof record.details.linked_appointment_id === "string"
      ? record.details.linked_appointment_id
      : ""
  );
  const definition = healthWorkspaceDefinitions[record.recordType];
  const documentRecords = relatedRecords.filter(
    (candidate) =>
      candidate.recordType === "document" &&
      candidate.status !== "archived" &&
      candidate.id !== record.id
  );
  const appointmentRecords = relatedRecords.filter(
    (candidate) =>
      candidate.recordType === "appointment" &&
      candidate.status !== "archived" &&
      candidate.id !== record.id
  );

  function submit(event: FormEvent) {
    event.preventDefault();
    if (!title.trim()) return;
    onSave(record, {
      title: title.trim(),
      context: context.trim(),
      source: source.trim(),
      notes: notes.trim(),
      occurredOn,
      status,
      linkedDocumentId,
      linkedAppointmentId,
    });
  }

  return (
    <form className="mt-4 grid gap-3" onSubmit={submit}>
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
      <div className="grid gap-3 sm:grid-cols-2">
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
      <fieldset className="grid gap-3 rounded-xl border border-white/10 p-3 sm:grid-cols-2">
        <legend className="px-2 text-xs font-black uppercase text-red-200">
          Linked context
        </legend>
        <label className="grid min-w-0 gap-2 text-sm font-bold text-[#dbe3ef]">
          Medical document
          <select
            className="beast-input min-w-0"
            value={linkedDocumentId}
            onChange={(event) => setLinkedDocumentId(event.target.value)}
          >
            <option value="">No linked document</option>
            {documentRecords.map((document) => (
              <option key={document.id} value={document.id}>
                {document.title}
              </option>
            ))}
          </select>
        </label>
        <label className="grid min-w-0 gap-2 text-sm font-bold text-[#dbe3ef]">
          Appointment
          <select
            className="beast-input min-w-0"
            value={linkedAppointmentId}
            onChange={(event) => setLinkedAppointmentId(event.target.value)}
          >
            <option value="">No linked appointment</option>
            {appointmentRecords.map((appointment) => (
              <option key={appointment.id} value={appointment.id}>
                {appointment.title}
              </option>
            ))}
          </select>
        </label>
      </fieldset>
      <button
        type="submit"
        className="beast-button-primary min-h-11 w-full sm:w-fit"
        disabled={pending}
      >
        {pending ? "Saving changes…" : "Save direct edits"}
      </button>
    </form>
  );
}

function RecordList({
  records,
  allRecords,
  onArchive,
  onUpdate,
  pendingId,
}: {
  records: readonly HealthRecord[];
  allRecords: readonly HealthRecord[];
  onArchive: (record: HealthRecord) => void;
  onUpdate: (record: HealthRecord, update: HealthRecordUpdate) => void;
  pendingId: string;
}) {
  const [expandedId, setExpandedId] = useState("");

  useEffect(() => {
    function syncHash() {
      const prefix = "#health-record-";
      if (!window.location.hash.startsWith(prefix)) return;
      const recordId = window.location.hash.slice(prefix.length);
      if (records.some((record) => record.id === recordId)) {
        setExpandedId(recordId);
        window.requestAnimationFrame(() =>
          document
            .getElementById(`health-record-${recordId}`)
            ?.scrollIntoView({ behavior: "smooth", block: "start" })
        );
      }
    }
    syncHash();
    window.addEventListener("hashchange", syncHash);
    return () => window.removeEventListener("hashchange", syncHash);
  }, [records]);

  return (
    <div className="grid gap-3">
      {records.map((record) => (
        <article
          key={record.id}
          id={`health-record-${record.id}`}
          className="rounded-xl border border-white/10 bg-white/[0.03] p-4"
        >
          <button
            type="button"
            className="flex min-h-11 w-full items-start justify-between gap-3 text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan-300"
            aria-expanded={expandedId === record.id}
            aria-controls={`health-record-details-${record.id}`}
            onClick={() => {
              const nextId = expandedId === record.id ? "" : record.id;
              setExpandedId(nextId);
              window.history.replaceState(
                null,
                "",
                nextId
                  ? `${window.location.pathname}${window.location.search}#health-record-${nextId}`
                  : `${window.location.pathname}${window.location.search}`
              );
            }}
          >
            <span className="min-w-0">
              <span className="block text-xs font-black uppercase tracking-wide text-red-200">
                {formatKind(record.recordType)} · {record.status}
              </span>
              <span className="mt-2 block break-words font-black text-white">
                {record.title}
              </span>
              <span className="mt-2 block text-xs leading-5 text-[#9aa7b8]">
                Updated {formatDate(record.updatedAt)}
              </span>
            </span>
            <span
              className="shrink-0 rounded-full border border-white/10 px-3 py-1.5 text-xs font-bold text-cyan-100"
              aria-hidden="true"
            >
              {expandedId === record.id ? "Close" : "View"}
            </span>
          </button>

          {expandedId === record.id ? (
            <div
              id={`health-record-details-${record.id}`}
              className="mt-4 border-t border-white/10 pt-4"
            >
              <div className="grid gap-3 text-sm leading-6 text-[#c7cfdb] sm:grid-cols-2">
                <div className="rounded-xl border border-white/10 p-3">
                  <p className="text-xs font-black uppercase text-red-200">
                    Timeline
                  </p>
                  <p className="mt-1">
                    {formatDate(record.occurredOn || record.createdAt)}
                  </p>
                </div>
                <div className="rounded-xl border border-white/10 p-3">
                  <p className="text-xs font-black uppercase text-red-200">
                    Source
                  </p>
                  <p className="mt-1">{record.source || "Not recorded"}</p>
                </div>
              </div>
              {record.details.context ? (
                <div className="mt-3 rounded-xl border border-white/10 p-3">
                  <p className="text-xs font-black uppercase text-red-200">
                    Saved context
                  </p>
                  <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-6 text-[#c7cfdb]">
                    {String(record.details.context)}
                  </p>
                </div>
              ) : null}
              {record.notes ? (
                <div className="mt-3 rounded-xl border border-white/10 p-3">
                  <p className="text-xs font-black uppercase text-red-200">
                    Private notes
                  </p>
                  <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-6 text-[#c7cfdb]">
                    {record.notes}
                  </p>
                </div>
              ) : null}

              <div className="mt-4 rounded-xl border border-white/10 bg-black/10 p-3">
                <p className="text-xs font-black uppercase text-red-200">
                  Related context
                </p>
                <p className="mt-2 text-xs leading-5 text-[#9aa7b8]">
                  Continue this record through its authoritative workspace.
                  Opening another workspace does not create or imply a medical
                  relationship by itself.
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Link
                    className="beast-button-secondary inline-flex min-h-11 items-center"
                    href={buildHealthAdvisorConversationHref(
                      record.recordType,
                      `I want to review my saved ${formatKind(record.recordType).toLowerCase()} record "${record.title}" and add only information I can confirm.`,
                      record.id
                    )}
                  >
                    Link conversation
                  </Link>
                  {typeof record.details.linked_document_id === "string" &&
                  allRecords.some(
                    (candidate) =>
                      candidate.id === record.details.linked_document_id
                  ) ? (
                    <Link
                      className="beast-button-secondary inline-flex min-h-11 items-center"
                      href={`/dashboard/health/documents#health-record-${record.details.linked_document_id}`}
                    >
                      View linked document
                    </Link>
                  ) : null}
                  {typeof record.details.linked_appointment_id === "string" &&
                  allRecords.some(
                    (candidate) =>
                      candidate.id === record.details.linked_appointment_id
                  ) ? (
                    <Link
                      className="beast-button-secondary inline-flex min-h-11 items-center"
                      href={`/dashboard/health/appointments#health-record-${record.details.linked_appointment_id}`}
                    >
                      View linked appointment
                    </Link>
                  ) : null}
                </div>
              </div>

              <details className="mt-4 rounded-xl border border-white/10 p-3">
                <summary className="cursor-pointer font-bold text-cyan-100">
                  Direct record editing
                </summary>
                <p className="mt-2 text-xs leading-5 text-[#9aa7b8]">
                  Use direct editing to correct confirmed record details.
                  Conversation remains the preferred way to add new context.
                </p>
                <RecordEditor
                  key={`${record.id}-${record.updatedAt}`}
                  record={record}
                  relatedRecords={allRecords}
                  pending={pendingId === record.id}
                  onSave={onUpdate}
                />
              </details>

              <button
                type="button"
                className="beast-button-secondary mt-4 min-h-11"
                disabled={pendingId === record.id}
                onClick={() => onArchive(record)}
              >
                {record.status === "archived" ? "Restore" : "Archive"}
              </button>
            </div>
          ) : null}
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
  const router = useRouter();
  const definition = healthWorkspaceDefinitions[kind];
  const { ownerId, records, loading, error, setError, reload } =
    useHealthRecords();
  const topic = healthWorkspaceConversationTopics[kind];
  const [title, setTitle] = useState("");
  const [context, setContext] = useState("");
  const [source, setSource] = useState("");
  const [notes, setNotes] = useState("");
  const [occurredOn, setOccurredOn] = useState("");
  const [status, setStatus] = useState<HealthRecordStatus>("active");
  const [saving, setSaving] = useState(false);
  const [pendingId, setPendingId] = useState("");
  const [conversationDraft, setConversationDraft] = useState("");
  const [statusMessage, setStatusMessage] = useState("");
  const visibleRecords = records.filter((record) => record.recordType === kind);
  const activeRecords = visibleRecords.filter(
    (record) => record.status !== "archived"
  );
  const timeline = useMemo(
    () => buildHealthTimeline(activeRecords).slice(0, 6),
    [activeRecords]
  );
  const recentUpdates = useMemo(
    () =>
      [...activeRecords]
        .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))
        .slice(0, 4),
    [activeRecords]
  );
  const advisorModel = useMemo(
    () => buildHealthAdvisorModel({ records }),
    [records]
  );
  const knowledgeModel = useMemo(
    () =>
      buildWorkspaceKnowledgeModel({
        kind,
        records,
        recommendations: advisorModel.recommendations,
      }),
    [advisorModel.recommendations, kind, records]
  );
  const presentation = healthWorkspacePresentation[kind];

  function startConversation(event: FormEvent) {
    event.preventDefault();
    const prompt = conversationDraft.trim() || topic.openingPrompt;
    router.push(buildHealthAdvisorConversationHref(kind, prompt));
  }

  function beginKnowledgeConversation(item: ProfessionalKnowledgeItem) {
    if (item.action.mode !== "conversation") return;
    router.push(
      buildHealthAdvisorConversationHref(kind, item.action.prompt)
    );
  }

  async function createRecord(event: FormEvent) {
    event.preventDefault();
    if (!ownerId || !title.trim()) return;
    setSaving(true);
    setError("");
    setStatusMessage("");
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
      setStatusMessage(
        `${definition.singular[0].toUpperCase()}${definition.singular.slice(1)} saved.`
      );
    } catch {
      setError("The record could not be saved. Your form values were preserved.");
    } finally {
      setSaving(false);
    }
  }

  async function updateRecord(
    record: HealthRecord,
    update: HealthRecordUpdate
  ) {
    setPendingId(record.id);
    setError("");
    setStatusMessage("");
    try {
      const client = createClient();
      const linkedDocumentId = !update.linkedDocumentId
        ? null
        : records.some(
              (candidate) =>
                candidate.id === update.linkedDocumentId &&
                candidate.ownerId === ownerId &&
                candidate.recordType === "document" &&
                candidate.status !== "archived"
            )
          ? update.linkedDocumentId
          : typeof record.details.linked_document_id === "string"
            ? record.details.linked_document_id
            : null;
      const linkedAppointmentId = !update.linkedAppointmentId
        ? null
        : records.some(
              (candidate) =>
                candidate.id === update.linkedAppointmentId &&
                candidate.ownerId === ownerId &&
                candidate.recordType === "appointment" &&
                candidate.status !== "archived"
            )
          ? update.linkedAppointmentId
          : typeof record.details.linked_appointment_id === "string"
            ? record.details.linked_appointment_id
            : null;
      const { error: updateError } = await client
        .from("beast_health_records")
        .update({
          title: update.title,
          status: update.status,
          occurred_on: update.occurredOn || null,
          source: update.source || null,
          details: {
            ...record.details,
            context: update.context || null,
            linked_document_id: linkedDocumentId,
            linked_appointment_id: linkedAppointmentId,
          },
          notes: update.notes || null,
        })
        .eq("id", record.id)
        .eq("owner_id", ownerId);
      if (updateError) throw updateError;
      await reload();
      setStatusMessage(`Changes to "${update.title}" were saved.`);
    } catch {
      setError("The record could not be updated. No saved details were changed.");
    } finally {
      setPendingId("");
    }
  }

  async function archiveRecord(record: HealthRecord) {
    setPendingId(record.id);
    setError("");
    setStatusMessage("");
    try {
      const client = createClient();
      const { error: updateError } = await client
        .from("beast_health_records")
        .update({ status: record.status === "archived" ? "active" : "archived" })
        .eq("id", record.id)
        .eq("owner_id", ownerId);
      if (updateError) throw updateError;
      await reload();
      setStatusMessage(
        record.status === "archived"
          ? `"${record.title}" was restored.`
          : `"${record.title}" was archived.`
      );
    } catch {
      setError("The record status could not be changed. No local record was removed.");
    } finally {
      setPendingId("");
    }
  }

  return (
    <BeastHealthShell title={definition.title} description={definition.description}>
      <section
        className="space-y-4"
        data-health-record-purpose={kind}
        data-health-advisor-workspace={kind}
      >
        <DashboardCard accent="red">
          <SectionHeader
            eyebrow="Health Advisor workspace"
            title={`Talk about your ${topic.conversationTitle}`}
            description={`Conversation is the primary way to add, correct, and understand ${definition.title.toLowerCase()}. Health Advisor will show extracted information for confirmation before it becomes a structured record.`}
            action={
              <Link
                href="/dashboard/health/ai-advisor"
                className="beast-button-secondary inline-flex min-h-11 items-center"
              >
                Open full conversation
              </Link>
            }
          />
          <form
            className="mt-5 rounded-2xl border border-white/10 bg-black/10 p-3"
            onSubmit={startConversation}
          >
            <label
              className="sr-only"
              htmlFor={`health-advisor-${kind}-conversation`}
            >
              Message Health Advisor about {topic.conversationTitle}
            </label>
            <textarea
              id={`health-advisor-${kind}-conversation`}
              className="beast-input min-h-24 w-full min-w-0 resize-y"
              maxLength={2000}
              placeholder={topic.openingPrompt}
              value={conversationDraft}
              onChange={(event) => setConversationDraft(event.target.value)}
            />
            <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
              <p className="max-w-2xl text-xs leading-5 text-[#9aa7b8]">
                Your message opens the durable Health Advisor conversation.
                Saving structured context still requires your confirmation.
              </p>
              <button
                type="submit"
                className="beast-button-primary min-h-11"
              >
                Continue with Health Advisor
              </button>
            </div>
          </form>
          <div className="mt-3 flex flex-wrap gap-2">
            <Link
              href={buildHealthAdvisorConversationHref(
                kind,
                topic.openingPrompt
              )}
              className="rounded-full border border-white/10 px-3 py-2 text-xs font-bold text-cyan-100 transition hover:border-cyan-300/40"
            >
              Review what is saved
            </Link>
            <Link
              href={buildHealthAdvisorConversationHref(kind, topic.emptyPrompt)}
              className="rounded-full border border-white/10 px-3 py-2 text-xs font-bold text-cyan-100 transition hover:border-cyan-300/40"
            >
              Add through conversation
            </Link>
          </div>
          <p className="mt-4 text-xs leading-5 text-[#9aa7b8]">
            Health Advisor organizes member-reported context. It does not
            diagnose, prescribe, determine treatment, or tell you to change
            medication.
          </p>
        </DashboardCard>

        {!loading ? (
          <DashboardCard accent="health">
            <ProfessionalKnowledgeWorkspace
              model={knowledgeModel}
              onAction={beginKnowledgeConversation}
            />
          </DashboardCard>
        ) : null}

        {error ? (
          <p
            className="rounded-xl border border-amber-300/30 bg-amber-300/10 p-4 text-sm leading-6 text-amber-100"
            role="alert"
          >
            {error}
          </p>
        ) : null}
        {statusMessage ? (
          <p
            className="rounded-xl border border-emerald-300/25 bg-emerald-300/10 p-4 text-sm leading-6 text-emerald-100"
            role="status"
          >
            {statusMessage}
          </p>
        ) : null}

        {kind === "document" ? <HealthDocumentExtractionReview /> : null}

        <div className="grid gap-4 xl:grid-cols-[minmax(0,1.15fr)_minmax(20rem,0.85fr)]">
          <DashboardCard accent="red">
            <SectionHeader
              eyebrow={presentation.eyebrow}
              title={presentation.collectionTitle}
              description={`${presentation.collectionDescription} Select any saved record to view, expand, edit, or continue it through Health Advisor.`}
            />
            <div className="mt-4 flex flex-wrap gap-2 text-xs font-bold text-[#c7cfdb]">
              <span className="rounded-full border border-white/10 px-3 py-1.5">
                {activeRecords.length} current
              </span>
              <span className="rounded-full border border-white/10 px-3 py-1.5">
                {visibleRecords.length} total
              </span>
            </div>
            <div className="mt-4">
              {loading ? (
                <p role="status" className="text-sm text-[#c7cfdb]">
                  Loading {definition.title.toLowerCase()}…
                </p>
              ) : visibleRecords.length ? (
                <RecordList
                  records={visibleRecords}
                  allRecords={records}
                  onArchive={(record) => void archiveRecord(record)}
                  onUpdate={(record, update) =>
                    void updateRecord(record, update)
                  }
                  pendingId={pendingId}
                />
              ) : (
                <GuidedEmptyState
                  title={`No ${definition.title.toLowerCase()} saved`}
                  description="No placeholder or example health records are shown."
                  guidance={`${presentation.emptyGuidance} Health Advisor can gather the information naturally and will ask you to confirm it before saving.`}
                  nextAction={{
                    label: "Start a conversation",
                    href: buildHealthAdvisorConversationHref(
                      kind,
                      topic.emptyPrompt
                    ),
                  }}
                />
              )}
            </div>
          </DashboardCard>

          <div className="grid content-start gap-4">
            <DashboardCard accent="blue">
              <SectionHeader
                eyebrow="Timeline"
                title={`${definition.title} timeline`}
                description="Dates come only from saved records. Health Advisor does not infer when an event happened."
              />
              <ol className="mt-4 grid gap-3">
                {timeline.length ? (
                  timeline.map((event) => (
                    <li
                      key={event.id}
                      className="rounded-xl border border-white/10 bg-black/10 p-3"
                    >
                      <Link
                        href={`${healthWorkspaceHrefs[kind]}#health-record-${event.id}`}
                        className="block focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan-300"
                      >
                        <span className="block text-xs font-black uppercase text-blue-200">
                          {formatDate(event.date)}
                        </span>
                        <span className="mt-1 block font-bold text-white">
                          {event.title}
                        </span>
                        <span className="mt-1 block text-xs text-[#9aa7b8]">
                          {event.status} · {event.source || "Source not recorded"}
                        </span>
                      </Link>
                    </li>
                  ))
                ) : (
                  <li className="rounded-xl border border-dashed border-white/10 p-4 text-sm leading-6 text-[#9aa7b8]">
                    No dated timeline exists for this workspace yet.
                  </li>
                )}
              </ol>
            </DashboardCard>

            <DashboardCard accent="health">
              <SectionHeader
                eyebrow="Recent updates"
                title="What changed"
                description="Updates reflect saved record timestamps, not clinical change or improvement."
              />
              <div className="mt-4 grid gap-3">
                {recentUpdates.length ? (
                  recentUpdates.map((record) => (
                    <Link
                      key={record.id}
                      href={`${healthWorkspaceHrefs[kind]}#health-record-${record.id}`}
                      className="rounded-xl border border-white/10 bg-black/10 p-3 transition hover:border-red-300/30 focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan-300"
                    >
                      <span className="block font-bold text-white">
                        {record.title}
                      </span>
                      <span className="mt-1 block text-xs text-[#9aa7b8]">
                        Updated {formatDate(record.updatedAt)}
                      </span>
                    </Link>
                  ))
                ) : (
                  <p className="rounded-xl border border-dashed border-white/10 p-4 text-sm leading-6 text-[#9aa7b8]">
                    No saved updates exist. BeastHealth does not create sample
                    activity.
                  </p>
                )}
              </div>
            </DashboardCard>
          </div>
        </div>

        <DashboardCard accent="health">
          <details>
            <summary className="cursor-pointer list-none rounded-xl focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan-300">
              <SectionHeader
                eyebrow="Direct record editing"
                title={`Add ${definition.singular} manually`}
                description={`${definition.guidance} Use this only when you want to enter a confirmed record directly. Conversation remains the primary experience.`}
              />
            </summary>
            <form className="mt-5 grid gap-3" onSubmit={createRecord}>
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
          </details>
        </DashboardCard>
      </section>
    </BeastHealthShell>
  );
}

export function HealthOverviewWorkspace() {
  const { ownerId, records, loading, error } = useHealthRecords();
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

      <HealthDiscoveryOnboarding
        ownerId={ownerId}
        records={records}
        recordsLoading={loading}
        recordsUnavailable={Boolean(error)}
      />

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
  return (
    <BeastHealthShell
      title="Health Timeline"
      description="Your living health story, grounded in owner-entered records and confirmed Health Advisor context."
    >
      <DashboardCard accent="health">
        <SectionHeader
          eyebrow="Living health story"
          title="Your health history in context"
          description="Search and navigate saved events, their sources, and explicit record relationships. BeastHealth does not infer clinical meaning, causes, or outcomes."
        />
        <div className="mt-5 min-w-0">
          <LivingHealthTimeline
            records={records}
            loading={loading}
            error={error}
          />
        </div>
      </DashboardCard>
    </BeastHealthShell>
  );
}
