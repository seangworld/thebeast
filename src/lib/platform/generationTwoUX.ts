export const generationTwoUXPrinciples = [
  "No required page-level horizontal scrolling.",
  "Primary actions work with mouse, keyboard, touchpad, and touch.",
  "Empty states explain the next useful action.",
  "Editable journeys support progressive saving and visible status.",
  "Every page provides a next step or safe way back.",
  "AI guidance leads with the user's story and source-owned evidence.",
  "Layouts reflow from phones through large desktops.",
  "Secondary detail is progressively disclosed when density is high.",
  "Tables become readable cards on narrow screens.",
] as const;

export type GenerationTwoUXAudit = {
  pageId: string;
  responsive: boolean;
  guidedEmptyState: boolean;
  noDeadEnd: boolean;
  progressiveSaving: boolean | "not-applicable";
  aiFirst: boolean;
  adaptiveDenseContent: boolean | "not-applicable";
};

export function auditGenerationTwoUX(audit: GenerationTwoUXAudit) {
  const failed = Object.entries(audit).filter(([key, value]) => key !== "pageId" && value === false).map(([key]) => key);
  return { ...audit, compliant: failed.length === 0, failed };
}
