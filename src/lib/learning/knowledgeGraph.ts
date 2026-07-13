import { curriculumSubjects } from "./curriculum";
import type {
  CurriculumSubject,
  KnowledgeGraphLink,
  KnowledgeGraphNode,
  LearningKnowledgeModel,
} from "./types";

export const mockLearningKnowledgeModel: LearningKnowledgeModel = {
  topics: [
    { id: "math-foundations", name: "Math Foundations", description: "Sequential algebra-to-calculus path." },
    { id: "security-foundations", name: "Security Foundations", description: "Security+ readiness concepts." },
  ],
  skills: [
    { id: "fractions", name: "Fractions", relatedSkillIds: ["ratios"] },
    { id: "ratios", name: "Ratios", relatedSkillIds: ["fractions", "proportions"] },
    { id: "proportions", name: "Proportions", relatedSkillIds: ["ratios", "algebra"] },
    { id: "algebra", name: "Algebra", relatedSkillIds: ["functions"] },
    { id: "functions", name: "Functions", relatedSkillIds: ["algebra", "calculus"] },
    { id: "calculus", name: "Calculus", relatedSkillIds: ["functions"] },
    { id: "access-control", name: "Access Control", relatedSkillIds: ["authentication"] },
    { id: "authentication", name: "Authentication", relatedSkillIds: ["access-control"] },
  ],
  concepts: [
    { id: "fraction-basics", name: "Fractions", skillId: "fractions", topicId: "math-foundations", prerequisiteIds: [] },
    { id: "ratios", name: "Ratios", skillId: "ratios", topicId: "math-foundations", prerequisiteIds: ["fraction-basics"] },
    { id: "proportions", name: "Proportions", skillId: "proportions", topicId: "math-foundations", prerequisiteIds: ["ratios"] },
    { id: "linear-equations", name: "Linear Equations", skillId: "algebra", topicId: "math-foundations", prerequisiteIds: ["proportions"] },
    { id: "quadratic-equations", name: "Quadratic Equations", skillId: "algebra", topicId: "math-foundations", prerequisiteIds: ["linear-equations"] },
    { id: "functions", name: "Functions", skillId: "functions", topicId: "math-foundations", prerequisiteIds: ["quadratic-equations"] },
    { id: "calculus", name: "Calculus", skillId: "calculus", topicId: "math-foundations", prerequisiteIds: ["functions"] },
    { id: "identity-verification", name: "Identity Verification", skillId: "authentication", topicId: "security-foundations", prerequisiteIds: [] },
    { id: "role-based-access", name: "Role-Based Access", skillId: "access-control", topicId: "security-foundations", prerequisiteIds: ["identity-verification"] },
  ],
  objectives: [
    { id: "use-fractions", conceptId: "fraction-basics", objective: "Use fractions as parts of a whole." },
    { id: "compare-ratios", conceptId: "ratios", objective: "Compare quantities with ratios." },
    { id: "solve-proportions", conceptId: "proportions", objective: "Solve simple proportions." },
    { id: "solve-linear", conceptId: "linear-equations", objective: "Solve one-variable linear equations." },
    { id: "factor-quadratics", conceptId: "quadratic-equations", objective: "Factor simple quadratic equations." },
    { id: "interpret-functions", conceptId: "functions", objective: "Interpret function notation and graphs." },
    { id: "explain-auth", conceptId: "identity-verification", objective: "Explain identity verification methods." },
  ],
  dependencies: [
    { fromConceptId: "fraction-basics", toConceptId: "ratios", type: "prerequisite" },
    { fromConceptId: "ratios", toConceptId: "proportions", type: "prerequisite" },
    { fromConceptId: "proportions", toConceptId: "linear-equations", type: "prerequisite" },
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

function uniqueNodes(nodes: KnowledgeGraphNode[]) {
  const seen = new Set<string>();

  return nodes.filter((node) => {
    if (seen.has(node.id)) return false;
    seen.add(node.id);
    return true;
  });
}

function uniqueLinks(links: KnowledgeGraphLink[]) {
  const seen = new Set<string>();

  return links.filter((link) => {
    const key = `${link.from}->${link.to}:${link.relationship}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function goalIdForSubject(subject: CurriculumSubject) {
  return `goal-${subject.id}`;
}

export function buildCurriculumKnowledgeGraph(subjects: CurriculumSubject[] = curriculumSubjects) {
  const nodes: KnowledgeGraphNode[] = [];
  const links: KnowledgeGraphLink[] = [];

  subjects.forEach((subject) => {
    const goalId = goalIdForSubject(subject);
    nodes.push({
      id: goalId,
      label: `${subject.title} Learning Goal`,
      kind: "learning-goal",
      prerequisiteIds: [],
    });

    subject.courses.forEach((course) => {
      nodes.push({
        id: course.id,
        label: course.title,
        kind: "course",
        prerequisiteIds: [],
      });
      links.push({ from: course.id, to: goalId, relationship: "supports-goal" });

      course.modules.forEach((module) => {
        nodes.push({
          id: module.id,
          label: module.title,
          kind: "module",
          prerequisiteIds: [],
        });
        links.push({ from: module.id, to: course.id, relationship: "belongs-to" });

        module.lessons.forEach((lesson) => {
          nodes.push({
            id: lesson.id,
            label: lesson.title,
            kind: "lesson",
            prerequisiteIds: [],
          });
          links.push({ from: lesson.id, to: module.id, relationship: "belongs-to" });

          lesson.concepts.forEach((concept) => {
            nodes.push({
              id: concept.id,
              label: concept.title,
              kind: "concept",
              prerequisiteIds: [],
            });
            links.push({ from: concept.id, to: lesson.id, relationship: "teaches" });

            concept.skills.forEach((skill) => {
              nodes.push({
                id: skill.id,
                label: skill.title,
                kind: "skill",
                prerequisiteIds: [],
              });
              links.push({ from: concept.id, to: skill.id, relationship: "builds-skill" });
              links.push({ from: skill.id, to: lesson.id, relationship: "belongs-to" });

              skill.objectives.forEach((objective) => {
                nodes.push({
                  id: objective.id,
                  label: objective.title,
                  kind: "objective",
                  prerequisiteIds: [concept.id],
                });
                links.push({ from: objective.id, to: concept.id, relationship: "belongs-to" });
              });
            });
          });
        });
      });
    });
  });

  return {
    nodes: uniqueNodes(nodes),
    links: uniqueLinks(links),
  };
}

function buildModelNodes(model: LearningKnowledgeModel): KnowledgeGraphNode[] {
  return [
    ...model.skills.map((skill) => ({
      id: skill.id,
      label: skill.name,
      kind: "skill" as const,
      prerequisiteIds: [],
    })),
    ...model.concepts.map((concept) => ({
      id: concept.id,
      label: concept.name,
      kind: "concept" as const,
      prerequisiteIds: concept.prerequisiteIds,
    })),
    ...model.topics.map((topic) => ({
      id: topic.id,
      label: topic.name,
      kind: "topic" as const,
      prerequisiteIds: [],
    })),
    ...model.objectives.map((objective) => ({
      id: objective.id,
      label: objective.objective,
      kind: "objective" as const,
      prerequisiteIds: [objective.conceptId],
    })),
  ];
}

function buildModelLinks(model: LearningKnowledgeModel): KnowledgeGraphLink[] {
  return [
    ...model.concepts.map((concept) => ({
      from: concept.id,
      to: concept.skillId,
      relationship: "builds-skill" as const,
    })),
    ...model.objectives.map((objective) => ({
      from: objective.id,
      to: objective.conceptId,
      relationship: "belongs-to" as const,
    })),
    ...model.dependencies.map((dependency) => ({
      from: dependency.fromConceptId,
      to: dependency.toConceptId,
      relationship: "requires" as const,
    })),
  ];
}

const curriculumGraph = buildCurriculumKnowledgeGraph();

mockLearningKnowledgeModel.nodes = uniqueNodes([
  ...buildModelNodes(mockLearningKnowledgeModel),
  ...curriculumGraph.nodes,
]);
mockLearningKnowledgeModel.graphLinks = uniqueLinks([
  ...buildModelLinks(mockLearningKnowledgeModel),
  ...curriculumGraph.links,
]);

export type KnowledgeGraphRecommendation = {
  recommendedConceptId: string;
  action: "review-prerequisite" | "continue-downstream" | "start-goal";
  reason: string;
  dependencyPath: string[];
  hierarchyPath: string[];
};

function labelFor(model: LearningKnowledgeModel, id: string) {
  return model.nodes.find((node) => node.id === id)?.label || id;
}

function hierarchyPathFor(model: LearningKnowledgeModel, conceptId: string) {
  const links = model.graphLinks || [];
  const path = [conceptId];
  let current = conceptId;

  while (path.length < 8) {
    const next = links.find(
      (link) =>
        link.from === current &&
        ["builds-skill", "belongs-to", "teaches", "supports-goal"].includes(link.relationship)
    )?.to;
    if (!next || path.includes(next)) break;
    path.push(next);
    current = next;
  }

  return path;
}

function prerequisitePathFor(
  model: LearningKnowledgeModel,
  conceptId: string,
  masteredConceptIds: string[]
): string[] {
  const mastered = new Set(masteredConceptIds);
  const concept = model.concepts.find((item) => item.id === conceptId);
  const missingPrerequisite = concept?.prerequisiteIds.find((id) => !mastered.has(id));

  if (!missingPrerequisite) return [];

  return [
    ...prerequisitePathFor(model, missingPrerequisite, masteredConceptIds),
    missingPrerequisite,
  ];
}

export function recommendFromKnowledgeGraph({
  model = mockLearningKnowledgeModel,
  currentConceptId,
  masteredConceptIds,
}: {
  model?: LearningKnowledgeModel;
  currentConceptId: string;
  masteredConceptIds: string[];
}): KnowledgeGraphRecommendation {
  const prerequisitePath = prerequisitePathFor(model, currentConceptId, masteredConceptIds);

  if (prerequisitePath.length > 0) {
    const recommendedConceptId = prerequisitePath[0];
    return {
      recommendedConceptId,
      action: "review-prerequisite",
      dependencyPath: [...prerequisitePath, currentConceptId],
      hierarchyPath: hierarchyPathFor(model, recommendedConceptId),
      reason: `Review ${labelFor(model, recommendedConceptId)} first because it supports ${labelFor(model, currentConceptId)}.`,
    };
  }

  const nextConcept = model.dependencies.find(
    (dependency) =>
      dependency.fromConceptId === currentConceptId &&
      !masteredConceptIds.includes(dependency.toConceptId)
  )?.toConceptId;

  if (nextConcept) {
    return {
      recommendedConceptId: nextConcept,
      action: "continue-downstream",
      dependencyPath: [currentConceptId, nextConcept],
      hierarchyPath: hierarchyPathFor(model, nextConcept),
      reason: `${labelFor(model, currentConceptId)} is ready enough to unlock ${labelFor(model, nextConcept)}.`,
    };
  }

  return {
    recommendedConceptId: currentConceptId,
    action: "start-goal",
    dependencyPath: [currentConceptId],
    hierarchyPath: hierarchyPathFor(model, currentConceptId),
    reason: `Start with ${labelFor(model, currentConceptId)} because it is the clearest available point in the active learning goal.`,
  };
}
