import type { LifelongRoadmapSection } from "./lifelongRoadmap";

export type EducationalCardAction = {
  label: string;
  href: string;
};

const roadmapActions: Record<
  LifelongRoadmapSection["id"],
  EducationalCardAction
> = {
  "current-grade": {
    label: "Discuss with Counselor",
    href: "/dashboard/education#mentor-session",
  },
  "academic-progress": {
    label: "Review progress",
    href: "/dashboard/education/reports",
  },
  "career-interests": {
    label: "Explore career fit",
    href: "/dashboard/education/career-planning",
  },
  "possible-careers": {
    label: "Compare directions",
    href: "/dashboard/education/career-planning",
  },
  "required-education": {
    label: "Continue planning",
    href: "/dashboard/education/educational-roadmap",
  },
  "recommended-certifications": {
    label: "View credential plan",
    href: "/dashboard/education/certifications",
  },
  "high-school-planning": {
    label: "Discuss next step",
    href: "/dashboard/education#mentor-session",
  },
  "college-planning": {
    label: "Build school criteria",
    href: "/dashboard/education/schools",
  },
  "alternative-pathways": {
    label: "Compare pathways",
    href: "/dashboard/education/career-planning",
  },
};

export function getRoadmapCardAction(
  section: LifelongRoadmapSection
): EducationalCardAction {
  if (section.status === "needs-context") {
    return {
      label: "Discuss with Counselor",
      href: "/dashboard/education#mentor-session",
    };
  }
  return roadmapActions[section.id];
}

export const learningAccessActions = {
  goals: {
    label: "Open goals",
    href: "/dashboard/education/goals",
  },
  "study-plan": {
    label: "Continue planning",
    href: "/dashboard/education/educational-roadmap",
  },
  courses: {
    label: "Open learning paths",
    href: "/dashboard/education/courses",
  },
  flashcards: {
    label: "Review",
    href: "/dashboard/education/reviews",
  },
  achievements: {
    label: "View achievements",
    href: "/dashboard/education/achievements",
  },
  "certificate-access": {
    label: "View certificates",
    href: "/dashboard/education/certificates",
  },
} as const satisfies Record<string, EducationalCardAction>;

export function getWorkspaceRecordAction(
  workspace: string
): EducationalCardAction {
  if (workspace === "learning-path" || workspace === "educational-roadmap") {
    return {
      label: "Continue planning",
      href: "/dashboard/education/educational-roadmap",
    };
  }
  if (workspace === "certifications" || workspace === "certificates") {
    return {
      label: "View plan",
      href: "/dashboard/education/certifications",
    };
  }
  if (workspace === "skills") {
    return { label: "Practice with Tutor", href: "/dashboard/education/tutor" };
  }
  if (workspace === "tutor") {
    return { label: "Continue with Tutor", href: "/dashboard/education/tutor" };
  }
  if (workspace === "reviews") {
    return { label: "Review", href: "/dashboard/education/reviews" };
  }
  if (workspace === "achievements") {
    return {
      label: "Continue learning",
      href: "/dashboard/education#mentor-session",
    };
  }
  return {
    label: "Open details",
    href: `/dashboard/education/${workspace}`,
  };
}
