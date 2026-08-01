import type { Goal, GoalCategory } from "./goals";
import type { BeastDocument, DocumentCategory } from "./documents";
import type { PlatformModule } from "./types";

export type ContextualWorkspaceKey =
  | "education"
  | "health"
  | "money"
  | "home";

export type ContextualWorkspaceConfig = {
  key: ContextualWorkspaceKey;
  module: PlatformModule;
  applicationName: string;
  goalsLabel: string;
  documentsLabel: string;
  defaultGoalCategory: GoalCategory;
  goalCategories: GoalCategory[];
  defaultDocumentCategory: DocumentCategory;
  tags: string[];
};

export const contextualWorkspaceConfigs: Record<
  ContextualWorkspaceKey,
  ContextualWorkspaceConfig
> = {
  education: {
    key: "education",
    module: "learning",
    applicationName: "BeastEducation",
    goalsLabel: "Education Goals",
    documentsLabel: "Education Documents",
    defaultGoalCategory: "Education",
    goalCategories: ["Education", "Career"],
    defaultDocumentCategory: "Learning",
    tags: ["education", "career"],
  },
  health: {
    key: "health",
    module: "health",
    applicationName: "BeastHealth",
    goalsLabel: "Health Goals",
    documentsLabel: "Health Documents",
    defaultGoalCategory: "Health",
    goalCategories: ["Health"],
    defaultDocumentCategory: "Health",
    tags: ["health"],
  },
  money: {
    key: "money",
    module: "money",
    applicationName: "BeastMoney",
    goalsLabel: "Financial Goals",
    documentsLabel: "Financial Documents",
    defaultGoalCategory: "Money",
    goalCategories: ["Money"],
    defaultDocumentCategory: "Money",
    tags: ["money", "financial", "finance"],
  },
  home: {
    key: "home",
    module: "home",
    applicationName: "BeastHome",
    goalsLabel: "Home Goals",
    documentsLabel: "Home Documents",
    defaultGoalCategory: "Home",
    goalCategories: ["Home"],
    defaultDocumentCategory: "Home",
    tags: ["home", "household", "property"],
  },
};

export function getContextualWorkspaceConfig(value?: string) {
  if (!value) return undefined;
  return contextualWorkspaceConfigs[value as ContextualWorkspaceKey];
}

function hasContextTag(tags: string[], context: ContextualWorkspaceConfig) {
  const normalized = new Set(tags.map((tag) => tag.trim().toLowerCase()));
  return context.tags.some((tag) => normalized.has(tag));
}

export function goalMatchesContext(
  goal: Goal,
  context: ContextualWorkspaceConfig
) {
  return (
    goal.sourceModule === context.module ||
    context.goalCategories.includes(goal.category) ||
    hasContextTag(goal.tags || [], context) ||
    goal.contributions.some(
      (contribution) =>
        contribution.status === "Active" &&
        contribution.sourceModule === context.module
    ) ||
    goal.references.some(
      (reference) => reference.sourceModule === context.module
    )
  );
}

export function documentMatchesContext(
  document: BeastDocument,
  context: ContextualWorkspaceConfig
) {
  return (
    document.sourceModule === context.module ||
    hasContextTag(document.tags, context) ||
    document.moduleLinks.some(
      (link) =>
        link.status === "Active" && link.sourceModule === context.module
    )
  );
}
