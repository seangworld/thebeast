import { careerKnowledgeCatalog } from "./careers";
import { mockLearningMemory } from "./learningMemory";
import { mockLearningCourses, mockLearningGoals, mockLearningSessions } from "./mockData";
import type { LearningAIContext, MasteryProfile } from "./types";

export function buildLearningAIContext({
  learnerName,
  mastery,
  weakAreas,
  currentLesson,
}: {
  learnerName: string;
  mastery: MasteryProfile;
  weakAreas: string[];
  currentLesson: string;
}): LearningAIContext {
  return {
    profile: learnerName,
    goals: mockLearningGoals.map((goal) => goal.title),
    courses: mockLearningCourses.map((course) => course.title),
    mastery: mastery.concepts.map(
      (concept) => `${concept.conceptId}:${concept.masteryPercent}`
    ),
    recentSessions: mockLearningSessions.map((session) => session.title),
    career: careerKnowledgeCatalog[0]?.title || "Security Analyst",
    learningStyle: "Read then practice",
    studyHistory: mockLearningMemory.studyHistory.map(
      (session) => `${session.date}:${session.conceptId}:${session.minutes}`
    ),
    weakAreas,
    currentLesson,
  };
}
