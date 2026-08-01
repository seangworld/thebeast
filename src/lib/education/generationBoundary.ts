export const beastEducationGeneration = 1 as const;

export const generationOneEducationWorkspaces = [
  "profile",
  "paths",
  "roadmap",
  "documents",
  "outcomes",
  "research",
  "educational-roadmap",
  "career-planning",
  "schools",
  "scholarships",
  "certifications",
  "skills",
  "reports",
] as const;

export const dormantTeachingWorkspaces = [
  "tutor",
  "lesson-history",
  "learning-path",
  "courses",
  "lessons",
  "reviews",
  "achievements",
  "history",
  "certificates",
] as const;

export const retiredPlanningAliases: Readonly<Record<string, string>> = {
  "educational-roadmap": "/dashboard/education/education-planning",
  skills: "/dashboard/education#profile",
};

export const educationTeachingCapabilitiesAvailable = false;

export function isGenerationOneEducationWorkspace(
  value: string
): value is (typeof generationOneEducationWorkspaces)[number] {
  return generationOneEducationWorkspaces.includes(
    value as (typeof generationOneEducationWorkspaces)[number]
  );
}

export function isDormantTeachingWorkspace(
  value: string
): value is (typeof dormantTeachingWorkspaces)[number] {
  return dormantTeachingWorkspaces.includes(
    value as (typeof dormantTeachingWorkspaces)[number]
  );
}
