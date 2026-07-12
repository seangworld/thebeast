import { getSampleCurriculumScope } from "./sampleContentRegistry";
import type { CurriculumSubject } from "./types";

const preAlgebraProvingGroundScope = getSampleCurriculumScope(
  "pre-algebra-proving-ground-scope"
);
const algebraExpansionScope = getSampleCurriculumScope("algebra-expansion-scope");

export const curriculumSubjects: CurriculumSubject[] = [
  {
    id: "cybersecurity",
    title: "Cybersecurity",
    metadata: "CompTIA Security+ SY0-701 aligned security foundations.",
    courses: [
      {
        id: "security-plus-foundations-course",
        title: "Security+ Foundations",
        metadata: "Partial official-objective alignment for the current Security+ SY0-701 path.",
        modules: [
          {
            id: "identity-access-module",
            title: "Identity and Access",
            metadata: "Security+ identity, authentication, access control, and operations evidence.",
            lessons: [
              {
                id: "identity-verification-lesson",
                title: "Identity Verification",
                metadata: "Maps to Security+ SY0-701 identity and access operations objective coverage.",
                concepts: [
                  {
                    id: "identity-verification",
                    title: "Identity Verification",
                    metadata: "Core concept",
                    skills: [
                      {
                        id: "explain-identity-proofing",
                        title: "Explain identity proofing",
                        metadata: "Conceptual explanation skill",
                        objectives: [
                          {
                            id: "security-plus-4-6-iam",
                            title: "Identity and access operations",
                            metadata: "Official Security+ objective alignment: SY0-701-4.6",
                          },
                        ],
                      },
                    ],
                  },
                  {
                    id: "authentication-factors",
                    title: "Authentication Factors",
                    metadata: "Core concept",
                    skills: [
                      {
                        id: "classify-auth-factors",
                        title: "Classify authentication factors",
                        metadata: "Applied classification skill",
                        objectives: [
                          {
                            id: "security-plus-4-6-iam",
                            title: "Authentication factor operations",
                            metadata: "Official Security+ objective alignment: SY0-701-4.6",
                          },
                        ],
                      },
                    ],
                  },
                ],
              },
              {
                id: "rbac-lesson",
                title: "Role-Based Access Control",
                metadata: "Maps RBAC to Security+ infrastructure, IAM, response, and investigation objectives.",
                concepts: [
                  {
                    id: "role-based-access-control",
                    title: "Role-Based Access Control",
                    metadata: "Core concept",
                    skills: [
                      {
                        id: "design-rbac",
                        title: "Design a simple RBAC model",
                        metadata: "Applied design skill",
                        objectives: [
                          {
                            id: "security-plus-3-2-secure-infrastructure",
                            title: "Secure infrastructure access design",
                            metadata: "Official Security+ objective alignment: SY0-701-3.2",
                          },
                          {
                            id: "security-plus-4-6-iam",
                            title: "Role-based access operations",
                            metadata: "Official Security+ objective alignment: SY0-701-4.6",
                          },
                          {
                            id: "security-plus-4-8-incident-response",
                            title: "Access-control response decisions",
                            metadata: "Official Security+ objective alignment: SY0-701-4.8",
                          },
                          {
                            id: "security-plus-4-9-investigation-data",
                            title: "Access evidence for investigation",
                            metadata: "Official Security+ objective alignment: SY0-701-4.9",
                          },
                        ],
                      },
                    ],
                  },
                ],
              },
            ],
          },
        ],
      },
    ],
  },
  {
    id: "mathematics",
    title: "Mathematics",
    metadata: "Algebra-to-functions progression.",
    courses: [
      {
        id: preAlgebraProvingGroundScope?.courseId || "pre-algebra-foundations-course",
        title: preAlgebraProvingGroundScope?.courseTitle || "Pre-Algebra Foundations",
        metadata: "Implemented proving-ground scope for prerequisite checks and the first teachable lesson.",
        modules: [
          {
            id: "expression-foundations-module",
            title: "Expression Foundations",
            metadata: "Initial Pre-Algebra module with explicit prerequisites and objectives.",
            lessons: [
              {
                id: "pre-algebra-combining-like-terms",
                title: "Combining Like Terms",
                metadata:
                  preAlgebraProvingGroundScope?.scopeBoundary ||
                  "Implemented proving-ground lesson and prerequisite checks.",
                concepts: [
                  {
                    id: "like-terms",
                    title: "Like Terms",
                    metadata: "Requires coefficient recognition before combining expressions.",
                    skills: [
                      {
                        id: "identify-like-terms",
                        title: "Identify like terms",
                        metadata: "Prerequisite-supported classification skill",
                        objectives: [
                          {
                            id: "objective-identify-like-terms",
                            title: "Identify terms with the same variable part.",
                            metadata: "Pre-Algebra proving-ground objective",
                          },
                        ],
                      },
                    ],
                  },
                  {
                    id: "combine-like-terms",
                    title: "Combine Like Terms",
                    metadata: "Requires coefficients, like terms, and integer addition.",
                    skills: [
                      {
                        id: "combine-coefficients",
                        title: "Combine coefficients",
                        metadata: "Guided expression simplification skill",
                        objectives: [
                          {
                            id: "objective-combine-like-terms",
                            title: "Combine coefficients while preserving the matching variable part.",
                            metadata: "Pre-Algebra proving-ground objective",
                          },
                        ],
                      },
                    ],
                  },
                ],
              },
            ],
          },
        ],
      },
      {
        id: algebraExpansionScope?.courseId || "algebra-expansion-course",
        title: algebraExpansionScope?.courseTitle || "Algebra Expansion",
        metadata:
          algebraExpansionScope?.scopeBoundary ||
          "Linear equations fixture that follows the Pre-Algebra proving-ground pattern.",
        modules: [
          {
            id: "equations-module",
            title: "Equations",
            metadata: "Equation-solving sequence.",
            lessons: [
              {
                id: algebraExpansionScope?.lessons[0].id || "algebra-linear-equations",
                title: algebraExpansionScope?.lessons[0].title || "Linear Equations",
                metadata: "Algebra expansion lesson with explicit prerequisites and objectives.",
                concepts: [
                  {
                    id: "linear-equations",
                    title: "Linear Equations",
                    metadata: "Core concept",
                    skills: [
                      {
                        id: "solve-linear-equations",
                        title: "Solve linear equations",
                        metadata: "Procedural algebra skill",
                        objectives: [
                          {
                            id:
                              algebraExpansionScope?.lessons[0].objectiveIds[0] ||
                              "objective-isolate-variable",
                            title:
                              algebraExpansionScope?.objectives[0].title ||
                              "Isolate a variable using one inverse operation.",
                            metadata: "Algebra expansion objective",
                          },
                          {
                            id:
                              algebraExpansionScope?.lessons[0].objectiveIds[1] ||
                              "objective-check-equation-solution",
                            title:
                              algebraExpansionScope?.objectives[1].title ||
                              "Check a one-step equation solution by substitution.",
                            metadata: "Algebra expansion objective",
                          },
                        ],
                      },
                    ],
                  },
                ],
              },
            ],
          },
        ],
      },
    ],
  },
];

export function getCurrentCurriculum() {
  return curriculumSubjects[0];
}
