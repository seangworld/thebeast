export type MissingInformationInput =
  | { kind: "short_text"; placeholder: string }
  | { kind: "choice"; options: readonly string[] }
  | { kind: "conversation"; placeholder: string };

export type MissingInformationRequirement = {
  requirementId: string;
  question: string;
  why: string;
  input: MissingInformationInput;
};

export function defineMissingInformationRequirement(
  requirement: MissingInformationRequirement
) {
  return requirement;
}

export function missingInformationWasSatisfied({
  requirementId,
  remainingRequirementIds,
}: {
  requirementId: string;
  remainingRequirementIds: readonly string[];
}) {
  return !remainingRequirementIds.includes(requirementId);
}
