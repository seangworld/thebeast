export type CommonConversationIntent =
  | "greeting"
  | "testing"
  | "thanks"
  | "acknowledgement"
  | "incomplete"
  | "non-domain"
  | "domain"
  | "unknown";

export type ConversationIntent<TDomainIntent extends string = string> = {
  kind: CommonConversationIntent;
  domainIntent?: TDomainIntent;
  confidence: number;
  complete: boolean;
  normalizedInput: string;
  signals: readonly string[];
};

export type DomainIntentCandidate<TDomainIntent extends string> = {
  intent: TDomainIntent;
  confidence: number;
  signals?: readonly string[];
};

export type ConversationIntentOptions<TDomainIntent extends string> = {
  recognizeDomainIntent?: (input: { raw: string; normalized: string; tokens: readonly string[] }) => DomainIntentCandidate<TDomainIntent> | undefined;
  domainVocabulary?: readonly string[];
};

const greetingPhrases = new Set(["hi", "hello", "hey", "good morning", "good afternoon", "good evening"]);
const thanksPhrases = new Set(["thanks", "thank you", "thank you very much", "appreciate it", "i appreciate it", "that helps"]);
const acknowledgementPhrases = new Set(["ok", "okay", "got it", "understood", "sounds good", "makes sense", "great"]);

function normalizeInput(input: string) {
  return input.toLowerCase().replace(/[’']/g, "'").replace(/[^a-z0-9$%?'\s-]/g, " ").replace(/\s+/g, " ").trim();
}

function phraseMatch(value: string, phrases: ReadonlySet<string>) {
  const withoutPunctuation = value.replace(/[?!.'-]+$/g, "").trim();
  return phrases.has(withoutPunctuation);
}

function looksIncomplete(value: string, tokens: readonly string[]) {
  if (!value || tokens.length === 0) return true;
  if (/^(what|why|how|when|where|who|which|can|could|should|would|is|are|do|does|tell me|explain)$/.test(value)) return true;
  if (/\b(and|or|about|because|if|when|with|for|to)$/.test(value)) return true;
  return tokens.length < 3 && value.endsWith("?") && !phraseMatch(value, greetingPhrases);
}

export function recognizeConversationIntent<TDomainIntent extends string = string>(
  input: string,
  options: ConversationIntentOptions<TDomainIntent> = {}
): ConversationIntent<TDomainIntent> {
  const normalizedInput = normalizeInput(input);
  const tokens = normalizedInput.match(/[a-z0-9$%'-]+/g) || [];
  if (looksIncomplete(normalizedInput, tokens)) return { kind: "incomplete", confidence: 0.95, complete: false, normalizedInput, signals: ["unfinished-question"] };
  if (phraseMatch(normalizedInput, greetingPhrases)) return { kind: "greeting", confidence: 0.99, complete: true, normalizedInput, signals: ["social-greeting"] };
  if (/^(test|testing|test message|is this (thing )?(on|working)|does this work)([?!.' ]*)$/.test(normalizedInput)) return { kind: "testing", confidence: 0.99, complete: true, normalizedInput, signals: ["test-message"] };
  if (phraseMatch(normalizedInput, thanksPhrases)) return { kind: "thanks", confidence: 0.99, complete: true, normalizedInput, signals: ["gratitude"] };
  if (phraseMatch(normalizedInput, acknowledgementPhrases)) return { kind: "acknowledgement", confidence: 0.98, complete: true, normalizedInput, signals: ["acknowledgement"] };
  const domain = options.recognizeDomainIntent?.({ raw: input, normalized: normalizedInput, tokens });
  if (domain) return { kind: "domain", domainIntent: domain.intent, confidence: Math.max(0, Math.min(1, domain.confidence)), complete: true, normalizedInput, signals: domain.signals || [] };
  const vocabulary = new Set(options.domainVocabulary?.map(normalizeInput));
  const domainTerms = tokens.filter((token) => vocabulary.has(token));
  if (domainTerms.length) return { kind: "domain", confidence: 0.55, complete: true, normalizedInput, signals: domainTerms.map((term) => `domain-term:${term}`) };
  return { kind: "non-domain", confidence: 0.75, complete: true, normalizedInput, signals: ["no-domain-signal"] };
}

export type ConversationTable = { columns: readonly string[]; rows: readonly (readonly string[])[] };
export type ConversationResponseSection = {
  heading: string;
  paragraphs?: readonly string[];
  bullets?: readonly string[];
  numberedItems?: readonly string[];
  table?: ConversationTable;
  classification?: "fact" | "observation" | "recommendation" | "uncertainty" | "explanation" | "summary" | "next-step";
};

export type ConversationAction = {
  id: string;
  label: string;
  type: "navigate" | "prompt" | "clarify" | "show-evidence";
  target?: string;
  prompt?: string;
};

export type ConversationResponse<TIntent extends string = string> = {
  intent: TIntent;
  shortAnswer: string;
  sections: readonly ConversationResponseSection[];
  assumptions?: readonly string[];
  nextStep?: string;
  actions: readonly ConversationAction[];
  text: string;
};

export type ConversationResponseInput<TIntent extends string> = Omit<ConversationResponse<TIntent>, "text" | "actions"> & {
  actions?: readonly ConversationAction[];
  sourceText?: readonly string[];
};

function canonicalText(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

export function removeVerbatimSourceRepetitions(values: readonly string[], sourceText: readonly string[] = []) {
  const sources = new Set(sourceText.map(canonicalText).filter(Boolean));
  return values.filter((value, index) => canonicalText(value) && !sources.has(canonicalText(value)) && values.findIndex((candidate) => canonicalText(candidate) === canonicalText(value)) === index);
}

export function createConversationResponse<TIntent extends string>(input: ConversationResponseInput<TIntent>): ConversationResponse<TIntent> {
  const sections = input.sections.map((section) => ({
    ...section,
    paragraphs: removeVerbatimSourceRepetitions(section.paragraphs || [], input.sourceText),
    bullets: removeVerbatimSourceRepetitions(section.bullets || [], input.sourceText),
    numberedItems: removeVerbatimSourceRepetitions(section.numberedItems || [], input.sourceText),
  }));
  const body = sections.flatMap((section) => [
    `${section.heading}:`,
    ...(section.paragraphs || []),
    ...(section.bullets || []).map((item) => `• ${item}`),
    ...(section.numberedItems || []).map((item, index) => `${index + 1}. ${item}`),
    ...(section.table?.rows || []).map((row) => row.join(" | ")),
  ]);
  const text = [input.shortAnswer, ...body, input.assumptions?.length ? `Assumptions and uncertainty: ${input.assumptions.join(" ")}` : "", input.nextStep || ""].filter(Boolean).join("\n\n");
  return { ...input, sections, actions: input.actions || [], text };
}

export function formatConversationCurrency(value: number, currency = "USD", locale = "en-US") {
  return new Intl.NumberFormat(locale, { style: "currency", currency }).format(value);
}

export function formatConversationDate(value: Date | string | number, locale = "en-US") {
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? "Unknown date" : new Intl.DateTimeFormat(locale, { year: "numeric", month: "short", day: "numeric" }).format(date);
}

export type ConversationMove = "answer" | "clarify" | "navigate" | "present-evidence";

export type ConversationResponseFormat = "short-answer" | "paragraphs" | "bullets" | "numbered-list" | "table";

export function chooseConversationResponseFormat(values: { itemCount?: number; ordered?: boolean; table?: ConversationTable; explanationCount?: number }): ConversationResponseFormat {
  if (values.table?.columns.length && values.table.rows.length) return "table";
  if ((values.itemCount || 0) > 1) return values.ordered ? "numbered-list" : "bullets";
  if ((values.explanationCount || 0) > 0) return "paragraphs";
  return "short-answer";
}

export function chooseConversationMove(values: { intent: Pick<ConversationIntent, "complete" | "kind">; hasAnswer: boolean; hasEvidence?: boolean; workspaceTarget?: string }): ConversationMove {
  if (!values.intent.complete || values.intent.kind === "incomplete") return "clarify";
  if (values.hasAnswer) return values.hasEvidence ? "present-evidence" : "answer";
  return values.workspaceTarget ? "navigate" : "clarify";
}
