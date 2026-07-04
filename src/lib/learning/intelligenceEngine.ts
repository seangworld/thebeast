import { buildAdaptiveLearningPlan } from "./adaptivePlanner";
import { buildDependencyGraphState } from "./dependencyGraph";
import { mockLearningKnowledgeModel } from "./knowledgeGraph";
import { mockLearningMemory } from "./learningMemory";
import { calculateMasteryProfile } from "./mastery";
import { predictLearningProgress } from "./prediction";
import { recommendLearningResources } from "./resourceEngine";
import { generateStudySession } from "./sessionGenerator";
import { analyzeLearningWeaknesses } from "./weaknessAnalysis";
import type { LearningGoal } from "./types";

export function buildLearningIntelligenceSnapshot({
  goals,
  weeklyStudyMinutes,
}: {
  goals: LearningGoal[];
  weeklyStudyMinutes: number;
}) {
  const mastery = calculateMasteryProfile([
    {
      conceptId: "linear-equations",
      completedSessions: 4,
      completedGoals: 1,
      completedMilestones: 2,
      quizzesPlaceholder: 1,
      practicePlaceholder: 3,
      studyStreakDays: 7,
      lastStudiedDaysAgo: 1,
    },
    {
      conceptId: "quadratic-equations",
      completedSessions: 1,
      completedGoals: 0,
      completedMilestones: 1,
      quizzesPlaceholder: 0,
      practicePlaceholder: 1,
      studyStreakDays: 7,
      lastStudiedDaysAgo: 5,
    },
    {
      conceptId: "identity-verification",
      completedSessions: 3,
      completedGoals: 1,
      completedMilestones: 2,
      quizzesPlaceholder: 1,
      practicePlaceholder: 2,
      studyStreakDays: 7,
      lastStudiedDaysAgo: 0,
    },
    {
      conceptId: "role-based-access",
      completedSessions: 1,
      completedGoals: 0,
      completedMilestones: 1,
      quizzesPlaceholder: 0,
      practicePlaceholder: 1,
      studyStreakDays: 7,
      lastStudiedDaysAgo: 4,
    },
  ]);
  const dependencyGraph = buildDependencyGraphState({
    model: mockLearningKnowledgeModel,
    completedConceptIds: mastery.strongestConcepts,
  });
  const weakness = analyzeLearningWeaknesses({
    mastery,
    memory: mockLearningMemory,
  });
  const adaptivePlan = buildAdaptiveLearningPlan({
    goals,
    mastery,
    memory: mockLearningMemory,
    weakness,
    availableStudyMinutes: weeklyStudyMinutes,
    learningPace: mockLearningMemory.learningPace,
    completedWorkCount: mastery.strongestConcepts.length,
  });
  const generatedSession = generateStudySession({
    mastery,
    weakness,
    availableMinutes: 35,
  });
  const resources = recommendLearningResources({
    model: mockLearningKnowledgeModel,
    mastery,
    goals,
    currentTopicId: "security-foundations",
  });
  const prediction = predictLearningProgress({
    mastery,
    memory: mockLearningMemory,
    weeklyStudyMinutes,
  });

  return {
    knowledgeModel: mockLearningKnowledgeModel,
    memory: mockLearningMemory,
    mastery,
    dependencyGraph,
    weakness,
    adaptivePlan,
    generatedSession,
    resources,
    prediction,
  };
}
