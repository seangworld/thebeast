import { careerKnowledgeCatalog } from "./careers";
import type { LearningAIContext, MasteryProfile } from "./types";

export function buildLearningAIContext({
  learnerName,
  mastery,
  weakAreas,
  currentLesson,
  goals = [],
  courses = [],
  recentSessions = [],
  studyHistory = [],
}: {
  learnerName: string;
  mastery: MasteryProfile;
  weakAreas: string[];
  currentLesson: string;
  goals?: string[];
  courses?: string[];
  recentSessions?: string[];
  studyHistory?: string[];
}): LearningAIContext {
  return {
    profile: learnerName,
    goals,
    courses,
    mastery: mastery.concepts.map(
      (concept) => `${concept.conceptId}:${concept.masteryPercent}`
    ),
    recentSessions,
    career: careerKnowledgeCatalog[0]?.title || "Security Analyst",
    learningStyle: "Read then practice",
    studyHistory,
    weakAreas,
    currentLesson,
  };
}
