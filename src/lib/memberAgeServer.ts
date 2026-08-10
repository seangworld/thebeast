import { createRouteClient } from "@/lib/supabase/server";
import { getModuleRegistryEntry, type BeastModuleIdentifier } from "./moduleRegistry";
import { isProfessionalAllowedForMember, resolveMemberModuleEntitlement } from "./memberAgeEntitlements";

export async function requireMemberModuleEntitlement(moduleId: BeastModuleIdentifier) {
  const supabase = createRouteClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return { ok: false as const, status: 401, supabase, user: null };
  const { data: profile, error } = await supabase.from("profiles").select("role,birthday").eq("id", user.id).maybeSingle();
  if (error || !profile) return { ok: false as const, status: 503, supabase, user, profile: null };
  const decision = resolveMemberModuleEntitlement({ module: moduleId, birthday: profile.birthday, isAdmin: profile.role === "admin", entry: getModuleRegistryEntry(moduleId) });
  return decision.allowed
    ? { ok: true as const, supabase, user, profile, decision }
    : { ok: false as const, status: decision.needsBirthday ? 428 : 403, supabase, user, profile, decision };
}

export async function requireProfessionalEntitlement(professionalId: string) {
  const moduleId = professionalId.startsWith("beastmoney.") ? "money" : professionalId.startsWith("beasthealth.") ? "health" : professionalId.startsWith("beastfusion.") ? "admin" : "learning";
  const result = await requireMemberModuleEntitlement(moduleId);
  if (!result.ok) return result;
  const allowed = isProfessionalAllowedForMember(professionalId, result.profile.birthday, result.profile.role === "admin");
  return allowed ? result : { ...result, ok: false as const, status: 403, decision: { ...result.decision, allowed: false, reason: "minor_education_only" as const } };
}
