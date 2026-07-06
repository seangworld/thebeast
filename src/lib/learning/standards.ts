import type { LearningStandardPlaceholder } from "./types";

export const learningStandards: LearningStandardPlaceholder[] = [
  {
    id: "common-core-algebra-placeholder",
    type: "Common Core",
    subjectId: "mathematics",
    title: "Algebra reasoning",
    description: "Placeholder standard for equation solving and function readiness.",
    mappedConceptIds: ["linear-equations", "quadratic-equations"],
  },
  {
    id: "state-science-placeholder",
    type: "State standards",
    subjectId: "science",
    title: "Scientific reasoning",
    description: "State science standards mapping.",
    mappedConceptIds: [],
  },
  {
    id: "national-language-arts-placeholder",
    type: "National standards",
    subjectId: "language-arts",
    title: "Communication",
    description: "Placeholder for reading, writing, and speaking expectations.",
    mappedConceptIds: [],
  },
  {
    id: "security-plus-objectives-placeholder",
    type: "Certification objectives",
    subjectId: "cybersecurity",
    title: "Security+ identity and access objective",
    description: "Mock certification objective group for identity and access skills.",
    mappedConceptIds: ["identity-verification", "authentication-factors", "role-based-access-control"],
  },
  {
    id: "trade-competency-placeholder",
    type: "Trade competencies",
    subjectId: "trades",
    title: "Shop safety",
    description: "Trade competency mapping.",
    mappedConceptIds: [],
  },
];
