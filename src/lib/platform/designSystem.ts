export const beastDesignSystemVersion = "1.0" as const;

export const beastDesignTokenGroups = [
  "color",
  "typography",
  "spacing",
  "radius",
  "shadow",
  "motion",
] as const;

export const beastComponentFamilies = [
  "navigation",
  "page-header",
  "card",
  "button",
  "form",
  "table",
  "dialog",
  "drawer",
  "badge",
  "search",
  "empty-state",
  "loading-state",
  "error-state",
  "professional-conversation",
] as const;

export const beastModuleAccentContract = {
  beastos: "blue",
  director: "blue",
  money: "green",
  learning: "blue-indigo",
  health: "red",
  home: "orange",
  goals: "yellow",
  documents: "slate",
  admin: "amber",
} as const;

export const beastPlainLanguageQuestions = [
  "What is this?",
  "Why am I filling this out?",
  "How will Beast use this?",
  "What happens next?",
] as const;

export type BeastDesignSystemAuditInput = {
  usesSemanticTokens: boolean;
  usesSharedComponents: boolean;
  moduleAccentIsSubtle: boolean;
  responsive: boolean;
  accessible: boolean;
  plainLanguage: boolean;
};

export function auditBeastDesignSystem(input: BeastDesignSystemAuditInput) {
  const checks = Object.entries(input).map(([name, passed]) => ({
    name,
    passed,
  }));

  return {
    compliant: checks.every((check) => check.passed),
    failed: checks.filter((check) => !check.passed).map((check) => check.name),
  };
}
