import type { DependencyGraphResult, LearningKnowledgeModel } from "./types";

export function buildDependencyGraphState({
  model,
  completedConceptIds,
}: {
  model: LearningKnowledgeModel;
  completedConceptIds: string[];
}): DependencyGraphResult {
  const completed = new Set(completedConceptIds);
  const blockedConcepts = model.concepts
    .filter((concept) => !concept.prerequisiteIds.every((id) => completed.has(id)))
    .map((concept) => concept.id);
  const unlockedConcepts = model.concepts
    .filter(
      (concept) =>
        !completed.has(concept.id) &&
        concept.prerequisiteIds.every((id) => completed.has(id))
    )
    .map((concept) => concept.id);

  return {
    blockedConcepts,
    unlockedConcepts,
    suggestedSequence: [
      ...unlockedConcepts,
      ...blockedConcepts.filter((id) => !unlockedConcepts.includes(id)),
    ],
    visualizationNodes: model.concepts.map((concept) => ({
      id: concept.id,
      label: concept.name,
      status: completed.has(concept.id)
        ? "completed"
        : blockedConcepts.includes(concept.id)
          ? "blocked"
          : "available",
    })),
    visualizationEdges: model.dependencies.map((dependency) => ({
      from: dependency.fromConceptId,
      to: dependency.toConceptId,
    })),
  };
}
