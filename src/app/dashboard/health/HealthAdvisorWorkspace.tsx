"use client";

import Link from "next/link";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  AgentConversationInput,
  AgentThinkingIndicator,
  ProfessionalConversationComposer,
  ProfessionalConversationHistory,
  ProfessionalConversationTimeline,
  ProfessionalExperienceBoundary,
  ProfessionalKnowledgeWorkspace,
  ProfessionalMemoryTimeline,
  ProfessionalSupportingWorkspaces,
  ProfessionalTimeAwareness,
  formatProfessionalMessageTime,
  healthAdvisorConversationIdentity,
  type AgentConversationMessage,
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
  detectMemberHealthDisclosure,
  type HealthAdvisorQuestionAnswer,
} from "@/lib/health/healthAdvisorQuestionAnswering";
import {
  normalizeHealthRecord,
  type HealthRecord,
  type HealthRecordRow,
} from "@/lib/health/foundation";
import {
  buildHealthAdvisorUnderstanding,
  type HealthUnderstandingItem,
} from "@/lib/health/understanding";
import {
  ServerAgentConversationRepository,
  SupabaseAgentConversationStore,
  SupabaseExecutionHistoryStore,
  type AgentConversationThread,
  type AgentMessage,
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

type HealthAdvisorQuestionTurn = {
  id: string;
  question: string;
  timestamp?: string;
  response?:
    | { kind: "external"; answer: HealthAdvisorQuestionAnswer }
    | { kind: "intake"; text: string };
};

type HealthAdvisorGoal = {
  id: string;
  title: string;
  status: string;
  priority: string | null;
  progress: number | null;
  current_step: string | null;
  target_date: string | null;
};

const knowledgeRecordKinds: Record<string, HealthRecord["recordType"]> = {
  "health-background-needed": "profile",
  "health-allergies-needed": "profile",
  "health-symptoms-needed": "profile",
  "health-medications-needed": "medication",
  "health-conditions-needed": "condition",
  "health-care-team-needed": "provider",
  "health-primary-care-needed": "provider",
  "health-specialists-needed": "provider",
  "health-clinician-outcomes-needed": "profile",
  "health-procedures-needed": "procedure",
  "health-family-history-needed": "family_history",
  "health-lifestyle-needed": "lifestyle",
  "health-vitals-needed": "vital",
  "health-insurance-needed": "profile",
  "health-appointments-needed": "appointment",
  "health-goals-needed": "profile",
  "health-vaccination-status-needed": "profile",
  "health-lab-records-needed": "document",
  "health-documents-needed": "document",
};

const healthWorkspacePromptTopics: Record<
  string,
  { id: string; label: string }
> = {
  profile: { id: "health-background-needed", label: "Health background" },
  condition: { id: "health-conditions-needed", label: "Conditions" },
  medication: { id: "health-medications-needed", label: "Medications" },
  procedure: { id: "health-procedures-needed", label: "Procedures" },
  vital: { id: "health-vitals-needed", label: "Vitals" },
  document: { id: "health-documents-needed", label: "Medical documents" },
  lifestyle: { id: "health-lifestyle-needed", label: "Lifestyle context" },
  family_history: {
    id: "health-family-history-needed",
    label: "Family health history",
  },
  provider: { id: "health-care-team-needed", label: "Care team" },
  appointment: { id: "health-appointments-needed", label: "Appointments" },
  "health-symptoms-needed": {
    id: "health-symptoms-needed",
    label: "Primary health concerns",
  },
  "health-conditions-needed": {
    id: "health-conditions-needed",
    label: "Current conditions",
  },
  "health-medications-needed": {
    id: "health-medications-needed",
    label: "Current medications",
  },
  "health-allergies-needed": {
    id: "health-allergies-needed",
    label: "Allergies",
  },
  "health-procedures-needed": {
    id: "health-procedures-needed",
    label: "Past procedures",
  },
  "health-primary-care-needed": {
    id: "health-primary-care-needed",
    label: "Primary care provider",
  },
  "health-specialists-needed": {
    id: "health-specialists-needed",
    label: "Specialists",
  },
  "health-insurance-needed": {
    id: "health-insurance-needed",
    label: "Insurance",
  },
  "health-family-history-needed": {
    id: "health-family-history-needed",
    label: "Family history",
  },
  "health-lifestyle-needed": {
    id: "health-lifestyle-needed",
    label: "Lifestyle",
  },
  "health-goals-needed": {
    id: "health-goals-needed",
    label: "Health goals",
  },
  "health-appointments-needed": {
    id: "health-appointments-needed",
    label: "Upcoming appointments",
  },
  "health-vaccination-status-needed": {
    id: "health-vaccination-status-needed",
    label: "Vaccination status",
  },
  "health-lab-records-needed": {
    id: "health-lab-records-needed",
    label: "Lab records",
  },
};

function restoreHealthAdvisorTurns(
  thread: AgentConversationThread
): HealthAdvisorQuestionTurn[] {
  const turns: HealthAdvisorQuestionTurn[] = [];
  for (let index = 0; index < thread.messages.length; index += 1) {
    const message = thread.messages[index];
    if (message.sender.kind !== "user" || typeof message.content !== "string") {
      continue;
    }
    const responseMessage = thread.messages
      .slice(index + 1)
      .find((candidate) => candidate.sender.kind === "agent");
    const content =
      responseMessage?.content &&
      typeof responseMessage.content === "object" &&
      !Array.isArray(responseMessage.content)
        ? (responseMessage.content as Record<string, unknown>)
        : null;
    if (
      content?.kind === "health_advisor_answer" &&
      content.answer &&
      typeof content.answer === "object"
    ) {
      turns.push({
        id: message.id,
        question: message.content,
        timestamp: responseMessage?.timestamp || message.timestamp,
        response: {
          kind: "external",
          answer: content.answer as HealthAdvisorQuestionAnswer,
        },
      });
    } else if (
      content?.kind === "health_advisor_intake" &&
      typeof content.text === "string"
    ) {
      turns.push({
        id: message.id,
        question: message.content,
        timestamp: responseMessage?.timestamp || message.timestamp,
        response: { kind: "intake", text: content.text },
      });
    }
  }
  return turns;
}

function HealthAdvisorAnswerDocument({
  response,
}: {
  response: HealthAdvisorQuestionAnswer;
}) {
  const recordEvidence = response.recordEvidence || [];
  const documentEvidence = response.documentEvidence || [];
  const conversationEvidence = response.conversationEvidence || [];
  const contextWarnings = response.contextWarnings || [];
  const generalInformation = response.generalInformation || response.answer;
  return (
    <div className="grid gap-4">
      <section aria-label="BeastHealth record evidence used">
        <h4 className="text-xs font-black uppercase tracking-[0.12em] text-red-200">
          Verified BeastHealth records
        </h4>
        <p className="mt-2 text-xs leading-5 text-[#9aa7b8]">
          Verified here means retrieved from your owner-scoped BeastHealth
          record. It does not mean a clinician has independently confirmed the
          information.
        </p>
        {recordEvidence.length ? (
          <ul className="mt-2 grid gap-2">
            {recordEvidence.map((record) => (
              <li
                key={record.id}
                className="rounded-xl border border-white/10 bg-black/10 p-3"
              >
                <p className="font-bold text-white">{record.title}</p>
                <p className="mt-1 text-xs leading-5 text-[#9aa7b8]">
                  Saved {record.kind.replaceAll("_", " ")} · {record.status} ·{" "}
                  {record.source}
                  {record.occurredOn ? ` · ${formatDate(record.occurredOn)}` : ""}
                </p>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-2 text-sm leading-6 text-[#c7cfdb]">
            No relevant saved BeastHealth record was used for this question.
          </p>
        )}
      </section>
      {documentEvidence.length ? (
        <section aria-label="Uploaded health document evidence used">
          <h4 className="text-xs font-black uppercase tracking-[0.12em] text-red-200">
            Uploaded health documents
          </h4>
          <ul className="mt-2 grid gap-2">
            {documentEvidence.map((document) => (
              <li
                key={document.id}
                className="rounded-xl border border-white/10 bg-black/10 p-3"
              >
                <p className="font-bold text-white">{document.title}</p>
                <p className="mt-1 text-xs leading-5 text-[#9aa7b8]">
                  {document.source} · Updated {formatDate(document.updatedAt)}
                </p>
                {document.summary ? (
                  <p className="mt-2 text-sm leading-6 text-[#c7cfdb]">
                    {document.summary}
                  </p>
                ) : (
                  <p className="mt-2 text-xs leading-5 text-[#9aa7b8]">
                    Document metadata is available. No owner-approved document
                    summary was used.
                  </p>
                )}
              </li>
            ))}
          </ul>
        </section>
      ) : null}
      {conversationEvidence.length ? (
        <section aria-label="Prior Health Advisor conversation context used">
          <h4 className="text-xs font-black uppercase tracking-[0.12em] text-red-200">
            Prior conversations
          </h4>
          <ul className="mt-2 grid gap-2">
            {conversationEvidence.map((conversation) => (
              <li
                key={conversation.id}
                className="rounded-xl border border-white/10 bg-black/10 p-3"
              >
                <p className="font-bold text-white">{conversation.title}</p>
                <p className="mt-1 text-sm leading-6 text-[#c7cfdb]">
                  {conversation.summary}
                </p>
                <p className="mt-1 text-xs leading-5 text-[#9aa7b8]">
                  Updated {formatDate(conversation.updatedAt)}
                </p>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
      {contextWarnings.length ? (
        <section
          aria-label="Unavailable Health Advisor context"
          className="rounded-xl border border-amber-300/30 bg-amber-300/10 p-3"
        >
          <h4 className="text-xs font-black uppercase tracking-[0.12em] text-amber-100">
            Context unavailable
          </h4>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm leading-6 text-amber-50">
            {contextWarnings.map((warning) => (
              <li key={warning}>{warning}</li>
            ))}
          </ul>
        </section>
      ) : null}
      <section aria-label="General health information">
        <h4 className="text-xs font-black uppercase tracking-[0.12em] text-red-200">
          General medical information
        </h4>
        <p className="mt-2 whitespace-pre-wrap">{generalInformation}</p>
      </section>
      <section aria-label="Possible medical explanations">
        <h4 className="text-xs font-black uppercase tracking-[0.12em] text-red-200">
          Possible explanations
        </h4>
        <p className="mt-2 whitespace-pre-wrap">
          {response.possibleExplanations ||
            "No source-supported possibilities were included for this question."}
        </p>
      </section>
      <section aria-label="Questions for a clinician">
        <h4 className="text-xs font-black uppercase tracking-[0.12em] text-red-200">
          Questions for a clinician
        </h4>
        <p className="mt-2 whitespace-pre-wrap">
          {response.questionsForClinician ||
            "No additional clinician questions were identified."}
        </p>
      </section>
      <section aria-label="External medical sources">
        <h4 className="text-xs font-black uppercase tracking-[0.12em] text-red-200">
          External medical sources
        </h4>
        {response.externalSources.length ? (
          <ul className="mt-2 list-disc space-y-2 pl-5">
            {response.externalSources.map((source) => (
              <li key={source.url}>
                <a
                  href={source.url}
                  target="_blank"
                  rel="noreferrer"
                  className="font-bold text-cyan-200 underline-offset-4 hover:underline"
                >
                  {source.title}
                </a>
                <span className="text-[#9aa7b8]">
                  {" "}
                  — {source.organization}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-2 text-sm leading-6 text-[#c7cfdb]">
            No approved external citation was available. No uncited medical
            answer was substituted.
          </p>
        )}
      </section>
      <details className="rounded-xl border border-white/10 p-3">
        <summary className="cursor-pointer text-sm font-bold text-red-100">
          Safety limitations
        </summary>
        <ul className="mt-3 list-disc space-y-1 pl-5 text-xs leading-5 text-[#9aa7b8]">
          {response.limitations.map((limitation) => (
            <li key={limitation}>{limitation}</li>
          ))}
        </ul>
      </details>
    </div>
  );
}

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
  const [healthGoals, setHealthGoals] = useState<HealthAdvisorGoal[]>([]);
  const [history, setHistory] = useState<ProfessionalExecutionHistory>();
  const [store, setStore] = useState<SupabaseExecutionHistoryStore | null>(
    null
  );
  const [conversationRepository, setConversationRepository] =
    useState<ServerAgentConversationRepository | null>(null);
  const [conversationThreads, setConversationThreads] = useState<
    AgentConversationThread[]
  >([]);
  const [activeConversationId, setActiveConversationId] = useState("");
  const [conversationTitle, setConversationTitle] =
    useState("New conversation");
  const [conversationHistoryError, setConversationHistoryError] = useState("");
  const [conversationHistoryOpen, setConversationHistoryOpen] = useState(false);
  const [conversationHistorySearch, setConversationHistorySearch] =
    useState("");
  const [loading, setLoading] = useState(true);
  const [recordsUnavailable, setRecordsUnavailable] = useState(false);
  const [dataError, setDataError] = useState("");
  const [historyError, setHistoryError] = useState("");
  const [pendingId, setPendingId] = useState("");
  const [knowledgePrompt, setKnowledgePrompt] =
    useState<ProfessionalKnowledgeItem | null>(null);
  const [knowledgeTargetRecordId, setKnowledgeTargetRecordId] = useState("");
  const [pendingKnowledgeAnswer, setPendingKnowledgeAnswer] = useState("");
  const [healthQuestion, setHealthQuestion] = useState("");
  const [healthQuestionBusy, setHealthQuestionBusy] = useState(false);
  const [healthQuestionError, setHealthQuestionError] = useState("");
  const [externalResearchConsent, setExternalResearchConsent] = useState(false);
  const [questionTurns, setQuestionTurns] = useState<
    HealthAdvisorQuestionTurn[]
  >([]);
  const [knowledgeSaveState, setKnowledgeSaveState] = useState<
    "idle" | "review" | "saving" | "saved" | "error"
  >("idle");
  const healthConversationScrollPositions = useRef(new Map<string, number>());
  const conversationHistoryDialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!conversationHistoryOpen) return;
    conversationHistoryDialogRef.current
      ?.querySelector<HTMLButtonElement>("button")
      ?.focus();
    function closeConversationHistory(event: KeyboardEvent) {
      if (event.key === "Escape") setConversationHistoryOpen(false);
    }
    document.addEventListener("keydown", closeConversationHistory);
    return () =>
      document.removeEventListener("keydown", closeConversationHistory);
  }, [conversationHistoryOpen]);
  const workspacePromptHydrated = useRef(false);

  async function refreshConversationThreads(
    nextRepository = conversationRepository,
    selectedOwnerId = ownerId,
    search = conversationHistorySearch
  ) {
    if (!nextRepository || !selectedOwnerId) return [];
    const nextThreads = await nextRepository.list({
      ownerId: selectedOwnerId,
      agentId: healthAdvisorProfessionalId,
      includeArchived: true,
      search,
    });
    setConversationThreads(nextThreads);
    return nextThreads;
  }

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
    if (workspacePromptHydrated.current) return;
    workspacePromptHydrated.current = true;
    const parameters = new URLSearchParams(window.location.search);
    const prompt = parameters.get("prompt")?.trim();
    const topic = parameters.get("topic")?.trim();
    const recordId = parameters.get("record")?.trim();
    const topicDefinition = topic ? healthWorkspacePromptTopics[topic] : null;
    if (!prompt || !topicDefinition) return;
    setKnowledgePrompt({
      id: topicDefinition.id,
      label: topicDefinition.label,
      summary:
        "Context opened from a BeastHealth record workspace for member review.",
      confidence: "unknown",
      action: {
        label: "Continue conversation",
        mode: "conversation",
        prompt: `Tell me what you would like me to understand about your ${topicDefinition.label.toLowerCase()}.`,
      },
    });
    setKnowledgeTargetRecordId(recordId || "");
    setHealthQuestion(prompt);
    setPendingKnowledgeAnswer("");
    setKnowledgeSaveState("idle");
    setHealthQuestionError("");
    window.requestAnimationFrame(() => {
      document
        .getElementById("health-advisor-conversation")
        ?.scrollIntoView({ behavior: "smooth", block: "start" });
      document
        .getElementById("health-advisor-question")
        ?.querySelector("textarea")
        ?.focus({ preventScroll: true });
    });
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
      const [healthResult, documentResult, profileResult, goalResult] = await Promise.all([
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
        client
          .from("beast_goals")
          .select("id, title, status, priority, progress, current_step, target_date")
          .eq("owner_id", userId)
          .eq("category", "Health")
          .neq("status", "Archived")
          .order("updated_at", { ascending: false }),
      ]);
      if (healthResult.error) throw healthResult.error;
      const nextRecords = (
        (healthResult.data || []) as HealthRecordRow[]
      )
        .map(normalizeHealthRecord)
        .filter((record): record is HealthRecord => Boolean(record));
      const nextStore = new SupabaseExecutionHistoryStore(client);
      const nextConversationRepository =
        new ServerAgentConversationRepository(
          new SupabaseAgentConversationStore(client)
        );
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
      setHealthGoals(
        goalResult.error ? [] : ((goalResult.data || []) as HealthAdvisorGoal[])
      );
      setStore(nextStore);
      setConversationRepository(nextConversationRepository);
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
      try {
        let nextThreads = await nextConversationRepository.list({
          ownerId: userId,
          agentId: healthAdvisorProfessionalId,
          includeArchived: true,
        });
        let activeThread = nextThreads.find((thread) => !thread.archived);
        if (!activeThread) {
          activeThread = await nextConversationRepository.create({
            ownerId: userId,
            agentId: healthAdvisorProfessionalId,
          });
          nextThreads = [activeThread, ...nextThreads];
        }
        if (!cancelled) {
          setConversationThreads(nextThreads);
          setActiveConversationId(activeThread.id);
          setConversationTitle(activeThread.title);
          setQuestionTurns(restoreHealthAdvisorTurns(activeThread));
          setConversationHistoryError("");
        }
      } catch {
        if (!cancelled) {
          setConversationHistoryError(
            "Saved conversation history is unavailable. You can still ask a question, but this conversation may not be remembered."
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
    const understanding = buildHealthAdvisorUnderstanding({
      records,
      recommendations: model.recommendations,
      documents,
    });
    const healthKnowledgeItem = (
      item: HealthUnderstandingItem
    ): ProfessionalKnowledgeItem => ({
      id: item.id,
      label: item.label,
      summary:
        item.value ||
        item.question ||
        "Health Advisor needs more owner-confirmed context for this area.",
      confidence: item.confidence,
      why: item.why,
      evidence: item.evidence,
      action:
        item.state === "needed"
          ? {
              label: "Talk with Health Advisor",
              mode: "conversation",
              prompt:
                item.question ||
                `Tell me what you would like me to understand about ${item.label.toLowerCase()}.`,
            }
          : {
              label:
                item.state === "thought"
                  ? "Review supporting context"
                  : "Review or edit",
              mode: item.state === "thought" ? "detail" : "edit",
              href: item.href || "/dashboard/health",
            },
    });
    const known = understanding.whatIKnow.map(healthKnowledgeItem);
    const thinking = understanding.whatIThink.map(healthKnowledgeItem);
    const needed = understanding.whatIStillNeed
      .filter((item) => Boolean(knowledgeRecordKinds[item.id]))
      .slice()
      .sort((left, right) => left.priority - right.priority)
      .map(healthKnowledgeItem);

    return {
      professionalId: healthAdvisorProfessionalId,
      professionalName: "Health Advisor",
      known,
      thinking,
      needed,
      emptyStates: {
        known:
          "We’re just getting started. Confirmed health context will appear here with its evidence source.",
        thinking:
          "There is not enough evidence for a useful working idea. Health Advisor never presents a working idea as medical fact.",
        needed:
          "I have enough owner-confirmed context for the current health organization workflow.",
      },
    };
  }, [documents, model.recommendations, records]);

  function beginKnowledgeConversation(item: ProfessionalKnowledgeItem) {
    if (item.action.mode !== "conversation") return;
    setKnowledgePrompt(item);
    setKnowledgeTargetRecordId("");
    setPendingKnowledgeAnswer("");
    setKnowledgeSaveState("idle");
    setHealthQuestion("");
    setHealthQuestionError("");
    window.requestAnimationFrame(() => {
      document
        .getElementById("health-advisor-question")
        ?.scrollIntoView({ behavior: "smooth", block: "center" });
      document
        .getElementById("health-advisor-question")
        ?.querySelector("textarea")
        ?.focus({ preventScroll: true });
    });
  }

  async function confirmKnowledgeAnswer() {
    if (!ownerId || !knowledgePrompt || !pendingKnowledgeAnswer) return;
    setKnowledgeSaveState("saving");
    setDataError("");
    try {
      const client = createClient();
      const targetRecord = knowledgeTargetRecordId
        ? records.find(
            (record) =>
              record.id === knowledgeTargetRecordId &&
              record.ownerId === ownerId
          )
        : null;
      const mutation = targetRecord
        ? client
            .from("beast_health_records")
            .update({
              details: {
                ...targetRecord.details,
                context: pendingKnowledgeAnswer,
                topic: knowledgePrompt.id,
                provenance: "member_confirmed_conversation",
                conversation_id:
                  activeConversationId ||
                  (typeof targetRecord.details.conversation_id === "string"
                    ? targetRecord.details.conversation_id
                    : "") ||
                  null,
              },
            })
            .eq("id", targetRecord.id)
            .eq("owner_id", ownerId)
        : client.from("beast_health_records").insert({
            owner_id: ownerId,
            record_type:
              knowledgeRecordKinds[knowledgePrompt.id] || "profile",
            title: knowledgePrompt.label,
            status: "active",
            occurred_on: null,
            source: "Member-reported Health Advisor conversation",
            details: {
              context: pendingKnowledgeAnswer,
              topic: knowledgePrompt.id,
              provenance: "member_confirmed_conversation",
              conversation_id: activeConversationId || null,
            },
            notes: null,
          });
      const { data, error } = await mutation
        .select(
          "id, owner_id, record_type, title, status, occurred_on, source, details, notes, created_at, updated_at"
        )
        .single();
      if (error) throw error;
      const saved = normalizeHealthRecord(data as HealthRecordRow);
      if (!saved) throw new Error("The saved health context was invalid.");
      setRecords((current) =>
        targetRecord
          ? current.map((record) => (record.id === saved.id ? saved : record))
          : [saved, ...current]
      );
      setKnowledgeSaveState("saved");
      setKnowledgePrompt(null);
      setKnowledgeTargetRecordId("");
      setPendingKnowledgeAnswer("");
    } catch {
      setKnowledgeSaveState("error");
    }
  }

  async function persistHealthConversationTurn(
    turnId: string,
    question: string,
    response:
      | { kind: "external"; answer: HealthAdvisorQuestionAnswer }
      | { kind: "intake"; text: string }
  ) {
    if (!conversationRepository || !activeConversationId || !ownerId) return;
    const timestamp = new Date().toISOString();
    const messages: AgentMessage[] = [
      {
        id: `${turnId}-member`,
        threadId: activeConversationId,
        sender: { kind: "user", id: ownerId },
        recipient: { kind: "agent", id: healthAdvisorProfessionalId },
        content: question,
        timestamp,
      },
      {
        id: `${turnId}-advisor`,
        threadId: activeConversationId,
        sender: { kind: "agent", id: healthAdvisorProfessionalId },
        recipient: { kind: "module", id: "beasthealth" },
        content:
          response.kind === "external"
            ? {
                kind: "health_advisor_answer",
                answer: response.answer,
              }
            : {
                kind: "health_advisor_intake",
                text: response.text,
              },
        timestamp,
      },
    ];
    try {
      const updated = await conversationRepository.append(
        ownerId,
        activeConversationId,
        messages
      );
      await conversationRepository.summarize(ownerId, activeConversationId, {
        overview: `Discussed ${question.slice(0, 100)}`,
        decisions: [],
        unresolvedFollowUps:
          response.kind === "intake"
            ? ["Confirm whether the member-reported context should be saved."]
            : [],
        updatedAt: timestamp,
      });
      setConversationTitle(updated.title);
      await refreshConversationThreads();
      setConversationHistoryError("");
    } catch {
      setConversationHistoryError(
        "This response is visible now but could not be added to saved conversation history."
      );
    }
  }

  async function askHealthAdvisor(question: string) {
    if (healthQuestionBusy) return;
    const messageTimestamp = new Date().toISOString();
    const turnId = `health-question-${Date.now()}`;
    const disclosedTopic = knowledgePrompt
      ? null
      : detectMemberHealthDisclosure(question);
    const activeKnowledgePrompt =
      knowledgePrompt ||
      (disclosedTopic
        ? ({
            id: disclosedTopic.id,
            label: disclosedTopic.label,
            summary:
              "Direct member-reported context detected in this conversation.",
            confidence: "unknown",
            action: {
              label: "Review before saving",
              mode: "conversation",
              prompt:
                "I noticed health context that may be useful to remember. I’ll ask you to confirm it before it becomes a record.",
            },
          } satisfies ProfessionalKnowledgeItem)
        : null);
    if (activeKnowledgePrompt) {
      const intakeResponse = {
        kind: "intake" as const,
        text: `Thank you. I heard this as member-reported ${activeKnowledgePrompt.label.toLowerCase()} context. Review it below before I add it to your BeastHealth record.`,
      };
      if (!knowledgePrompt) setKnowledgePrompt(activeKnowledgePrompt);
      setQuestionTurns((current) => [
        ...current,
        {
          id: turnId,
          question,
          response: intakeResponse,
          timestamp: messageTimestamp,
        },
      ]);
      setPendingKnowledgeAnswer(question);
      setKnowledgeSaveState("review");
      setHealthQuestion("");
      void persistHealthConversationTurn(turnId, question, intakeResponse);
      return;
    }
    if (!externalResearchConsent) {
      setHealthQuestionError(
        "Approve external research for this question before sending it. Saved BeastHealth records will remain inside Beast."
      );
      return;
    }
    setHealthQuestionBusy(true);
    setHealthQuestionError("");
    try {
      const result = await fetch("/api/health/advisor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question,
          externalResearchConsent: true,
        }),
      });
      const payload = (await result.json()) as
        | HealthAdvisorQuestionAnswer
        | { error?: string };
      if (!("answer" in payload)) {
        throw new Error(
          payload.error || "Health Advisor could not answer this question."
        );
      }
      const externalResponse = {
        kind: "external" as const,
        answer: payload,
      };
      setQuestionTurns((current) => [
        ...current,
        {
          id: turnId,
          question,
          response: externalResponse,
          timestamp: messageTimestamp,
        },
      ]);
      setHealthQuestion("");
      setExternalResearchConsent(false);
      void persistHealthConversationTurn(turnId, question, externalResponse);
    } catch (error) {
      setHealthQuestionError(
        error instanceof Error
          ? error.message
          : "Health Advisor could not answer this question."
      );
    } finally {
      setHealthQuestionBusy(false);
    }
  }

  async function startHealthAdvisorConversation() {
    setKnowledgePrompt(null);
    setKnowledgeTargetRecordId("");
    setPendingKnowledgeAnswer("");
    setKnowledgeSaveState("idle");
    setHealthQuestion("");
    setQuestionTurns([]);
    setConversationHistoryOpen(false);
    if (!conversationRepository || !ownerId) {
      setActiveConversationId("");
      setConversationTitle("New conversation");
      return;
    }
    try {
      const thread = await conversationRepository.create({
        ownerId,
        agentId: healthAdvisorProfessionalId,
      });
      setActiveConversationId(thread.id);
      setConversationTitle(thread.title);
      await refreshConversationThreads();
      setConversationHistoryError("");
    } catch {
      setConversationHistoryError(
        "A new saved conversation could not be created."
      );
    }
  }

  function openHealthAdvisorConversation(thread: AgentConversationThread) {
    setActiveConversationId(thread.id);
    setConversationTitle(thread.title);
    setQuestionTurns(restoreHealthAdvisorTurns(thread));
    setKnowledgePrompt(null);
    setKnowledgeTargetRecordId("");
    setPendingKnowledgeAnswer("");
    setKnowledgeSaveState("idle");
    setHealthQuestion("");
    setConversationHistoryOpen(false);
  }

  async function renameHealthAdvisorConversation(
    thread: AgentConversationThread
  ) {
    if (!conversationRepository || !ownerId) return;
    const title = window.prompt("Rename conversation", thread.title);
    if (!title?.trim()) return;
    try {
      await conversationRepository.rename(ownerId, thread.id, title);
      if (thread.id === activeConversationId) {
        setConversationTitle(title.trim());
      }
      await refreshConversationThreads();
      setConversationHistoryError("");
    } catch {
      setConversationHistoryError("The conversation could not be renamed.");
    }
  }

  async function pinHealthAdvisorConversation(thread: AgentConversationThread) {
    if (!conversationRepository || !ownerId) return;
    try {
      await conversationRepository.pin(ownerId, thread.id, !thread.pinned);
      await refreshConversationThreads();
      setConversationHistoryError("");
    } catch {
      setConversationHistoryError("The conversation pin could not be updated.");
    }
  }

  async function archiveHealthAdvisorConversation(
    thread: AgentConversationThread
  ) {
    if (!conversationRepository || !ownerId) return;
    try {
      await conversationRepository.archive(
        ownerId,
        thread.id,
        !thread.archived
      );
      if (thread.id === activeConversationId && !thread.archived) {
        await startHealthAdvisorConversation();
      } else {
        await refreshConversationThreads();
      }
      setConversationHistoryError("");
    } catch {
      setConversationHistoryError(
        "The conversation archive state could not be updated."
      );
    }
  }

  async function deleteHealthAdvisorConversation(
    thread: AgentConversationThread
  ) {
    if (
      !conversationRepository ||
      !ownerId ||
      !window.confirm(
        "Delete this Health Advisor conversation? Saved health records and recommendation history will remain."
      )
    ) {
      return;
    }
    try {
      await conversationRepository.delete(ownerId, thread.id, true, "retain");
      if (thread.id === activeConversationId) {
        await startHealthAdvisorConversation();
      } else {
        await refreshConversationThreads();
      }
      setConversationHistoryError("");
    } catch {
      setConversationHistoryError("The conversation could not be deleted.");
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

  const healthQuestionMessages = useMemo<AgentConversationMessage[]>(
    () => [
      {
        id: "health-question-opening",
        role: "agent",
        author: "Health Advisor",
        content: `Hi${memberName ? ` ${memberName.split(/\s+/)[0]}` : ""}. I’m your Health Advisor. I’d like to understand your health history so I can help you organize your records and prepare for appointments. What would you like me to know first?`,
      },
      ...(knowledgePrompt?.action.mode === "conversation"
        ? [
            {
              id: `health-intake-${knowledgePrompt.id}`,
              role: "agent" as const,
              author: "Health Advisor",
              content: knowledgePrompt.action.prompt,
            },
          ]
        : []),
      ...questionTurns.flatMap<AgentConversationMessage>((turn) => [
        {
          id: `${turn.id}-member`,
          role: "user",
          author: "You",
          content: turn.question,
          timestamp: formatProfessionalMessageTime(turn.timestamp),
        },
        {
          id: `${turn.id}-advisor`,
          role: "agent",
          author: "Health Advisor",
          timestamp: formatProfessionalMessageTime(turn.timestamp),
          content:
            turn.response?.kind === "external" ? (
              <HealthAdvisorAnswerDocument response={turn.response.answer} />
            ) : (
              <p>{turn.response?.text}</p>
            ),
        },
      ]),
      ...(healthQuestionBusy
        ? [
            {
              id: "health-question-pending",
              role: "agent" as const,
              author: "Health Advisor",
              streaming: true,
              content: (
                <AgentThinkingIndicator label="Reviewing current medical sources…" />
              ),
            },
          ]
        : []),
    ],
    [healthQuestionBusy, knowledgePrompt, memberName, questionTurns]
  );
  const previousHealthConversation = conversationThreads
    .filter(
      (thread) => thread.id !== activeConversationId && !thread.archived
    )
    .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))[0];
  const healthConversationHistory = (
    <ProfessionalConversationHistory
      professionalName="Health Advisor"
      threads={conversationThreads}
      activeThreadId={activeConversationId}
      searchValue={conversationHistorySearch}
      loading={loading}
      error={conversationHistoryError}
      onSearchChange={(value) => {
        setConversationHistorySearch(value);
        void refreshConversationThreads(
          conversationRepository,
          ownerId,
          value
        );
      }}
      onNewConversation={() => void startHealthAdvisorConversation()}
      onOpen={(item) => {
        const thread = conversationThreads.find(
          (candidate) => candidate.id === item.id
        );
        if (thread) openHealthAdvisorConversation(thread);
      }}
      onRename={(item) => {
        const thread = conversationThreads.find(
          (candidate) => candidate.id === item.id
        );
        if (thread) void renameHealthAdvisorConversation(thread);
      }}
      onPin={(item) => {
        const thread = conversationThreads.find(
          (candidate) => candidate.id === item.id
        );
        if (thread) void pinHealthAdvisorConversation(thread);
      }}
      onArchive={(item) => {
        const thread = conversationThreads.find(
          (candidate) => candidate.id === item.id
        );
        if (thread) void archiveHealthAdvisorConversation(thread);
      }}
      onDelete={(item) => {
        const thread = conversationThreads.find(
          (candidate) => candidate.id === item.id
        );
        if (thread) void deleteHealthAdvisorConversation(thread);
      }}
      onClose={() => setConversationHistoryOpen(false)}
    />
  );

  return (
    <BeastHealthShell
      title="Health Advisor"
      description="Evidence-backed record review and appointment preparation within strict medical safety boundaries."
    >
      <ProfessionalExperienceBoundary
        professionalId={healthAdvisorProfessionalId}
        professionalName="Health Advisor"
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
        </div>

        <DashboardCard accent="health">
          <SectionHeader
            eyebrow="Health Advisor"
            title={conversationTitle}
            description="Conversation is the front door to BeastHealth. Build your health story naturally, review saved context, or ask a question."
            action={
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  className="beast-button-secondary min-h-11"
                  aria-expanded={conversationHistoryOpen}
                  aria-controls="health-advisor-history-drawer"
                  onClick={() => setConversationHistoryOpen(true)}
                >
                  Conversations
                </button>
                <button
                  type="button"
                  className="beast-button-secondary min-h-11"
                  onClick={() => void startHealthAdvisorConversation()}
                >
                  New conversation
                </button>
              </div>
            }
          />
          {conversationHistoryOpen ? (
            <div
              className="fixed inset-0 z-50 bg-black/70 p-3"
              role="presentation"
              onMouseDown={(event) => {
                if (event.target === event.currentTarget) {
                  setConversationHistoryOpen(false);
                }
              }}
            >
              <div
                ref={conversationHistoryDialogRef}
                id="health-advisor-history-drawer"
                className="ml-auto h-full max-h-[calc(100vh-1.5rem)] w-full max-w-sm overflow-hidden rounded-2xl border border-white/15 bg-slate-950 shadow-2xl"
                role="dialog"
                aria-modal="true"
                aria-label="Health Advisor conversations"
              >
                {healthConversationHistory}
              </div>
            </div>
          ) : null}
          {conversationHistoryError ? (
            <p
              className="mt-3 rounded-xl border border-amber-300/30 bg-amber-300/10 p-3 text-sm leading-6 text-amber-100"
              role="alert"
            >
              {conversationHistoryError}
            </p>
          ) : null}
          <div className="mt-5 flex h-[38rem] min-h-0 flex-col">
            <ProfessionalConversationTimeline
              messages={healthQuestionMessages}
              conversationId={
                activeConversationId || "health-advisor-new-conversation"
              }
              streaming={healthQuestionBusy}
              followLatestSignal={
                questionTurns.length + (healthQuestionBusy ? 1 : 0)
              }
              scrollPositions={healthConversationScrollPositions}
              professionalName="Health Advisor"
              professionalIdentity={healthAdvisorConversationIdentity}
            />
          </div>
          <div className="mt-4 grid gap-3 border-t border-white/10 pt-4">
            {knowledgePrompt ? (
              <div className="rounded-xl border border-red-200/15 bg-red-200/[0.05] p-3 text-sm leading-6 text-[#dbe3ef]">
                <p className="font-bold text-white">
                  Building: {knowledgePrompt.label}
                </p>
                <p className="mt-1">
                  Your answer stays inside Beast and will be shown for
                  confirmation before it becomes a saved record.
                </p>
                <button
                  type="button"
                  className="mt-2 text-xs font-bold text-red-100"
                  onClick={() => {
                    setKnowledgePrompt(null);
                    setKnowledgeTargetRecordId("");
                    setPendingKnowledgeAnswer("");
                    setKnowledgeSaveState("idle");
                  }}
                >
                  Cancel this topic
                </button>
              </div>
            ) : (
              <label className="flex items-start gap-3 rounded-xl border border-white/10 bg-black/10 p-3 text-sm leading-6 text-[#dbe3ef]">
                <input
                  type="checkbox"
                  className="mt-1 h-4 w-4 shrink-0 accent-red-300"
                  checked={externalResearchConsent}
                  onChange={(event) => {
                    setExternalResearchConsent(event.target.checked);
                    setHealthQuestionError("");
                  }}
                />
                <span>
                  For this question, I approve sending the text I type to OpenAI
                  for current web research. My saved BeastHealth records will
                  not be sent; they stay inside Beast and appear separately.
                </span>
              </label>
            )}
            <ProfessionalConversationComposer id="health-advisor-question">
              <AgentConversationInput
                value={healthQuestion}
                onChange={setHealthQuestion}
                onSubmit={askHealthAdvisor}
                label="Message your Health Advisor"
                placeholder="Ask about a condition, symptom, medication, procedure, lab, vital, appointment, family history, or clinician question…"
                busy={healthQuestionBusy}
              />
            </ProfessionalConversationComposer>
            {knowledgeSaveState === "review" && knowledgePrompt ? (
              <div className="rounded-xl border border-white/10 p-4">
                <p className="text-xs font-black uppercase text-red-200">
                  Confirm member-reported context
                </p>
                <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-[#dbe3ef]">
                  {pendingKnowledgeAnswer}
                </p>
                <p className="mt-2 text-xs leading-5 text-[#9aa7b8]">
                  Saving {knowledgeTargetRecordId ? "updates the selected record" : "adds this as member-reported context"}.
                  It does not confirm a diagnosis, medication, allergy, or
                  clinical conclusion.
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    type="button"
                    className="beast-button min-h-11"
                    onClick={() => void confirmKnowledgeAnswer()}
                  >
                    {knowledgeTargetRecordId
                      ? "Update confirmed record"
                      : "Save confirmed context"}
                  </button>
                  <button
                    type="button"
                    className="beast-button-secondary min-h-11"
                    onClick={() => setKnowledgeSaveState("idle")}
                  >
                    Keep discussing
                  </button>
                </div>
              </div>
            ) : knowledgeSaveState === "saving" ? (
              <p className="text-sm text-[#c7cfdb]" role="status">
                Saving confirmed health context…
              </p>
            ) : knowledgeSaveState === "saved" ? (
              <p
                className="rounded-xl border border-emerald-300/25 bg-emerald-300/10 p-3 text-sm text-emerald-100"
                role="status"
              >
                Saved as member-reported health context.
              </p>
            ) : knowledgeSaveState === "error" ? (
              <p
                className="rounded-xl border border-amber-300/30 bg-amber-300/10 p-3 text-sm text-amber-100"
                role="alert"
              >
                The context could not be saved. Your answer remains in this
                conversation so you can retry.
              </p>
            ) : null}
            {healthQuestionError ? (
              <p
                className="rounded-xl border border-amber-300/30 bg-amber-300/10 p-3 text-sm leading-6 text-amber-100"
                role="alert"
              >
                {healthQuestionError}
              </p>
            ) : null}
            <p className="text-xs leading-5 text-[#9aa7b8]">
              Health Advisor does not diagnose, prescribe, determine treatment,
              or tell you to start, stop, or change medication. For urgent
              concerns, use appropriate local emergency or qualified clinical
              care.
            </p>
          </div>
        </DashboardCard>

        {!loading && !recordsUnavailable ? (
          <DashboardCard accent="health">
            <ProfessionalKnowledgeWorkspace
              model={knowledgeModel}
              onAction={beginKnowledgeConversation}
            />
          </DashboardCard>
        ) : null}

        <div className="grid min-w-0 gap-4 xl:grid-cols-2">
          <ProfessionalTimeAwareness
            title={
              previousHealthConversation
                ? "Returning health conversation"
                : "First recorded health conversation"
            }
            description="Timing comes only from persisted Health Advisor conversations and saved record timestamps."
            items={[
              {
                id: "health-conversation-timing",
                label: previousHealthConversation
                  ? "Previous conversation"
                  : "Conversation status",
                value: previousHealthConversation
                  ? new Date(
                      previousHealthConversation.updatedAt
                    ).toLocaleString()
                  : "No earlier conversation was found",
                evidence: previousHealthConversation
                  ? "Persisted Health Advisor conversation history."
                  : "No previous conversation timestamp is available.",
              },
              {
                id: "health-record-updates",
                label: "Latest verified record update",
                value: model.executiveBriefing.lastUpdatedAt
                  ? formatDate(model.executiveBriefing.lastUpdatedAt)
                  : "No saved record update",
                evidence:
                  "This is record freshness only, not a medical trend or conclusion.",
              },
            ]}
            unavailableMessage="Health timing becomes available after a conversation or health record is saved."
          />
          <ProfessionalMemoryTimeline
            professionalName="Health Advisor"
            items={conversationThreads
              .filter((thread) => !thread.archived)
              .slice(0, 6)
              .map((thread) => ({
                id: thread.id,
                title: thread.title,
                summary:
                  thread.summary.overview === "No conversation summary yet."
                    ? "No saved summary is available for this conversation."
                    : thread.summary.overview,
                occurredAt: new Date(thread.updatedAt).toLocaleString(),
                source: "Saved Health Advisor conversation",
              }))}
            emptyState="No Health Advisor conversation memory is available. Health history will not be inferred."
          />
        </div>

        <ProfessionalSupportingWorkspaces
          professionalName="Health Advisor"
          workspaces={[
            {
              id: "health-conditions",
              label: "Conditions",
              description: "Review saved condition records and context.",
              href: "/dashboard/health/conditions",
            },
            {
              id: "health-medications",
              label: "Medications",
              description: "Review the member-controlled medication list.",
              href: "/dashboard/health/medications",
            },
            {
              id: "health-procedures",
              label: "Procedures",
              description: "Review procedures and linked records.",
              href: "/dashboard/health/procedures",
            },
            {
              id: "health-vitals",
              label: "Vitals",
              description: "Review saved vital measurements without inference.",
              href: "/dashboard/health/vitals",
            },
            {
              id: "health-appointments",
              label: "Appointments",
              description: "Prepare questions and organize upcoming care.",
              href: "/dashboard/health/appointments",
            },
            {
              id: "health-documents",
              label: "Documents",
              description: "Review permissioned medical document context.",
              href: "/dashboard/health/documents",
            },
          ]}
        />

        <DashboardCard accent="goals">
          <SectionHeader
            eyebrow="Shared Life Planning"
            title="Health goals"
            description="Health Advisor reads the owner’s canonical BeastGoals records. Recommendations and progress updates attach to these IDs instead of creating a separate health-goal list."
            action={<ModuleBadge module="goals" label="BeastGoals" />}
          />
          <div className="mt-5 grid gap-3 md:grid-cols-2">
            {healthGoals.length > 0 ? (
              healthGoals.map((goal) => (
                <Link
                  key={goal.id}
                  href="/dashboard/goals?module=health"
                  className="min-w-0 rounded-xl border border-[#2a3242] bg-[#111827] p-4 transition hover:border-red-300/30"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h3 className="break-words font-black text-white">{goal.title}</h3>
                    <span className="rounded-full border border-[#364153] px-2.5 py-1 text-xs font-black text-[#c7cfdb]">{goal.priority || "Medium"}</span>
                  </div>
                  <p className="mt-2 text-sm leading-6 text-[#c7cfdb]">
                    {goal.current_step || "Review this goal and define the next safe step."}
                  </p>
                  <div className="mt-2 text-xs font-bold text-[#7f8da3]">
                    {goal.progress == null ? "Progress not set" : `${goal.progress}% complete`}
                    {goal.target_date ? ` · Target ${goal.target_date}` : ""}
                  </div>
                </Link>
              ))
            ) : (
              <p className="rounded-xl border border-[#2a3242] bg-[#111827] p-4 text-sm leading-6 text-[#c7cfdb]">
                No active Health goal is saved. Health Advisor will not infer one; the member can create or approve it in BeastGoals.
              </p>
            )}
          </div>
        </DashboardCard>

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
                    {(!lifecycle || ["proposed", "deferred"].includes(lifecycle.status)) ? <button type="button" data-analytics-event="recommendation_accepted" data-analytics-status="accepted" className="beast-button min-h-11" disabled={pending || !store} onClick={() => { void decideRecommendation(recommendation, "accepted"); }}>Accept for review</button> : null}
                    {(!lifecycle || lifecycle.status === "proposed") ? <button type="button" data-analytics-event="recommendation_deferred" data-analytics-status="deferred" className="beast-button-secondary min-h-11" disabled={pending || !store} onClick={() => { void decideRecommendation(recommendation, "deferred"); }}>Defer</button> : null}
                    {(!lifecycle || ["proposed", "deferred"].includes(lifecycle.status)) ? <button type="button" data-analytics-event="recommendation_dismissed" data-analytics-status="dismissed" className="beast-button-secondary min-h-11" disabled={pending || !store} onClick={() => { void decideRecommendation(recommendation, "declined"); }}>Decline</button> : null}
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
      </ProfessionalExperienceBoundary>
    </BeastHealthShell>
  );
}
