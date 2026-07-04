import { curriculumConceptLibrary } from "./concepts";
import type { MasteryMap, MasteryMapStatus } from "./types";

const masteryByConcept: Record<string, number> = {
  "identity-verification": 82,
  "authentication-factors": 58,
  "role-based-access-control": 42,
  "least-privilege": 15,
  "linear-equations": 76,
  "quadratic-equations": 35,
};

function statusForMastery(value: number): MasteryMapStatus {
  if (value >= 75) return "Known";
  if (value >= 50) return "Learning";
  if (value >= 25) return "Needs Review";
  if (value > 0) return "Not Started";
  return "Future";
}

export function buildMasteryMap(subjectId = "cybersecurity"): MasteryMap {
  const conceptIds =
    subjectId === "cybersecurity"
      ? ["identity-verification", "authentication-factors", "role-based-access-control", "least-privilege"]
      : curriculumConceptLibrary.map((concept) => concept.id);
  const nodes = conceptIds.map((conceptId) => {
    const concept = curriculumConceptLibrary.find((item) => item.id === conceptId);
    const masteryPercent = masteryByConcept[conceptId] || 0;

    return {
      id: conceptId,
      title: concept?.title || conceptId,
      status: statusForMastery(masteryPercent),
      masteryPercent,
    };
  });
  const recommendedNextConcept =
    nodes.find((node) => node.status === "Needs Review") ||
    nodes.find((node) => node.status === "Learning") ||
    nodes.find((node) => node.status === "Not Started") ||
    nodes[0];

  return {
    subjectId,
    nodes,
    recommendedNextConceptId: recommendedNextConcept?.id || "identity-verification",
  };
}
