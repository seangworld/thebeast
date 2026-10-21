import type { RuntimeResearchRequest } from "./types";

// Public queries are constructed from reviewed constants, never copied from
// member text, records, history, or model-generated query strings. Topic
// selection discloses an education interest, not the learner's personal facts.
const topics = [
  { match: /\b(?:fafsa|pell|federal student aid)\b/i, query: "FAFSA federal student aid eligibility application deadlines Pell grants official guidance", domains: ["studentaid.gov"] },
  { match: /\b(?:gi bill|vr&e|veteran readiness|veterans? education)\b/i, query: "VA education benefits GI Bill Veteran Readiness and Employment eligibility application official guidance", domains: ["va.gov"] },
  { match: /\b(?:opm|usajobs|federal employment|federal qualifications|federal series)\b/i, query: "Federal employment qualification standards education specialized experience official job announcement requirements", domains: ["opm.gov", "usajobs.gov"] },
  { match: /\baccreditation\b/i, query: "Recognized accreditation institutions programs official verification directory", domains: ["ed.gov"] },
  { match: /\bapprenticeships?\b/i, query: "Registered apprenticeship entry requirements training official guidance", domains: ["apprenticeship.gov", "dol.gov"] },
  { match: /\b(?:career outlook|occupational outlook|job outlook)\b/i, query: "Occupational Outlook Handbook education training entry requirements career comparison", domains: ["bls.gov"] },
] as const;

export const guidanceResearchUnavailable = "I cannot verify that specific school, credential, or requirement through the currently supported research sources. I can help compare your options or prepare questions using the information you provide, but any current eligibility, costs, or deadlines remain unverified. No application or record change was made.";

export function isGuidanceResearchSource(value: string, domains: readonly string[]) {
  try {
    const url = new URL(value);
    return url.protocol === "https:" && !url.username && !url.password && !url.port
      && domains.some(domain => url.hostname === domain || url.hostname.endsWith(`.${domain}`));
  } catch { return false; }
}

export function guidanceResearchRequest(message: string): RuntimeResearchRequest | null {
  const selected = topics.filter(topic => topic.match.test(message));
  if (!selected.length) return null;
  return {
    query: selected.map(topic => topic.query).join(". "),
    reason: "Public topic evidence only. Specific institutions, credentials, individual eligibility and exact deadlines require direct verification; do not infer them from this general evidence.",
    domains: Array.from(new Set(selected.flatMap(topic => [...topic.domains]))),
  };
}
