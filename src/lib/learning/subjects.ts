import type { LearningSubject } from "./types";

export const learningSubjects: LearningSubject[] = [
  {
    id: "math",
    title: "Math",
    description: "Algebra, geometry, statistics, and calculus foundations.",
    topics: [
      {
        id: "algebra",
        title: "Algebra",
        childTopics: [
          { id: "linear-equations", title: "Linear Equations" },
          { id: "quadratic-equations", title: "Quadratic Equations" },
        ],
      },
      { id: "calculus", title: "Calculus" },
    ],
  },
  {
    id: "science",
    title: "Science",
    description: "Core science concepts, labs, and reference materials.",
    topics: [{ id: "biology", title: "Biology" }, { id: "physics", title: "Physics" }],
  },
  {
    id: "history",
    title: "History",
    description: "Historical periods, timelines, primary sources, and review notes.",
    topics: [{ id: "world-history", title: "World History" }],
  },
  {
    id: "language-arts",
    title: "Language Arts",
    description: "Reading, writing, vocabulary, and discussion practice.",
    topics: [{ id: "writing", title: "Writing" }],
  },
  {
    id: "programming",
    title: "Programming",
    description: "Software fundamentals, coding practice, and project work.",
    topics: [{ id: "javascript", title: "JavaScript" }],
  },
  {
    id: "cybersecurity",
    title: "Cybersecurity",
    description: "Security concepts, certification prep, labs, and practice exams.",
    topics: [
      {
        id: "security-plus",
        title: "Security+",
        childTopics: [
          { id: "authentication", title: "Authentication" },
          { id: "access-control", title: "Access Control" },
        ],
      },
    ],
  },
  {
    id: "finance",
    title: "Finance",
    description: "Financial literacy and personal money education.",
    topics: [{ id: "budgeting", title: "Budgeting" }],
  },
  {
    id: "trades",
    title: "Trades",
    description: "Hands-on trade skills and shop practice.",
    topics: [{ id: "woodworking", title: "Woodworking" }],
  },
  {
    id: "languages",
    title: "Languages",
    description: "Language learning, vocabulary, speaking, and listening practice.",
    topics: [{ id: "spanish", title: "Spanish" }],
  },
  {
    id: "business",
    title: "Business",
    description: "Operations, management, entrepreneurship, and planning.",
    topics: [{ id: "operations", title: "Operations" }],
  },
  {
    id: "health",
    title: "Health",
    description: "Wellness education, anatomy, nutrition, and health literacy.",
    topics: [{ id: "wellness", title: "Wellness" }],
  },
  {
    id: "hobbies",
    title: "Hobbies",
    description: "Creative and recreational learning paths.",
    topics: [{ id: "music", title: "Music" }],
  },
];

export function findLearningSubject(subjectId: string) {
  return learningSubjects.find((subject) => subject.id === subjectId);
}
