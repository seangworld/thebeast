import {
  BEASTOS_TIME_ZONE,
  getBeastRuntimeDateParts,
} from "../runtimeDate";

export type HealthAdvisorIdentityProfile = {
  preferred_name?: string | null;
  display_name?: string | null;
  full_name?: string | null;
  username?: string | null;
  timezone?: string | null;
};

type HealthAdvisorAuthIdentity = {
  user_metadata?: Record<string, unknown> | null;
} | null | undefined;

function cleanText(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

export function resolveHealthAdvisorMemberName(
  profile?: HealthAdvisorIdentityProfile | null,
  user?: HealthAdvisorAuthIdentity
) {
  const metadata = user?.user_metadata;
  return (
    cleanText(profile?.preferred_name) ||
    cleanText(profile?.display_name) ||
    cleanText(profile?.full_name) ||
    cleanText(profile?.username) ||
    cleanText(metadata?.preferred_name) ||
    cleanText(metadata?.display_name) ||
    cleanText(metadata?.full_name)
  );
}

function resolveTimeZone(timeZone?: string | null) {
  const candidate = cleanText(timeZone) || BEASTOS_TIME_ZONE;
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: candidate }).format();
    return candidate;
  } catch {
    return BEASTOS_TIME_ZONE;
  }
}

function firstName(value?: string | null) {
  return cleanText(value)?.split(/\s+/)[0] || null;
}

export function buildHealthAdvisorGreeting(input: {
  memberName?: string | null;
  now: Date;
  timeZone?: string | null;
}) {
  const hour = getBeastRuntimeDateParts(
    input.now,
    resolveTimeZone(input.timeZone)
  ).hour;
  const period =
    hour < 12
      ? "Good morning"
      : hour < 18
        ? "Good afternoon"
        : "Good evening";
  const name = firstName(input.memberName);
  return name ? `${period}, ${name}.` : `${period}.`;
}

export const healthAdvisorIntroduction =
  "I’m your Health Advisor. I’d like to understand your health history so I can help you organize records and prepare for appointments.";

function plural(value: number, singular: string) {
  return `${value} ${singular}${value === 1 ? "" : "s"}`;
}

export function buildHealthAdvisorDataState(input: {
  totalRecords: number;
  populatedAreas: number;
  medicationCount: number;
  appointmentCount: number;
}) {
  if (input.totalRecords === 0) {
    return "No health records are saved yet. I will not infer a health history. We can begin naturally through conversation.";
  }

  const includedCounts = [
    input.medicationCount
      ? plural(input.medicationCount, "medication")
      : null,
    input.appointmentCount
      ? plural(input.appointmentCount, "appointment")
      : null,
  ].filter((item): item is string => Boolean(item));
  const included = includedCounts.length
    ? `, including ${includedCounts.join(" and ")}`
    : "";

  return `${plural(input.totalRecords, "saved health record")} across ${plural(
    input.populatedAreas,
    "health area"
  )}${included}. This reflects saved records only; no trends or clinical conclusions are inferred.`;
}
