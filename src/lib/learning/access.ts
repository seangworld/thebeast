type LearningNavigationAccessInput = {
  role?: string | null;
  birthday?: string | null;
  learnerRole?: string | null;
  gradeLevel?: string | null;
};

const studentLearnerRoles = new Set([
  "student",
  "parent-supported learner",
  "parent supported learner",
]);

const under18AcademicLevels = new Set([
  "elementary",
  "middle school",
  "high school",
]);

const restrictedLearningOnlyPathPrefixes = [
  "/dashboard/admin",
  "/dashboard/billing",
  "/dashboard/cashflow",
  "/dashboard/debts",
  "/dashboard/health",
  "/dashboard/money",
  "/dashboard/projects",
  "/dashboard/velocity",
];

function normalizeAccessValue(value?: string | null) {
  return (value || "").trim().toLowerCase();
}

export function getAgeFromBirthday(birthday?: string | null, today = new Date()) {
  if (!birthday) return null;

  const birthDate = new Date(`${birthday}T00:00:00`);
  if (Number.isNaN(birthDate.getTime())) return null;

  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDelta = today.getMonth() - birthDate.getMonth();
  const hasNotHadBirthdayThisYear =
    monthDelta < 0 ||
    (monthDelta === 0 && today.getDate() < birthDate.getDate());

  if (hasNotHadBirthdayThisYear) age -= 1;

  return age;
}

export function shouldUseLearningOnlyNavigation(
  access: LearningNavigationAccessInput
) {
  if (normalizeAccessValue(access.role) === "admin") return false;

  const age = getAgeFromBirthday(access.birthday);
  if (age !== null && age < 18) return true;

  if (studentLearnerRoles.has(normalizeAccessValue(access.learnerRole))) {
    return true;
  }

  return under18AcademicLevels.has(normalizeAccessValue(access.gradeLevel));
}

export function isRestrictedForLearningOnlyNavigation(pathname: string) {
  return restrictedLearningOnlyPathPrefixes.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );
}
