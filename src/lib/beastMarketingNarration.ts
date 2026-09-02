export type BeastPronunciationEntry = {
  canonical: string;
  display: string;
  spoken: string;
  aliases?: readonly string[];
};

export const BEAST_PRONUNCIATION_MAP: readonly BeastPronunciationEntry[] = [
  { canonical: "SEANGWORLD.COM", display: "SEANGWORLD.COM", spoken: "Sean G World dot com", aliases: ["seangworld.com"] },
  { canonical: "SEANGWORLD", display: "SEANGWORLD", spoken: "Sean G World" },
  { canonical: "BeastEducation", display: "BeastEducation", spoken: "Beast Education" },
  { canonical: "BeastMarketing", display: "BeastMarketing", spoken: "Beast Marketing" },
  { canonical: "BeastFusion", display: "BeastFusion", spoken: "Beast Fusion" },
  { canonical: "BeastHealth", display: "BeastHealth", spoken: "Beast Health" },
  { canonical: "BeastMoney", display: "BeastMoney", spoken: "Beast Money" },
  { canonical: "BeastAdmin", display: "BeastAdmin", spoken: "Beast Admin" },
  { canonical: "BeastAgents", display: "BeastAgents", spoken: "Beast Agents" },
  { canonical: "BeastHome", display: "BeastHome", spoken: "Beast Home" },
  { canonical: "BeastOS", display: "BeastOS", spoken: "Beast O S" },
  { canonical: "TheBeast", display: "TheBeast", spoken: "The Beast" },
  { canonical: "OAuth", display: "OAuth", spoken: "O Auth" },
  { canonical: "CEO", display: "CEO", spoken: "C E O" },
  { canonical: "SEO", display: "SEO", spoken: "S E O" },
  { canonical: "API", display: "API", spoken: "A P I" },
  { canonical: "AI", display: "AI", spoken: "A I" },
] as const;

const escapePattern = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

function replaceKnownTerms(value: string, output: "display" | "spoken") {
  return [...BEAST_PRONUNCIATION_MAP]
    .sort((left, right) => right.canonical.length - left.canonical.length)
    .reduce((result, entry) => {
      const terms = [entry.canonical, entry.display, ...(entry.aliases || [])]
        .filter((term, index, all) => all.findIndex((candidate) => candidate.toLowerCase() === term.toLowerCase()) === index)
        .sort((left, right) => right.length - left.length)
        .map(escapePattern)
        .join("|");
      const pattern = new RegExp(`(^|[^A-Za-z0-9])(?:${terms})(?=$|[^A-Za-z0-9])`, "gi");
      return result.replace(pattern, (_match, prefix: string) => `${prefix}${entry[output]}`);
    }, value);
}

/** Restores known aliases to Product Truth casing without phonetic spelling. */
export function normalizeBeastDisplayNames(value: string) {
  return replaceKnownTerms(value, "display");
}

/** Converts canonical/display terms only at the TTS boundary. */
export function normalizeBeastNarrationForSpeech(value: string) {
  return replaceKnownTerms(normalizeBeastDisplayNames(value), "spoken");
}
