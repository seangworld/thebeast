import { curriculumConceptLibrary } from "./concepts";
import type { SkillTree, SkillTreeNode } from "./types";

const completedConceptIds = new Set(["identity-verification"]);
const inProgressConceptIds = new Set(["authentication-factors", "role-based-access-control"]);

function getSkillStatus(conceptId: string): SkillTreeNode["status"] {
  const concept = curriculumConceptLibrary.find((item) => item.id === conceptId);

  if (!concept) return "future";
  if (completedConceptIds.has(conceptId)) return "mastered";
  if (inProgressConceptIds.has(conceptId)) return "in progress";
  if (concept.prerequisiteIds.some((id) => !completedConceptIds.has(id))) {
    return "blocked";
  }

  return "available";
}

export function buildSkillTree(subjectId = "cybersecurity"): SkillTree {
  const concepts = curriculumConceptLibrary.filter((concept) =>
    subjectId === "cybersecurity"
      ? ["identity-verification", "authentication-factors", "role-based-access-control", "least-privilege"].includes(concept.id)
      : true
  );

  return {
    id: `${subjectId}-skill-tree`,
    title: `${subjectId} skill tree`,
    subjectId,
    nodes: concepts.map((concept, index) => ({
      id: concept.id,
      title: concept.title,
      status: getSkillStatus(concept.id),
      prerequisiteIds: concept.prerequisiteIds,
      x: index * 180,
      y: concept.prerequisiteIds.length * 90,
    })),
    edges: concepts.flatMap((concept) =>
      concept.prerequisiteIds.map((from) => ({ from, to: concept.id }))
    ),
  };
}
