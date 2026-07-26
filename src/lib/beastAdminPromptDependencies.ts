export const beastAdminPromptRuntimeAdoptionStatuses = [
  "adopted",
  "partial",
  "not_adopted",
  "undocumented",
] as const;

export type BeastAdminPromptRuntimeAdoptionStatus =
  (typeof beastAdminPromptRuntimeAdoptionStatuses)[number];

export const beastAdminPromptRuntimeAdoptionLabels: Record<
  BeastAdminPromptRuntimeAdoptionStatus,
  string
> = {
  adopted: "Adopted",
  partial: "Partially adopted",
  not_adopted: "Not adopted",
  undocumented: "Not documented",
};

export type BeastAdminPromptDependency = {
  promptKey: string;
  runtimeAdoption: BeastAdminPromptRuntimeAdoptionStatus;
  adoptionDetail: string;
  consumingModules: readonly string[];
  consumingProfessionals: readonly string[];
  consumingComponents: readonly string[];
  adoptionTargetPath: readonly string[];
  fallbackBehavior: string;
};

const codeOwnedFallback =
  "The runtime continues using its existing code-owned prompt and behavior until an explicit adoption change is implemented and validated.";

const knownPromptDependencies: readonly BeastAdminPromptDependency[] = [
  {
    promptKey: "money.coach.system",
    runtimeAdoption: "not_adopted",
    adoptionDetail:
      "No BeastMoney runtime currently loads this managed prompt asset.",
    consumingModules: [],
    consumingProfessionals: [],
    consumingComponents: [],
    adoptionTargetPath: [
      "money.coach.system",
      "Money Coach",
      "BeastMoney",
      "Daily Advisor",
      "Conversation",
      "Insights",
    ],
    fallbackBehavior: codeOwnedFallback,
  },
  {
    promptKey: "education.guidance.system",
    runtimeAdoption: "not_adopted",
    adoptionDetail:
      "No BeastEducation runtime currently loads this managed prompt asset.",
    consumingModules: [],
    consumingProfessionals: [],
    consumingComponents: [],
    adoptionTargetPath: [
      "education.guidance.system",
      "Guidance Counselor",
      "BeastEducation",
      "Professional Intake",
      "Conversation",
      "Roadmap",
    ],
    fallbackBehavior: codeOwnedFallback,
  },
  {
    promptKey: "health.advisor.system",
    runtimeAdoption: "not_adopted",
    adoptionDetail:
      "The Health Advisor foundation does not currently load this managed prompt asset.",
    consumingModules: [],
    consumingProfessionals: [],
    consumingComponents: [],
    adoptionTargetPath: [
      "health.advisor.system",
      "Health Advisor",
      "BeastHealth",
      "Professional Intake",
      "Conversation",
      "Health Story",
    ],
    fallbackBehavior:
      "BeastHealth remains on its existing foundation behavior. Releasing this prompt does not activate a Health Advisor runtime.",
  },
  {
    promptKey: "goals.coach.system",
    runtimeAdoption: "not_adopted",
    adoptionDetail:
      "No BeastGoals runtime currently loads this managed prompt asset.",
    consumingModules: [],
    consumingProfessionals: [],
    consumingComponents: [],
    adoptionTargetPath: [
      "goals.coach.system",
      "Goals Coach",
      "BeastGoals",
      "Goal Planning",
      "Progress Review",
    ],
    fallbackBehavior: codeOwnedFallback,
  },
  {
    promptKey: "fusion.shared-context",
    runtimeAdoption: "not_adopted",
    adoptionDetail:
      "BeastFusion does not currently load this managed prompt asset into shared context assembly.",
    consumingModules: [],
    consumingProfessionals: [],
    consumingComponents: [],
    adoptionTargetPath: [
      "fusion.shared-context",
      "BeastFusion",
      "Shared Context",
      "Professional Collaboration",
    ],
    fallbackBehavior:
      "BeastFusion continues using its existing code-owned context and governance contracts.",
  },
] as const;

export function getBeastAdminPromptDependency(
  promptKey: string
): BeastAdminPromptDependency {
  const knownDependency = knownPromptDependencies.find(
    (dependency) => dependency.promptKey === promptKey
  );
  if (knownDependency) return knownDependency;

  return {
    promptKey,
    runtimeAdoption: "undocumented",
    adoptionDetail:
      "No reviewed runtime dependency record exists for this prompt key.",
    consumingModules: [],
    consumingProfessionals: [],
    consumingComponents: [],
    adoptionTargetPath: [],
    fallbackBehavior:
      "Releasing this managed prompt does not change runtime behavior until a consuming runtime explicitly adopts it.",
  };
}

export function hasBeastAdminPromptRuntimeConsumers(
  dependency: BeastAdminPromptDependency
) {
  return (
    dependency.consumingModules.length > 0 ||
    dependency.consumingProfessionals.length > 0 ||
    dependency.consumingComponents.length > 0
  );
}
