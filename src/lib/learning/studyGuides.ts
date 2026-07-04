import type { LearningStudyGuide } from "./types";

export const learningStudyGuides: LearningStudyGuide[] = [
  {
    id: "security-access-guide",
    title: "Access Control Study Guide",
    subject: "Cybersecurity",
    overview: "A compact guide for access-control vocabulary and exam readiness.",
    keyConcepts: ["RBAC", "least privilege", "authentication factors"],
    vocabulary: ["role", "permission", "principal", "policy"],
    importantFacts: [
      "Permissions should map to job responsibilities.",
      "Authentication verifies identity before authorization decisions.",
    ],
    commonMistakes: [
      "Mixing authentication and authorization definitions.",
      "Assigning direct permissions when a role would be cleaner.",
    ],
    reviewChecklist: ["Define RBAC", "Explain least privilege", "Name MFA factors"],
    practiceTasks: ["Classify three access scenarios", "Write one RBAC example"],
    resources: ["security-objectives", "security-article"],
    tags: ["Security+", "access control", "review"],
  },
];

export function getStudyGuideBySubject(subject: string) {
  return learningStudyGuides.filter((guide) => guide.subject === subject);
}
