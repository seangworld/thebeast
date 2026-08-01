import { createHash } from "node:crypto";

export const educationDocumentExtractionVersion = "be-201-v1";

type Proposal = {
  phase: "past" | "present" | "goal";
  category: string;
  label: string;
  value: string;
  occurredOn: string | null;
  sourceExcerpt: string;
  confidence: number;
};

const patterns: Array<{
  phase: Proposal["phase"];
  category: string;
  pattern: RegExp;
}> = [
  { phase: "past", category: "school", pattern: /^(?:school|institution|university|college)\s*[:\-]\s*(.+)$/i },
  { phase: "past", category: "degree", pattern: /^(?:degree|diploma|major|field of study)\s*[:\-]\s*(.+)$/i },
  { phase: "past", category: "certification", pattern: /^(?:certification|certificate|credential)\s*[:\-]\s*(.+)$/i },
  { phase: "past", category: "license", pattern: /^(?:license|licensure)\s*[:\-]\s*(.+)$/i },
  { phase: "past", category: "training", pattern: /^(?:training|coursework|course)\s*[:\-]\s*(.+)$/i },
  { phase: "past", category: "military", pattern: /^(?:military|mos|afsc|rating|military occupation)\s*[:\-]\s*(.+)$/i },
  { phase: "past", category: "employment", pattern: /^(?:employer|employment|company|organization)\s*[:\-]\s*(.+)$/i },
  { phase: "present", category: "role", pattern: /^(?:role|position|title|occupation)\s*[:\-]\s*(.+)$/i },
  { phase: "present", category: "skill", pattern: /^(?:skill|skills|competenc(?:y|ies))\s*[:\-]\s*(.+)$/i },
  { phase: "past", category: "leadership", pattern: /^(?:leadership|supervision|management)\s*[:\-]\s*(.+)$/i },
  { phase: "past", category: "project", pattern: /^(?:project|achievement|accomplishment)\s*[:\-]\s*(.+)$/i },
  { phase: "goal", category: "career_goal", pattern: /^(?:career goal|target role|objective)\s*[:\-]\s*(.+)$/i },
  { phase: "goal", category: "education_goal", pattern: /^(?:education goal|target degree|target credential)\s*[:\-]\s*(.+)$/i },
  { phase: "goal", category: "timeline", pattern: /^(?:deadline|target date|timeline)\s*[:\-]\s*(.+)$/i },
];

function isoDate(value: string) {
  const match = value.match(/\b(?:19|20)\d{2}-\d{2}-\d{2}\b/)?.[0];
  return match && !Number.isNaN(Date.parse(`${match}T00:00:00Z`)) ? match : null;
}

export function extractEducationDocumentProposals(text: string) {
  const seen = new Set<string>();
  const items: Proposal[] = [];
  for (const rawLine of text.replace(/\r/g, "").slice(0, 250_000).split("\n")) {
    const line = rawLine.replace(/^\s*[•*\-]\s*/, "").trim();
    if (!line || line.length > 4_000) continue;
    for (const candidate of patterns) {
      const match = line.match(candidate.pattern);
      const value = match?.[1]?.trim();
      if (!value) continue;
      const key = `${candidate.category}:${value.toLocaleLowerCase()}`;
      if (seen.has(key)) break;
      seen.add(key);
      items.push({
        phase: candidate.phase,
        category: candidate.category,
        label: line.slice(0, line.indexOf(value)).replace(/[:\-\s]+$/, "").slice(0, 200),
        value: value.slice(0, 4_000),
        occurredOn: isoDate(line),
        sourceExcerpt: line.slice(0, 1_000),
        confidence: 1,
      });
      break;
    }
  }
  return {
    summary: items.length
      ? `${items.length} explicitly labeled education or career item${items.length === 1 ? "" : "s"} found for member review.`
      : "No explicitly labeled education or career items were found. No profile records were created.",
    items,
  };
}

export function fingerprintEducationDocument(content: Uint8Array) {
  return createHash("sha256").update(content).digest("hex");
}
