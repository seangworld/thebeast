import { citationUrlsInAnswer } from "../health/answerSources";
import type { RuntimeResearchRequest } from "./types";

export const guidanceResearchUnavailable = "I could not establish sufficiently clear official-source evidence for this request. I can help compare your options or prepare questions using the information you provide, but any current eligibility, costs, or deadlines remain unverified. If the intended target is unclear, please name the institution, credential or public program and any relevant year. No application or record change was made.";

export function isGuidanceResearchSource(value: string, domains: readonly string[]) {
  try {
    const url = new URL(value);
    return url.protocol === "https:" && !url.username && !url.password && !url.port
      && domains.some(domain => url.hostname === domain || url.hostname.endsWith(`.${domain}`));
  } catch { return false; }
}

// Routing marker only; never used as a provider query. Actual public fields
// are privately extracted and independently reviewed in guidanceDiscovery.
export function guidanceResearchRequest(): RuntimeResearchRequest {
  return { query: "Official education-source discovery", reason: "A private public-brief review precedes all external research.", domains: [] };
}

// Membership check only; claim support still requires contextual semantic review.
export function guidanceCitationsValid(answer: string, sources: readonly { url: string }[]) {
  const cited = citationUrlsInAnswer(answer);
  const allowed = new Set(sources.map(source => new URL(source.url).href));
  return cited.length > 0 && cited.every(url => allowed.has(url));
}
