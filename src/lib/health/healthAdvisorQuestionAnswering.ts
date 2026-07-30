import type { HealthRecord, HealthRecordKind } from "./foundation";

export const healthAuthorityDomains = [
  "fda.gov",
  "nih.gov",
  "ncbi.nlm.nih.gov",
  "medlineplus.gov",
  "cdc.gov",
  "hhs.gov",
  "cms.gov",
  "uspreventiveservicestaskforce.org",
  "heart.org",
  "acponline.org",
  "aafp.org",
  "aap.org",
  "acog.org",
  "diabetes.org",
  "cancer.org",
  "mayoclinic.org",
  "clevelandclinic.org",
  "hopkinsmedicine.org",
  "ucsfhealth.org",
  "yalemedicine.org",
] as const;

export type HealthAdvisorRecordEvidence = {
  id: string;
  kind: HealthRecordKind;
  title: string;
  status: HealthRecord["status"];
  occurredOn: string | null;
  source: string;
  provenance: "saved_beasthealth_record";
};

export type HealthAdvisorDocumentEvidence = {
  id: string;
  title: string;
  updatedAt: string;
  source: string;
  summary: string | null;
  provenance: "saved_beast_document";
};

export type HealthAdvisorConversationEvidence = {
  id: string;
  title: string;
  updatedAt: string;
  summary: string;
  provenance: "saved_health_advisor_conversation";
};

export type HealthAdvisorExternalSource = {
  title: string;
  url: string;
  organization: string;
};

export type HealthAdvisorQuestionAnswer = {
  status:
    | "ready"
    | "consent_required"
    | "unconfigured"
    | "insufficient_sources"
    | "error";
  answer: string;
  generalInformation: string;
  possibleExplanations: string;
  questionsForClinician: string;
  recordEvidence: HealthAdvisorRecordEvidence[];
  documentEvidence: HealthAdvisorDocumentEvidence[];
  conversationEvidence: HealthAdvisorConversationEvidence[];
  contextWarnings: string[];
  externalSources: HealthAdvisorExternalSource[];
  limitations: string[];
  model: string;
};

export type HealthAdvisorDocumentContext = {
  id: string;
  title: string;
  description: string | null;
  status: string;
  updatedAt: string;
  source: string;
  summary: string | null;
};

export type HealthAdvisorConversationContext = {
  id: string;
  title: string;
  updatedAt: string;
  summary: string;
  archived: boolean;
};

export type HealthAdvisorDisclosureTopic = {
  id: string;
  label: string;
};

type OpenAIUrlCitation = {
  type: "url_citation";
  title?: string;
  url?: string;
};

export type OpenAIHealthResponsePayload = {
  output_text?: string;
  output?: {
    type?: string;
    content?: {
      type?: string;
      text?: string;
      annotations?: OpenAIUrlCitation[];
    }[];
  }[];
};

const topicKinds: readonly {
  kinds: readonly HealthRecordKind[];
  terms: readonly string[];
}[] = [
  {
    kinds: ["medication"],
    terms: [
      "medication",
      "medicine",
      "drug",
      "prescription",
      "dose",
      "dosage",
      "pill",
      "pharmacy",
    ],
  },
  {
    kinds: ["condition"],
    terms: [
      "condition",
      "diagnosis",
      "disease",
      "disorder",
      "symptom",
      "symptoms",
      "pain",
    ],
  },
  {
    kinds: ["procedure"],
    terms: [
      "procedure",
      "surgery",
      "operation",
      "biopsy",
      "imaging",
      "scan",
    ],
  },
  {
    kinds: ["vital"],
    terms: [
      "vital",
      "blood pressure",
      "heart rate",
      "pulse",
      "temperature",
      "weight",
      "oxygen",
      "spo2",
    ],
  },
  {
    kinds: ["appointment", "provider"],
    terms: [
      "appointment",
      "visit",
      "doctor",
      "clinician",
      "provider",
      "specialist",
    ],
  },
  {
    kinds: ["family_history"],
    terms: ["family", "hereditary", "genetic", "relative", "parent", "sibling"],
  },
  {
    kinds: ["lifestyle"],
    terms: [
      "sleep",
      "exercise",
      "movement",
      "nutrition",
      "diet",
      "smoking",
      "alcohol",
      "lifestyle",
    ],
  },
  {
    kinds: ["document"],
    terms: [
      "lab",
      "labs",
      "result",
      "results",
      "report",
      "document",
      "record",
    ],
  },
  {
    kinds: ["profile"],
    terms: [
      "allergy",
      "allergies",
      "health history",
      "medical history",
      "background",
      "care preference",
    ],
  },
];

const stopWords = new Set([
  "about",
  "after",
  "again",
  "also",
  "could",
  "does",
  "from",
  "have",
  "health",
  "help",
  "into",
  "know",
  "should",
  "that",
  "their",
  "there",
  "these",
  "this",
  "what",
  "when",
  "where",
  "which",
  "with",
  "would",
  "your",
]);

const timelineTerms = [
  "timeline",
  "history",
  "historical",
  "previous",
  "prior",
  "past",
  "recent",
] as const;

const documentTerms = [
  "document",
  "documents",
  "uploaded",
  "upload",
  "report",
  "reports",
  "record",
  "records",
  "lab",
  "labs",
] as const;

const conversationTerms = [
  "conversation",
  "conversations",
  "discussed",
  "last time",
  "previously",
  "prior",
  "earlier",
  "remember",
] as const;

const disclosureTopics: readonly {
  id: string;
  label: string;
  pattern: RegExp;
}[] = [
  {
    id: "health-allergies-needed",
    label: "Allergies",
    pattern:
      /\b(i(?:'m| am) allergic|i have an allergy|my allergies? (?:is|are))\b/i,
  },
  {
    id: "health-medications-needed",
    label: "Current medication status",
    pattern:
      /\b(i (?:take|use|am taking)|i do not take|my medications? (?:is|are))\b/i,
  },
  {
    id: "health-conditions-needed",
    label: "Known condition status",
    pattern:
      /\b(i (?:was|have been) diagnosed with|my (?:diagnosis|condition) is)\b/i,
  },
  {
    id: "health-symptoms-needed",
    label: "Symptoms or health concerns",
    pattern:
      /\b(i (?:have|am having|experience|am experiencing|feel) (?:pain|symptoms?|dizzy|dizziness|nausea|fatigue)|my symptoms? (?:is|are))\b/i,
  },
  {
    id: "health-care-team-needed",
    label: "Care team",
    pattern:
      /\b(my (?:doctor|clinician|provider|specialist) is|i see (?:a|an|dr\.?))\b/i,
  },
  {
    id: "health-clinician-outcomes-needed",
    label: "Clinician outcomes",
    pattern:
      /\b(my (?:doctor|clinician|provider|specialist) (?:said|concluded|confirmed|ruled out)|the (?:doctor|clinician|provider|specialist) (?:said|concluded|confirmed|ruled out))\b/i,
  },
  {
    id: "health-procedures-needed",
    label: "Procedure history",
    pattern:
      /\b(i (?:had|am scheduled for) (?:a |an )?(?:procedure|surgery|operation|biopsy|scan)|my procedure is)\b/i,
  },
  {
    id: "health-family-history-needed",
    label: "Family history",
    pattern: /\b(my family has a history of|family history of)\b/i,
  },
  {
    id: "health-lifestyle-needed",
    label: "Lifestyle context",
    pattern:
      /\b(i (?:sleep|exercise|smoke|drink)|my (?:sleep|diet|nutrition|activity|exercise) (?:is|has))\b/i,
  },
  {
    id: "health-vitals-needed",
    label: "Vitals",
    pattern:
      /\b(my (?:blood pressure|heart rate|pulse|temperature|weight|oxygen|spo2) (?:is|was|reads))\b/i,
  },
  {
    id: "health-insurance-needed",
    label: "Insurance context",
    pattern: /\b(my (?:insurance|coverage|health plan) is|i am covered by)\b/i,
  },
  {
    id: "health-appointments-needed",
    label: "Appointments",
    pattern:
      /\b(i have (?:a|an) (?:appointment|visit)|my (?:appointment|visit) is)\b/i,
  },
  {
    id: "health-goals-needed",
    label: "Health goals",
    pattern:
      /\b(my health goal is|i want to (?:improve|track|prepare|work on))\b/i,
  },
  {
    id: "health-documents-needed",
    label: "Medical documents",
    pattern:
      /\b(i (?:uploaded|have) (?:a|an|my) (?:medical |health )?(?:document|report|lab result)|my (?:report|lab result) says)\b/i,
  },
];

export function detectMemberHealthDisclosure(
  message: string
): HealthAdvisorDisclosureTopic | null {
  if (
    /^(what|when|where|why|how|should|could|can|is|are|do|does|did|would|will|may)\b/i.test(
      message.trim()
    )
  ) {
    return null;
  }
  for (const topic of disclosureTopics) {
    if (topic.pattern.test(message)) {
      return { id: topic.id, label: topic.label };
    }
  }
  return null;
}

function questionTokens(question: string) {
  return Array.from(
    new Set(
      question
        .toLowerCase()
        .split(/[^a-z0-9]+/)
        .filter((token) => token.length >= 4 && !stopWords.has(token))
    )
  );
}

function recordSearchText(record: HealthRecord) {
  return [
    record.title,
    record.source,
    record.notes,
    ...Object.values(record.details),
  ]
    .filter(
      (value): value is string | number | boolean =>
        typeof value === "string" ||
        typeof value === "number" ||
        typeof value === "boolean"
    )
    .join(" ")
    .toLowerCase();
}

export function selectRelevantHealthRecords(
  records: readonly HealthRecord[],
  question: string,
  limit = 12
) {
  const normalizedQuestion = question.toLowerCase();
  const topicalKinds = new Set<HealthRecordKind>();
  for (const topic of topicKinds) {
    if (topic.terms.some((term) => normalizedQuestion.includes(term))) {
      topic.kinds.forEach((kind) => topicalKinds.add(kind));
    }
  }
  const tokens = questionTokens(question);
  const isTimelineQuestion = timelineTerms.some((term) =>
    normalizedQuestion.includes(term)
  );
  return records
    .filter((record) => record.status !== "archived")
    .map((record) => {
      const searchable = recordSearchText(record);
      const lexicalMatches = tokens.filter((token) =>
        searchable.includes(token)
      ).length;
      return {
        record,
        score:
          (isTimelineQuestion ? 50 : 0) +
          (topicalKinds.has(record.recordType) ? 100 : 0) +
          lexicalMatches * 10,
      };
    })
    .filter(({ score }) => score > 0)
    .sort(
      (left, right) =>
        right.score - left.score ||
        right.record.updatedAt.localeCompare(left.record.updatedAt)
    )
    .slice(0, limit)
    .map(({ record }) => record);
}

function contextSearchText(...values: (string | null | undefined)[]) {
  return values.filter(Boolean).join(" ").toLowerCase();
}

function selectRelevantContext<T>(
  values: readonly T[],
  question: string,
  searchText: (value: T) => string,
  updatedAt: (value: T) => string,
  broadTerms: readonly string[],
  limit: number
) {
  const normalizedQuestion = question.toLowerCase();
  const broadQuestion = broadTerms.some((term) =>
    normalizedQuestion.includes(term)
  );
  const tokens = questionTokens(question);
  return values
    .map((value) => {
      const searchable = searchText(value);
      return {
        value,
        score:
          (broadQuestion ? 50 : 0) +
          tokens.filter((token) => searchable.includes(token)).length * 10,
      };
    })
    .filter(({ score }) => score > 0)
    .sort(
      (left, right) =>
        right.score - left.score ||
        updatedAt(right.value).localeCompare(updatedAt(left.value))
    )
    .slice(0, limit)
    .map(({ value }) => value);
}

export function buildHealthAdvisorDocumentEvidence(
  documents: readonly HealthAdvisorDocumentContext[],
  question: string,
  limit = 8
): HealthAdvisorDocumentEvidence[] {
  return selectRelevantContext(
    documents.filter(
      (document) =>
        document.status !== "Archived" && document.status !== "Deleted"
    ),
    question,
    (document) =>
      contextSearchText(
        document.title,
        document.description,
        document.source,
        document.summary
      ),
    (document) => document.updatedAt,
    documentTerms,
    limit
  ).map((document) => ({
    id: document.id,
    title: document.title,
    updatedAt: document.updatedAt,
    source: document.source,
    summary: document.summary,
    provenance: "saved_beast_document",
  }));
}

export function buildHealthAdvisorConversationEvidence(
  conversations: readonly HealthAdvisorConversationContext[],
  question: string,
  limit = 6
): HealthAdvisorConversationEvidence[] {
  return selectRelevantContext(
    conversations.filter((conversation) => !conversation.archived),
    question,
    (conversation) =>
      contextSearchText(conversation.title, conversation.summary),
    (conversation) => conversation.updatedAt,
    conversationTerms,
    limit
  ).map((conversation) => ({
    id: conversation.id,
    title: conversation.title,
    updatedAt: conversation.updatedAt,
    summary: conversation.summary,
    provenance: "saved_health_advisor_conversation",
  }));
}

export function buildHealthAdvisorRecordEvidence(
  records: readonly HealthRecord[],
  question: string
): HealthAdvisorRecordEvidence[] {
  return selectRelevantHealthRecords(records, question).map((record) => ({
    id: record.id,
    kind: record.recordType,
    title: record.title,
    status: record.status,
    occurredOn: record.occurredOn,
    source: record.source || "Member-entered BeastHealth record",
    provenance: "saved_beasthealth_record",
  }));
}

export function isAllowedHealthAuthorityUrl(value: string) {
  try {
    const url = new URL(value);
    if (url.protocol !== "https:") return false;
    const hostname = url.hostname.toLowerCase().replace(/^www\./, "");
    return healthAuthorityDomains.some(
      (domain) => hostname === domain || hostname.endsWith(`.${domain}`)
    );
  } catch {
    return false;
  }
}

function organizationFromUrl(value: string) {
  const hostname = new URL(value).hostname.toLowerCase().replace(/^www\./, "");
  if (hostname.endsWith("fda.gov")) return "U.S. Food and Drug Administration";
  if (
    hostname.endsWith("nih.gov") ||
    hostname.endsWith("ncbi.nlm.nih.gov")
  ) {
    return "National Institutes of Health";
  }
  if (hostname.endsWith("medlineplus.gov")) return "MedlinePlus";
  if (hostname.endsWith("cdc.gov")) {
    return "Centers for Disease Control and Prevention";
  }
  return hostname;
}

export function parseHealthAdvisorOpenAIResponse(
  payload: OpenAIHealthResponsePayload
) {
  const textParts: string[] = [];
  const citations: HealthAdvisorExternalSource[] = [];
  for (const output of payload.output || []) {
    if (output.type !== "message") continue;
    for (const content of output.content || []) {
      if (content.type !== "output_text") continue;
      if (content.text?.trim()) textParts.push(content.text.trim());
      for (const annotation of content.annotations || []) {
        if (
          annotation.type !== "url_citation" ||
          !annotation.url ||
          !isAllowedHealthAuthorityUrl(annotation.url)
        ) {
          continue;
        }
        citations.push({
          title:
            annotation.title?.trim() || organizationFromUrl(annotation.url),
          url: annotation.url,
          organization: organizationFromUrl(annotation.url),
        });
      }
    }
  }
  return {
    text: textParts.join("\n\n") || payload.output_text?.trim() || "",
    sources: Array.from(
      new Map(citations.map((source) => [source.url, source])).values()
    ),
  };
}

function extractSection(text: string, heading: string, nextHeadings: string[]) {
  const escapedHeading = heading.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const escapedNext = nextHeadings
    .map((value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
    .join("|");
  const pattern = new RegExp(
    `(?:^|\\n)#{0,3}\\s*${escapedHeading}\\s*\\n([\\s\\S]*?)${
      escapedNext ? `(?=\\n#{0,3}\\s*(?:${escapedNext})\\s*\\n|$)` : "$"
    }`,
    "i"
  );
  return text.match(pattern)?.[1]?.trim() || "";
}

export function parseHealthAdvisorMedicalSections(text: string) {
  const headings = [
    "General medical information",
    "Possible explanations",
    "Questions for a clinician",
    "Safety limitations",
  ];
  return {
    generalInformation:
      extractSection(text, headings[0], headings.slice(1)) || text.trim(),
    possibleExplanations: extractSection(text, headings[1], headings.slice(2)),
    questionsForClinician: extractSection(text, headings[2], headings.slice(3)),
    safetyLimitations: extractSection(text, headings[3], []),
  };
}

export const healthAdvisorExternalResearchInstructions = [
  "You are the member's Health Advisor inside BeastHealth.",
  "Answer the submitted health question carefully and conversationally using current external medical sources.",
  "You do not receive the member's saved BeastHealth records. Do not imply that you reviewed or know their record.",
  "Use web search for every answer. Prefer FDA, NIH, CDC, MedlinePlus, official medication labeling, recognized professional medical associations, and reputable academic medical centers.",
  "Do not state an externally supported medical claim without a web-search citation. Do not fabricate a citation or source.",
  "Use exactly these four Markdown headings in this order: General medical information; Possible explanations; Questions for a clinician; Safety limitations.",
  "Under General medical information, explain established, source-supported information only.",
  "Under Possible explanations, distinguish possibilities from facts and do not infer a diagnosis. If possibilities would be irresponsible or irrelevant, say so plainly.",
  "Under Questions for a clinician, provide concise questions that help the member prepare for a qualified clinician or pharmacist.",
  "Under Safety limitations, state the relevant limits of the answer and any appropriate follow-up or urgent-care boundary.",
  "Never diagnose, prescribe, determine treatment, or tell the member to start, stop, or change medication.",
  "For medication or interaction questions, explain only source-supported general information and direct personalized medication decisions to a qualified clinician or pharmacist.",
  "Never present general medical information as personalized clinical advice.",
  "Never claim that a lab, vital, symptom, or situation is safe, normal, or harmless for this member.",
  "If the question may describe an urgent or emergency concern, state that you cannot assess urgency remotely and direct the member to appropriate local emergency or qualified clinical care. Do not provide false reassurance.",
  "Use short paragraphs.",
].join("\n");

export const healthAdvisorAnswerLimitations = [
  "Health Advisor provides general health information and record-based context, not diagnosis, treatment, or prescribing.",
  "Saved BeastHealth information may be member-entered and should be verified with original records or a qualified clinician.",
  "External information may not account for the member's complete medical history, examination, or current care plan.",
] as const;
