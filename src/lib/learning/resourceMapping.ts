import type { ResourceMapLink } from "./types";

export const resourceMapLinks: ResourceMapLink[] = [
  {
    resourceId: "security-objectives",
    conceptIds: ["identity-verification", "authentication-factors", "role-based-access-control"],
    skillIds: ["explain-identity-proofing", "classify-auth-factors", "design-rbac"],
    courseIds: ["security-plus-foundations-course"],
    careerIds: ["security-analyst"],
    certificationIds: ["comptia-security-plus"],
  },
  {
    resourceId: "security-article",
    conceptIds: ["identity-verification"],
    skillIds: ["explain-identity-proofing"],
    courseIds: ["security-plus-foundations-course"],
    careerIds: ["security-analyst", "cloud-security-specialist"],
    certificationIds: ["comptia-security-plus", "aws-cloud-practitioner"],
  },
  {
    resourceId: "access-practice-test",
    conceptIds: ["role-based-access-control", "least-privilege"],
    skillIds: ["design-rbac"],
    courseIds: ["security-plus-foundations-course"],
    careerIds: ["security-analyst"],
    certificationIds: ["comptia-security-plus"],
  },
  {
    resourceId: "college-algebra-notes",
    conceptIds: ["linear-equations", "quadratic-equations"],
    skillIds: ["solve-linear-equations"],
    courseIds: ["college-algebra-course"],
    careerIds: [],
    certificationIds: [],
  },
];

export function getResourceLinksForConcept(conceptId: string) {
  return resourceMapLinks.filter((link) => link.conceptIds.includes(conceptId));
}
