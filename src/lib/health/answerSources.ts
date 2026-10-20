/** Citation membership, not semantic verification of a source's claims. */
export function sourcesCitedInAnswer<T extends { url: string }>(answer: string, sources: readonly T[]): T[] {
  function normalized(value: string): string | null {
    try {
      const url = new URL(value);
      return ["https:", "http:"].includes(url.protocol) && !url.username && !url.password ? url.href : null;
    } catch { return null; }
  }
  const citations = new Set((answer.match(/https?:\/\/[^\s<>"\]`]+/gi) || []).map(value => {
    let url = value.replace(/[.,;:!?]+$/, "");
    // Markdown's closing delimiter is not part of the URL; balanced URL
    // parentheses remain intact. Compare whole URLs, never substrings.
    while (url.endsWith(")") && (url.match(/\)/g) || []).length > (url.match(/\(/g) || []).length) url = url.slice(0, -1);
    return normalized(url);
  }).filter((url): url is string => url !== null));
  const seen = new Set<string>();
  return sources.filter(source => {
    const url = normalized(source.url);
    if (!url || !citations.has(url) || seen.has(url)) return false;
    seen.add(url);
    return true;
  });
}

/** Older saved answers render these three prose sections, not source labels. */
export function withCitedHealthSources<T extends { answer: string; generalInformation: string; possibleExplanations: string; questionsForClinician: string; externalSources: Array<{ url: string }> }>(answer: T): T {
  const visibleText = [answer.generalInformation || answer.answer, answer.possibleExplanations, answer.questionsForClinician].join("\n");
  return { ...answer, externalSources: sourcesCitedInAnswer(visibleText, answer.externalSources || []) };
}
