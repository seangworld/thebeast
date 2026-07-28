import {
  healthWorkspaceDefinitions,
  healthWorkspaceHrefs,
} from "@/lib/health/foundation";

export const beastHealthOverview = {
  title: "BeastHealth",
  description:
    "Owner-only health record and appointment-preparation workspace with active Health Advisor.",
  focus: [
    "Organize private health records with dates and sources.",
    "Use Health Advisor for record review and provider-question preparation.",
    "Preserve owner control, RLS, confidence limits, and explicit medical-safety boundaries.",
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
