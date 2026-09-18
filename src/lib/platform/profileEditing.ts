import type { Profile } from "../types/database";

export const profileFieldLabels = {
  preferred_name: "Preferred name", display_name: "Display name", full_name: "Full name", username: "Username / handle",
  birthday: "Birthday", location: "Location", timezone: "Timezone", household_context: "Family or household context", bio: "About you",
  current_academic_level: "Current academic level", career_interests: "Career interests", learning_preferences: "Learning preferences",
  learning_availability: "Time available for learning", learning_strengths: "Strengths", learning_help_areas: "Areas you want help with",
} as const;
export type ProfileField = keyof typeof profileFieldLabels;
export type ProfileForm = Record<ProfileField, string>;
export type EditableProfile = Pick<Profile, ProfileField | "id" | "updated_at">;
export const profileFields = Object.keys(profileFieldLabels) as ProfileField[];
export const profileEditColumns = ["id", "updated_at", ...profileFields].join(",");
export function profileToForm(profile?: Partial<EditableProfile> | null): ProfileForm {
  return Object.fromEntries(profileFields.map(key => [key, profile?.[key] || ""])) as ProfileForm;
}
export function profileChanges(form: ProfileForm, original: ProfileForm) {
  return Object.fromEntries(profileFields.filter(key => form[key].trim() !== original[key].trim()).map(key => [key, form[key].trim() || null])) as Partial<Record<ProfileField, string | null>>;
}
export function profileFieldLimit(key: ProfileField) {
  return ["household_context", "bio", "career_interests", "learning_preferences", "learning_strengths", "learning_help_areas"].includes(key) ? 4000 : 200;
}
export function profileChangeError(patch: Partial<Record<ProfileField, string | null>>, today = new Date()) {
  for (const key of profileFields) {
    const value = patch[key];
    if (value && value.length > profileFieldLimit(key)) return `${profileFieldLabels[key]} must be ${profileFieldLimit(key)} characters or fewer.`;
  }
  if (patch.birthday) {
    const day = patch.birthday;
    const date = new Date(`${day}T12:00:00Z`);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(day) || !Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== day || day > today.toISOString().slice(0, 10)) return "Choose a valid birthday that is not in the future.";
  }
  if (patch.timezone) {
    try { new Intl.DateTimeFormat("en-US", { timeZone: patch.timezone }).format(today); }
    catch { return "Choose a valid timezone, such as America/New_York, or use your device timezone."; }
  }
  return null;
}
export function profileAge(birthday: string, today = new Date()) {
  if (!birthday || profileChangeError({ birthday }, today)) return null;
  const [year, month, day] = birthday.split("-").map(Number);
  return today.getFullYear() - year - (today.getMonth() + 1 < month || (today.getMonth() + 1 === month && today.getDate() < day) ? 1 : 0);
}
