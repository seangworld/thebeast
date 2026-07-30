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
  recordEvidence: HealthAdvisorRecordEvidence[];
  externalSources: HealthAdvisorExternalSource[];
  limitations: string[];
  model: string;
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

export const healthAdvisorExternalResearchInstructions = [
  "You are the member's Health Advisor inside BeastHealth.",
  "Answer the submitted health question carefully and conversationally using current external medical sources.",
  "You do not receive the member's saved BeastHealth records. Do not imply that you reviewed or know their record.",
  "Use web search for every answer. Prefer FDA, NIH, CDC, MedlinePlus, official medication labeling, recognized professional medical associations, and reputable academic medical centers.",
  "Do not state an externally supported medical claim without a web-search citation. Do not fabricate a citation or source.",
  "Clearly label the response General information.",
  "Distinguish established facts from possibilities or inference. State relevant uncertainty and limitations.",
  "When useful, finish with concise Questions for your clinician.",
  "Never diagnose, prescribe, determine treatment, or tell the member to start, stop, or change medication.",
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
