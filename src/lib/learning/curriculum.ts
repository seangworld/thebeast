import type { CurriculumSubject } from "./types";

export const curriculumSubjects: CurriculumSubject[] = [
  {
    id: "cybersecurity",
    title: "Cybersecurity",
    metadata: "Certification-aligned security foundations.",
    courses: [
      {
        id: "security-plus-foundations-course",
        title: "Security+ Foundations",
        metadata: "Entry certification readiness path.",
        modules: [
          {
            id: "identity-access-module",
            title: "Identity and Access",
            metadata: "Security identity, authentication, and access control.",
            lessons: [
              {
                id: "identity-verification-lesson",
                title: "Identity Verification",
                metadata: "Beginner identity lesson.",
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
                            id: "objective-identity-proofing",
                            title: "Differentiate identity proofing and authentication.",
                            metadata: "Certification objective placeholder",
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
                            id: "objective-auth-factors",
                            title: "Classify knowledge, possession, and inherence factors.",
                            metadata: "Certification objective placeholder",
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
                metadata: "Intermediate access-control lesson.",
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
                            id: "objective-rbac",
                            title: "Map users to roles and roles to permissions.",
                            metadata: "Certification objective placeholder",
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
        id: "college-algebra-course",
        title: "College Algebra Refresh",
        metadata: "Foundational algebra path.",
        modules: [
          {
            id: "equations-module",
            title: "Equations",
            metadata: "Equation-solving sequence.",
            lessons: [
              {
                id: "linear-equations-lesson",
                title: "Linear Equations",
                metadata: "Beginner algebra lesson.",
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
                            id: "objective-linear-equations",
                            title: "Solve one-variable linear equations.",
                            metadata: "Common Core placeholder",
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
