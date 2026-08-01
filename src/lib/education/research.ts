import type { ResearchSource } from "./careerIntelligence";

export type OpenAIEducationResearchPayload = {
  output_text?: string;
  output?: Array<{
    type?: string;
    content?: Array<{
      type?: string;
      text?: string;
      annotations?: Array<{
        type?: string;
        url?: string;
        title?: string;
      }>;
    }>;
  }>;
};

const primaryHosts = [
  ".gov",
  ".mil",
  ".edu",
  "bls.gov",
  "opm.gov",
  "ed.gov",
  "studentaid.gov",
  "va.gov",
  "dol.gov",
  "apprenticeship.gov",
];

function safeHost(url: string) {
  try {
    return new URL(url).hostname.toLowerCase();
  } catch {
    return "";
  }
}

export function isPrimaryEducationSource(url: string) {
  const host = safeHost(url);
  return primaryHosts.some(
    (candidate) => host === candidate || host.endsWith(candidate)
  );
}

export function parseEducationResearchResponse(
  payload: OpenAIEducationResearchPayload,
  retrievedAt = new Date().toISOString()
) {
  const textParts: string[] = [];
  const sources: ResearchSource[] = [];
  for (const output of payload.output || []) {
    if (output.type !== "message") continue;
    for (const content of output.content || []) {
      if (content.type !== "output_text") continue;
      if (content.text?.trim()) textParts.push(content.text.trim());
      for (const annotation of content.annotations || []) {
        if (annotation.type !== "url_citation" || !annotation.url) continue;
        const publisher = safeHost(annotation.url);
        if (!publisher || !["http:", "https:"].includes(new URL(annotation.url).protocol)) {
          continue;
        }
        sources.push({
          title: annotation.title?.trim() || publisher,
          url: annotation.url,
          publisher,
          retrievedAt,
          limitations:
            "Confirm the current effective date, jurisdiction, eligibility, and applicability on the linked source before acting.",
          primary: isPrimaryEducationSource(annotation.url),
        });
      }
    }
  }
  return {
    answer: textParts.join("\n\n") || payload.output_text?.trim() || "",
    sources: Array.from(new Map(sources.map((source) => [source.url, source])).values()),
  };
}

export const educationResearchInstructions = [
  "You are the Guidance Counselor in BeastEducation, providing informational education and career planning support.",
  "You receive only the member's submitted research question. You do not receive or know their private profile, identity, employment, military, salary, goals, documents, or conversations.",
  "Use web search for every answer and cite every time-sensitive factual claim.",
  "Prefer current primary sources: official employers and job announcements, OPM and other government agencies, licensing and certification bodies, official school catalogs and financial-aid pages, recognized accreditors, and official labor-market data.",
  "State the source publication or effective date, retrieval context, jurisdiction, and important limitations when available.",
  "Clearly separate required, preferred, helpful, unknown, and already-possessed qualifications. Do not generalize one employer or jurisdiction's rule to all situations.",
  "Never guarantee admission, employment, promotion, salary, eligibility, aid, licensure, or certification.",
  "Explain which details must be confirmed with the employer, school, certification body, licensing authority, HR office, or government agency.",
  "If current authoritative evidence is insufficient, say so instead of inventing a requirement or recommendation.",
  "Use concise headings and practical next steps.",
].join("\n");
