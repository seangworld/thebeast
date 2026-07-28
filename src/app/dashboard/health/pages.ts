import {
  healthWorkspaceDefinitions,
  healthWorkspaceHrefs,
} from "@/lib/health/foundation";

export const beastHealthOverview = {
  title: "BeastHealth",
  description:
    "Owner-only health record beta with Health Advisor intentionally inactive.",
  focus: [
    "Organize private health records with dates and sources.",
    "Keep Health Advisor, recommendations, and execution disabled.",
    "Preserve owner control, RLS, and explicit medical-safety boundaries.",
  ],
};

export const beastHealthPages = Object.fromEntries(
  Object.entries(healthWorkspaceDefinitions).map(([key, definition]) => [
    key,
    {
      title: definition.title,
      description: definition.description,
      href: healthWorkspaceHrefs[definition.kind],
    },
  ])
);
