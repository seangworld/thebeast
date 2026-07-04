import type { LearningBuiltCourse } from "./types";

export const builtLearningCourses: LearningBuiltCourse[] = [
  {
    id: "security-plus-foundations-course",
    title: "Security+ Foundations",
    subject: "Cybersecurity",
    estimatedDuration: "6 weeks",
    progress: 38,
    milestones: ["Map objectives", "Master authentication", "Complete access control review"],
    prerequisiteIds: [],
    completed: false,
    modules: [
      {
        id: "security-core",
        title: "Core Security Concepts",
        estimatedDuration: "2 weeks",
        completed: false,
        lessons: [
          {
            id: "identity-basics-lesson",
            title: "Identity and Authentication",
            estimatedMinutes: 35,
            completed: true,
            topics: [
              {
                id: "identity-verification-topic",
                title: "Identity Verification",
                reviewPrompt: "Explain the difference between identity proofing and authentication.",
                completed: true,
                activities: [
                  { id: "identity-reading", type: "reading", title: "Read identity notes", estimatedMinutes: 10, completed: true },
                  { id: "identity-exercise", type: "exercise", title: "Classify authentication factors", estimatedMinutes: 15, completed: true },
                ],
              },
            ],
          },
          {
            id: "access-control-lesson",
            title: "Access Control",
            estimatedMinutes: 40,
            completed: false,
            topics: [
              {
                id: "rbac-topic",
                title: "Role-Based Access Control",
                reviewPrompt: "Describe when RBAC is cleaner than direct permission assignment.",
                completed: false,
                activities: [
                  { id: "rbac-video", type: "video", title: "Watch RBAC walkthrough", estimatedMinutes: 12, completed: false },
                  { id: "rbac-reflection", type: "reflection", title: "Write one RBAC workplace example", estimatedMinutes: 8, completed: false },
                  { id: "rbac-assessment", type: "assessment placeholder", title: "Check RBAC readiness", estimatedMinutes: 10, completed: false },
                ],
              },
            ],
          },
        ],
      },
    ],
  },
  {
    id: "college-algebra-course",
    title: "College Algebra Refresh",
    subject: "Math",
    estimatedDuration: "4 weeks",
    progress: 46,
    milestones: ["Linear equations", "Quadratics", "Functions"],
    prerequisiteIds: [],
    completed: false,
    modules: [
      {
        id: "algebra-patterns",
        title: "Algebra Patterns",
        estimatedDuration: "10 days",
        completed: false,
        lessons: [
          {
            id: "linear-equations-lesson",
            title: "Linear Equations",
            estimatedMinutes: 30,
            completed: true,
            topics: [
              {
                id: "linear-solving-topic",
                title: "Solving One-Variable Equations",
                reviewPrompt: "Solve and explain each inverse operation.",
                completed: true,
                activities: [
                  { id: "linear-reading", type: "reading", title: "Read solving steps", estimatedMinutes: 8, completed: true },
                  { id: "linear-practice", type: "exercise", title: "Solve five equations", estimatedMinutes: 15, completed: true },
                ],
              },
            ],
          },
        ],
      },
    ],
  },
];

export function calculateBuiltCourseProgress(course: LearningBuiltCourse) {
  const activities = course.modules.flatMap((module) =>
    module.lessons.flatMap((lesson) =>
      lesson.topics.flatMap((topic) => topic.activities)
    )
  );

  if (activities.length === 0) return 0;

  return Math.round(
    (activities.filter((activity) => activity.completed).length / activities.length) * 100
  );
}
