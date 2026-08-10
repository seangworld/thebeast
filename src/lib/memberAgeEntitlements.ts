import type { BeastModuleIdentifier, BeastModuleRegistryEntry } from "./moduleRegistry";

export type MemberAgeStatus = "minor" | "adult" | "unknown";

export function calculateMemberAge(birthday: string | null | undefined, asOf = new Date()): number | null {
  if (!birthday || !/^\d{4}-\d{2}-\d{2}$/.test(birthday)) return null;
  const dob = new Date(`${birthday}T00:00:00Z`);
  if (Number.isNaN(dob.getTime()) || dob > asOf) return null;
  let age = asOf.getUTCFullYear() - dob.getUTCFullYear();
  const beforeBirthday = asOf.getUTCMonth() < dob.getUTCMonth() ||
    (asOf.getUTCMonth() === dob.getUTCMonth() && asOf.getUTCDate() < dob.getUTCDate());
  if (beforeBirthday) age -= 1;
  return age >= 0 ? age : null;
}

export function classifyMemberAge(birthday: string | null | undefined, asOf = new Date()): MemberAgeStatus {
  const age = calculateMemberAge(birthday, asOf);
  return age === null ? "unknown" : age < 18 ? "minor" : "adult";
}

export type MemberModuleEntitlement = {
  allowed: boolean;
  ageStatus: MemberAgeStatus;
  reason: "admin" | "visible" | "minor_education_only" | "unknown_age" | "module_unavailable" | "member_override";
  needsBirthday: boolean;
};

export function resolveMemberModuleEntitlement({
  module,
  birthday,
  isAdmin = false,
  simulatingMember = false,
  entry,
  override,
  asOf,
}: {
  module: BeastModuleIdentifier;
  birthday?: string | null;
  isAdmin?: boolean;
  simulatingMember?: boolean;
  entry?: BeastModuleRegistryEntry;
  override?: boolean;
  asOf?: Date;
}): MemberModuleEntitlement {
  const ageStatus = classifyMemberAge(birthday, asOf);
  const effectiveAdmin = isAdmin && !simulatingMember;
  if (effectiveAdmin) return { allowed: true, ageStatus, reason: "admin", needsBirthday: false };
  if (!entry?.enabled || entry.visibility === "disabled" || entry.visibility === "adminOnly") {
    return { allowed: false, ageStatus, reason: "module_unavailable", needsBirthday: false };
  }
  if (override === false) return { allowed: false, ageStatus, reason: "member_override", needsBirthday: false };
  if (ageStatus === "minor" && (entry.minimumAge ?? 18) >= 18) {
    return { allowed: false, ageStatus, reason: "minor_education_only", needsBirthday: false };
  }
  if (ageStatus === "unknown" && (entry.minimumAge ?? 18) >= 18) {
    return { allowed: false, ageStatus, reason: "unknown_age", needsBirthday: true };
  }
  return { allowed: true, ageStatus, reason: "visible", needsBirthday: false };
}

export function isProfessionalAllowedForMember(professionalId: string, birthday?: string | null, isAdmin = false) {
  const status = classifyMemberAge(birthday);
  if (isAdmin || status === "adult") return true;
  return status !== "minor" && status !== "unknown"
    ? true
    : professionalId === "beasteducation.guidance-counselor";
}

