import type {
  LearningGoal,
  LearningKnowledgeModel,
  MasteryProfile,
  ResourceRecommendationResult,
} from "./types";

export function recommendLearningResources({
  model,
  mastery,
  goals,
  currentTopicId,
}: {
  model: LearningKnowledgeModel;
  mastery: MasteryProfile;
  goals: LearningGoal[];
  currentTopicId: string;
}): ResourceRecommendationResult {
  const goalConceptIds = new Set(goals.map((goal) => goal.id));
  const targetConceptId =
    mastery.weakConcepts[0] ||
    model.concepts.find((concept) => concept.topicId === currentTopicId)?.id ||
    model.concepts.find((concept) => goalConceptIds.has(concept.id))?.id ||
    model.concepts[0]?.id ||
    "unknown";

  return {
    conceptId: targetConceptId,
    resources: model.resources
      .filter((resource) => resource.conceptId === targetConceptId)
      .concat(model.resources.filter((resource) => resource.type === "external site"))
      .slice(0, 4),
  };
}
