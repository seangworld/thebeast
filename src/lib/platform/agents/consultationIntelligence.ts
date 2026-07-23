export type ConsultationFactKind =
  | "explicit-fact"
  | "implicit-fact"
  | "timeline"
  | "sequence"
  | "intent"
  | "constraint"
  | "goal"
  | "existing-decision";

export type ConsultationReferenceKind =
  | "beast-data"
  | "prior-conversation"
  | "uploaded-document"
  | "module-state";

export type ConsultationEvidenceSource =
  | "current-message"
  | "conversation-context"
  | "member-understanding"
  | "professional-journal"
  | "module-data";

export type ConsultationFact = {
  id: string;
  kind: ConsultationFactKind;
  statement: string;
  source: ConsultationEvidenceSource;
  confidence: number;
};

export type ConsultationReference = {
  id: string;
  kind: ConsultationReferenceKind;
  label: string;
  source: ConsultationEvidenceSource;
};

export type ConsultationKnownItem = {
  id: string;
  label: string;
  value: string;
  source: Exclude<ConsultationEvidenceSource, "current-message">;
  aliases?: readonly string[];
};

export type ConsultationContext = {
  conversationContext?: readonly ConsultationKnownItem[];
  memberUnderstanding?: readonly ConsultationKnownItem[];
  professionalJournal?: readonly ConsultationKnownItem[];
  moduleData?: readonly ConsultationKnownItem[];
};

export type ConsultationStory = {
  message: string;
  facts: readonly ConsultationFact[];
  explicitFacts: readonly ConsultationFact[];
  implicitFacts: readonly ConsultationFact[];
  timeline: readonly ConsultationFact[];
  sequence: readonly ConsultationFact[];
  intents: readonly ConsultationFact[];
  constraints: readonly ConsultationFact[];
  goals: readonly ConsultationFact[];
  existingDecisions: readonly ConsultationFact[];
  references: readonly ConsultationReference[];
  knownContext: readonly ConsultationKnownItem[];
};

export type ConsultationQuestionDecision = {
  shouldAsk: boolean;
  question?: string;
  reason: string;
  rejectedReasons: readonly string[];
  continueWith: string;
};

const STOP_WORDS = new Set([
  "a", "an", "and", "are", "can", "could", "do", "does", "for", "from", "i", "in", "is",
  "it", "me", "my", "of", "on", "or", "the", "that", "this", "to", "what", "when", "which",
  "who", "why", "with", "would", "you", "your",
]);

function normalize(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9\s'-]/g, " ").replace(/\s+/g, " ").trim();
}

function terms(value: string) {
  return normalize(value).split(" ").filter((term) => term.length > 2 && !STOP_WORDS.has(term));
}

function sentences(value: string) {
  return value
    .split(/(?<=[.!?])\s+|\n+/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function unique<T>(items: readonly T[], key: (item: T) => string) {
  const seen = new Set<string>();
  return items.filter((item) => {
    const value = key(item);
    if (seen.has(value)) return false;
    seen.add(value);
    return true;
  });
}

function fact(kind: ConsultationFactKind, statement: string, index: number, confidence = 0.95): ConsultationFact {
  return { id: `${kind}:${index}:${normalize(statement).slice(0, 40)}`, kind, statement, source: "current-message", confidence };
}

function matchesAny(value: string, patterns: readonly RegExp[]) {
  return patterns.some((pattern) => pattern.test(value));
}

function suppliedByContext(question: string, items: readonly ConsultationKnownItem[]) {
  const questionTerms = terms(question);
  return items.some((item) => {
    const labels = [item.label, ...(item.aliases || [])];
    const labelMatch = labels.some((label) => {
      const labelTerms = terms(label);
      return labelTerms.length > 0 && labelTerms.every((term) => questionTerms.includes(term));
    });
    return labelMatch && item.value.trim().length > 0;
  });
}

export class SharedConsultationIntelligence {
  understand(message: string, context: ConsultationContext = {}): ConsultationStory {
    const messageSentences = sentences(message);
    const normalized = normalize(message);
    const knownContext = [
      ...(context.conversationContext || []),
      ...(context.memberUnderstanding || []),
      ...(context.professionalJournal || []),
      ...(context.moduleData || []),
    ];
    const explicitFacts = messageSentences
      .filter((item) => matchesAny(normalize(item), [
        /\b(i|we|my|our)\b.*\b(am|are|have|has|had|use|using|pay|paid|store|stored|take|taking|listed|enrolled|scheduled)\b/,
        /\b\d+(?:[.,]\d+)?\b/,
        /\b(because|since|currently|already)\b/,
      ]) || (!item.includes("?") && item.split(/\s+/).length >= 4))
      .map((item, index) => fact("explicit-fact", item, index));
    const implicitFacts: ConsultationFact[] = [];
    if (/\bbetween\b.+\b(due dates?|payments?|paychecks?|appointments?|sessions?)\b/.test(normalized)) {
      implicitFacts.push(fact("implicit-fact", "The member described a recurring workflow between scheduled events.", 0, 0.82));
    }
    if (/\b(continue|keep|stay with|still|again|resume)\b/.test(normalized)) {
      implicitFacts.push(fact("implicit-fact", "The member is referring to work or a decision that already exists.", 1, 0.86));
    }
    if (/\b(instead of|rather than|differs? from|not the usual|not standard)\b/.test(normalized)) {
      implicitFacts.push(fact("implicit-fact", "The member is distinguishing the described approach from an alternative.", 2, 0.8));
    }
    const timeline = messageSentences
      .filter((item) => matchesAny(normalize(item), [/\b(today|tomorrow|yesterday|last|next|since|until|before|after|between|weekly|monthly|annually)\b/, /\b\d{1,2}[/-]\d{1,2}(?:[/-]\d{2,4})?\b/]))
      .map((item, index) => fact("timeline", item, index));
    const sequence = messageSentences
      .filter((item) => matchesAny(normalize(item), [/\b(first|then|next|after|before|between|finally|once)\b/]))
      .map((item, index) => fact("sequence", item, index));
    const intents = messageSentences
      .filter((item) => item.includes("?") || matchesAny(normalize(item), [/\b(help|explain|review|compare|evaluate|calculate|show|open|tell me|should i|can i)\b/]))
      .map((item, index) => fact("intent", item, index));
    const constraints = messageSentences
      .filter((item) => matchesAny(normalize(item), [/\b(can't|cannot|must|need to|only|without|limited|avoid|keep|preserve|protect|no more than|at least|not willing)\b/]))
      .map((item, index) => fact("constraint", item, index));
    const goals = messageSentences
      .filter((item) => matchesAny(normalize(item), [/\b(i|we)\b.*\b(want|hope|aim|plan|trying|goal|need)\b/]))
      .map((item, index) => fact("goal", item, index));
    const existingDecisions = messageSentences
      .filter((item) => matchesAny(normalize(item), [/\b(i|we)\b.*\b(decided|chose|selected|committed|will use|am using|are using|stay with|continue)\b/]))
      .map((item, index) => fact("existing-decision", item, index));
    const references: ConsultationReference[] = [];
    const addReference = (kind: ConsultationReferenceKind, label: string, source: ConsultationEvidenceSource = "current-message") => {
      references.push({ id: `${kind}:${normalize(label)}`, kind, label, source });
    };
    if (/\b(beastmoney|beasthealth|beasteducation|beast|my (bills?|debts?|forecast|retirement|cash flow|plan|records?))\b/.test(normalized)) addReference("beast-data", "Referenced Beast data");
    if (/\b(earlier|previous|prior|last time|we discussed|you said|our conversation)\b/.test(normalized)) addReference("prior-conversation", "Referenced prior conversation");
    if (/\b(uploaded|attached|document|file|statement|report|lab result)\b/.test(normalized)) addReference("uploaded-document", "Referenced uploaded document");
    if (/\b(dashboard|workspace|module|bills page|debt page|velocity|heloc|retirement|health|learning)\b/.test(normalized)) addReference("module-state", "Referenced module state");
    return {
      message,
      facts: [...explicitFacts, ...implicitFacts, ...timeline, ...sequence, ...intents, ...constraints, ...goals, ...existingDecisions],
      explicitFacts,
      implicitFacts,
      timeline,
      sequence,
      intents,
      constraints,
      goals,
      existingDecisions,
      references: unique(references, (item) => item.id),
      knownContext,
    };
  }

  assessQuestion(story: ConsultationStory, proposedQuestion: string, reason = "The answer is required to avoid an incorrect conclusion."): ConsultationQuestionDecision {
    const question = proposedQuestion.trim();
    if (!question) return { shouldAsk: false, reason: "No clarification question was proposed.", rejectedReasons: ["no-question"], continueWith: "Continue with the information already available and state any remaining uncertainty." };
    const rejectedReasons: string[] = [];
    const questionTerms = terms(question);
    const messageTerms = terms(story.message);
    const substantiveTerms = questionTerms.filter((term) => !["provide", "decide", "understanding", "help"].includes(term));
    const repeatedByMessage = substantiveTerms.length > 0
      && substantiveTerms.every((term) => messageTerms.includes(term))
      && story.explicitFacts.length > 0;
    if (repeatedByMessage) rejectedReasons.push("repeats-current-message");
    const normalizedQuestion = normalize(question);
    const normalizedMessage = normalize(story.message);
    if (
      (/\bwhat account\b.*\b(pay|paying|bills)\b/.test(normalizedQuestion) && /\b(pay|paying)\b.*\bbills?\b.*\bfrom\b/.test(normalizedMessage))
      || (/\bwhich medication\b/.test(normalizedQuestion) && /\b(take|taking|medication|medications)\b/.test(normalizedMessage))
      || (/\bwhat certification\b|\bwhich certification\b/.test(normalizedQuestion) && /\b(certification|certificate)\b/.test(normalizedMessage))
    ) {
      rejectedReasons.push("repeats-current-message");
    }
    if (suppliedByContext(question, story.knownContext)) rejectedReasons.push("answer-already-in-known-context");
    if (/\b(exact|precisely|specific penny|specific minute)\b/.test(normalize(question)) && !/\bcalculate|deadline|dose|dosage\b/.test(normalize(story.message))) {
      rejectedReasons.push("unnecessary-precision");
    }
    const vagueQuestion = substantiveTerms.length === 0 || /^(what|which) (one|thing|account|medication|certification)\b/.test(normalize(question));
    if (vagueQuestion && (story.explicitFacts.length > 0 || story.references.length > 0)) rejectedReasons.push("interrupts-natural-flow");
    if (rejectedReasons.length) {
      return {
        shouldAsk: false,
        reason: "The proposed question would not materially improve correctness because the available story or context already supplies the needed information.",
        rejectedReasons,
        continueWith: "Answer from the understood story, distinguish assumptions from facts, and note only material uncertainty.",
      };
    }
    return {
      shouldAsk: true,
      question: question.endsWith("?") ? question : `${question}?`,
      reason,
      rejectedReasons: [],
      continueWith: "After the member answers, continue from the existing analysis without restarting the consultation.",
    };
  }
}
