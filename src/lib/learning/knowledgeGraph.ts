import type { LearningKnowledgeModel } from "./types";

export const mockLearningKnowledgeModel: LearningKnowledgeModel = {
  topics: [
    { id: "math-foundations", name: "Math Foundations", description: "Sequential algebra-to-calculus path." },
    { id: "security-foundations", name: "Security Foundations", description: "Security+ readiness concepts." },
  ],
  skills: [
    { id: "algebra", name: "Algebra", relatedSkillIds: ["functions"] },
    { id: "functions", name: "Functions", relatedSkillIds: ["algebra", "calculus"] },
    { id: "calculus", name: "Calculus", relatedSkillIds: ["functions"] },
    { id: "access-control", name: "Access Control", relatedSkillIds: ["authentication"] },
    { id: "authentication", name: "Authentication", relatedSkillIds: ["access-control"] },
  ],
  concepts: [
    { id: "linear-equations", name: "Linear Equations", skillId: "algebra", topicId: "math-foundations", prerequisiteIds: [] },
    { id: "quadratic-equations", name: "Quadratic Equations", skillId: "algebra", topicId: "math-foundations", prerequisiteIds: ["linear-equations"] },
    { id: "functions", name: "Functions", skillId: "functions", topicId: "math-foundations", prerequisiteIds: ["quadratic-equations"] },
    { id: "calculus", name: "Calculus", skillId: "calculus", topicId: "math-foundations", prerequisiteIds: ["functions"] },
    { id: "identity-verification", name: "Identity Verification", skillId: "authentication", topicId: "security-foundations", prerequisiteIds: [] },
    { id: "role-based-access", name: "Role-Based Access", skillId: "access-control", topicId: "security-foundations", prerequisiteIds: ["identity-verification"] },
  ],
  objectives: [
    { id: "solve-linear", conceptId: "linear-equations", objective: "Solve one-variable linear equations." },
    { id: "factor-quadratics", conceptId: "quadratic-equations", objective: "Factor simple quadratic equations." },
    { id: "interpret-functions", conceptId: "functions", objective: "Interpret function notation and graphs." },
    { id: "explain-auth", conceptId: "identity-verification", objective: "Explain identity verification methods." },
  ],
  dependencies: [
    { fromConceptId: "linear-equations", toConceptId: "quadratic-equations", type: "prerequisite" },
    { fromConceptId: "quadratic-equations", toConceptId: "functions", type: "prerequisite" },
    { fromConceptId: "functions", toConceptId: "calculus", type: "prerequisite" },
    { fromConceptId: "identity-verification", toConceptId: "role-based-access", type: "prerequisite" },
  ],
  resources: [
    { id: "linear-video", title: "Linear equation walkthrough", type: "video", conceptId: "linear-equations", level: "introduced", urlPlaceholder: "future-resource://linear-video" },
    { id: "quadratic-exercises", title: "Quadratic practice set", type: "exercise", conceptId: "quadratic-equations", level: "practicing", urlPlaceholder: "future-resource://quadratic-exercises" },
    { id: "functions-project", title: "Functions mini project", type: "project", conceptId: "functions", level: "proficient", urlPlaceholder: "future-resource://functions-project" },
    { id: "security-article", title: "Authentication basics", type: "article", conceptId: "identity-verification", level: "introduced", urlPlaceholder: "future-resource://security-article" },
    { id: "access-practice-test", title: "Access control practice test", type: "practice test", conceptId: "role-based-access", level: "practicing", urlPlaceholder: "future-resource://access-practice-test" },
    { id: "calculus-book", title: "Calculus foundations", type: "book", conceptId: "calculus", level: "introduced", urlPlaceholder: "future-resource://calculus-book" },
    { id: "security-site", title: "Security glossary site", type: "external site", conceptId: "identity-verification", level: "introduced", urlPlaceholder: "future-resource://security-site" },
  ],
  nodes: [],
};

mockLearningKnowledgeModel.nodes = [
  ...mockLearningKnowledgeModel.skills.map((skill) => ({
    id: skill.id,
    label: skill.name,
    kind: "skill" as const,
    prerequisiteIds: [],
  })),
  ...mockLearningKnowledgeModel.concepts.map((concept) => ({
    id: concept.id,
    label: concept.name,
    kind: "concept" as const,
    prerequisiteIds: concept.prerequisiteIds,
  })),
  ...mockLearningKnowledgeModel.topics.map((topic) => ({
    id: topic.id,
    label: topic.name,
    kind: "topic" as const,
    prerequisiteIds: [],
  })),
  ...mockLearningKnowledgeModel.objectives.map((objective) => ({
    id: objective.id,
    label: objective.objective,
    kind: "objective" as const,
    prerequisiteIds: [objective.conceptId],
  })),
];
