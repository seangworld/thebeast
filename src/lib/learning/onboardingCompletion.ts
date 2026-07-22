export type LearningOnboardingFormInput = {
  preferredName: string;
  learnerType: string;
  gradeLevel: string;
  primaryGoal: string;
  courses: string[];
  courseDraft: string;
  pace: string;
  availability: string;
};

export type ValidLearningOnboardingForm = Omit<
  LearningOnboardingFormInput,
  "courseDraft"
> & {
  courses: string[];
};

export type LearningOnboardingDataStatus = {
  profiles: number;
  goals: number;
  courses: number;
  plans: number;
  sessions: number;
  activities: number;
};

type LearningOnboardingDataClient = {
  from: (table: string) => any;
};

export const profileOnboardingCompletionKeyColumn = "id";

const protectedLearningOnboardingPaths = [
  "/dashboard/learning",
  "/dashboard/today",
];

const requiredOnboardingFields: Array<{
  key: keyof LearningOnboardingFormInput;
  label: string;
}> = [
  { key: "preferredName", label: "Preferred name" },
  { key: "learnerType", label: "Learner type" },
  { key: "gradeLevel", label: "Grade / level" },
  { key: "primaryGoal", label: "Primary learning goal" },
  { key: "pace", label: "Pace" },
  { key: "availability", label: "Availability" },
];

function cleanText(value: string) {
  return value.trim();
}

export function getOnboardingCourseTitles(form: LearningOnboardingFormInput) {
  const courseTitles = [...form.courses, form.courseDraft]
    .map(cleanText)
    .filter(Boolean);

  return Array.from(new Set(courseTitles));
}

export function validateLearningOnboardingForm(
  form: LearningOnboardingFormInput
):
  | { valid: true; value: ValidLearningOnboardingForm }
  | { valid: false; message: string; missingField: string } {
  const missingField = requiredOnboardingFields.find(
    (field) => cleanText(String(form[field.key] || "")).length === 0
  );

  if (missingField) {
    return {
      valid: false,
      missingField: missingField.label,
      message: `${missingField.label} is required before BeastEducation can finish setup.`,
    };
  }

  const courses = getOnboardingCourseTitles(form);

  if (courses.length === 0) {
    return {
      valid: false,
      missingField: "Courses",
      message: "Add at least one course before BeastEducation can finish setup.",
    };
  }

  return {
    valid: true,
    value: {
      preferredName: cleanText(form.preferredName),
      learnerType: cleanText(form.learnerType),
      gradeLevel: cleanText(form.gradeLevel),
      primaryGoal: cleanText(form.primaryGoal),
      courses,
      pace: cleanText(form.pace),
      availability: cleanText(form.availability),
    },
  };
}

export function getOnboardingRedirect({
  isAuthenticated,
  onboardingComplete,
  pathname,
  onboardingPath = "/dashboard/onboarding",
}: {
  isAuthenticated: boolean;
  onboardingComplete?: boolean | null;
  pathname: string;
  onboardingPath?: string;
}) {
  if (!isAuthenticated) return "/login";
  if (
    onboardingComplete === false &&
    isProtectedLearningOnboardingPath(pathname, onboardingPath)
  ) {
    return onboardingPath;
  }
  if (onboardingComplete && pathname === onboardingPath) return "/dashboard/today";

  return null;
}

export function isLearningOnboardingComplete({
  profileComplete,
  sessionComplete,
}: {
  profileComplete?: boolean | null;
  sessionComplete?: boolean | null;
}) {
  return Boolean(profileComplete || sessionComplete);
}

export function isProtectedLearningOnboardingPath(
  pathname: string,
  onboardingPath = "/dashboard/onboarding"
) {
  if (pathname === onboardingPath) return false;

  return protectedLearningOnboardingPaths.some(
    (path) => pathname === path || pathname.startsWith(`${path}/`)
  );
}

export function hasCompleteLearningOnboardingData(
  status: LearningOnboardingDataStatus
) {
  return (
    status.profiles > 0 &&
    status.goals > 0 &&
    status.courses > 0 &&
    status.plans > 0 &&
    status.sessions > 0 &&
    status.activities > 0
  );
}

export function shouldAttemptLearningOnboardingRepair({
  onboardingComplete,
  status,
  statusError,
  repairAlreadyAttempted,
}: {
  onboardingComplete: boolean;
  status: LearningOnboardingDataStatus;
  statusError?: unknown;
  repairAlreadyAttempted: boolean;
}) {
  return (
    !onboardingComplete &&
    !statusError &&
    hasCompleteLearningOnboardingData(status) &&
    !repairAlreadyAttempted
  );
}

export async function loadLearningOnboardingDataStatus(
  client: LearningOnboardingDataClient,
  userId: string
): Promise<{
  status: LearningOnboardingDataStatus;
  error: unknown;
}> {
  const tableChecks = await Promise.all([
    client.from("learning_profiles").select("id").eq("user_id", userId).limit(1),
    client.from("learning_goals").select("id").eq("user_id", userId).limit(1),
    client.from("learning_courses").select("id").eq("user_id", userId).limit(1),
    client.from("learning_plans").select("id").eq("user_id", userId).limit(1),
    client.from("learning_sessions").select("id").eq("user_id", userId).limit(1),
    client.from("learning_activities").select("id").eq("user_id", userId).limit(1),
  ]);
  const [profiles, goals, courses, plans, sessions, activities] = tableChecks;

  return {
    status: {
      profiles: profiles.data?.length || 0,
      goals: goals.data?.length || 0,
      courses: courses.data?.length || 0,
      plans: plans.data?.length || 0,
      sessions: sessions.data?.length || 0,
      activities: activities.data?.length || 0,
    },
    error: tableChecks.find((check) => check.error)?.error || null,
  };
}

export function buildOnboardingCompletionProfileUpdate(
  _onboarding: Pick<ValidLearningOnboardingForm, "preferredName">
) {
  return {
    onboarding_complete: true,
  };
}

export function getOnboardingSaveErrorMessage(step: string, error: unknown) {
  if (error instanceof Error && error.message.trim()) {
    return `Could not save ${step}: ${error.message}`;
  }

  if (
    typeof error === "object" &&
    error !== null &&
    "message" in error &&
    typeof error.message === "string" &&
    error.message.trim()
  ) {
    return `Could not save ${step}: ${error.message}`;
  }

  return `Could not save ${step}. Try again, and BeastEducation will reuse anything already created.`;
}
