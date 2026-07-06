import type { CareerKnowledgeModel } from "./types";

export const careerKnowledgeCatalog: CareerKnowledgeModel[] = [
  {
    id: "security-analyst",
    title: "Security Analyst",
    overview: "Monitors systems, investigates alerts, and supports security operations.",
    requiredEducation: ["High school diploma or equivalent", "IT fundamentals", "Security foundations"],
    recommendedCourseIds: ["security-plus-foundations-course"],
    recommendedSkillIds: ["explain-identity-proofing", "classify-auth-factors", "design-rbac"],
    recommendedCertificationIds: ["comptia-security-plus"],
    salaryPlaceholder: "Market salary varies by location and experience.",
    growthPlaceholder: "Strong demand for security operations skills.",
    relatedCareerIds: ["cloud-security-specialist", "network-technician"],
  },
  {
    id: "cloud-security-specialist",
    title: "Cloud Security Specialist",
    overview: "Builds and reviews security controls for cloud platforms.",
    requiredEducation: ["Cloud fundamentals", "Networking basics", "Security foundations"],
    recommendedCourseIds: ["security-plus-foundations-course"],
    recommendedSkillIds: ["design-rbac"],
    recommendedCertificationIds: ["aws-cloud-practitioner"],
    salaryPlaceholder: "Market salary varies by cloud platform and experience.",
    growthPlaceholder: "Cloud governance and identity skills remain valuable.",
    relatedCareerIds: ["security-analyst"],
  },
  {
    id: "network-technician",
    title: "Network Technician",
    overview: "Maintains networks, troubleshoots connectivity, and supports infrastructure.",
    requiredEducation: ["Networking foundations", "Hardware basics"],
    recommendedCourseIds: ["security-plus-foundations-course"],
    recommendedSkillIds: ["classify-auth-factors"],
    recommendedCertificationIds: ["cisco-ccna"],
    salaryPlaceholder: "Market salary varies by region and employer.",
    growthPlaceholder: "Steady demand for infrastructure support.",
    relatedCareerIds: ["security-analyst"],
  },
];

export function findCareer(careerId: string) {
  return careerKnowledgeCatalog.find((career) => career.id === careerId);
}
