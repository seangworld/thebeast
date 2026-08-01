import {
  healthWorkspaceDefinitions,
  healthWorkspaceHrefs,
} from "@/lib/health/foundation";

export const beastHealthOverview = {
  title: "BeastHealth",
  description:
    "Build your health story, keep important records together, and prepare for appointments.",
  focus: [
    "Save health information with dates and sources.",
    "Prepare useful questions for doctors and specialists.",
    "Stay in control of what Beast saves and uses.",
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
