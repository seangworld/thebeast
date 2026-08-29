import { createRouteClient } from "@/lib/supabase/server";
import type { User } from "@supabase/supabase-js";
import { getModuleRegistryEntry, type BeastModuleIdentifier } from "./moduleRegistry";
import { isProfessionalAllowedForMember, resolveMemberModuleEntitlement } from "./memberAgeEntitlements";

type AuthenticatedMemberContext = {
  supabase: ReturnType<typeof createRouteClient>;
  user: User;
};

export async function requireMemberModuleEntitlement(
  moduleId: BeastModuleIdentifier,
  authenticated?: AuthenticatedMemberContext
) {
  const supabase = authenticated?.supabase || createRouteClient();
  const authentication = authenticated
    ? { data: { user: authenticated.user }, error: null }
    : await supabase.auth.getUser();
  const { data: { user }, error: authError } = authentication;
  if (authError || !user) return { ok: false as const, status: 401, supabase, user: null };
  const { data: profile, error } = await supabase.from("profiles").select("role,birthday").eq("id", user.id).maybeSingle();
  if (error || !profile) return { ok: false as const, status: 503, supabase, user, profile: null };
  const { data: access } = await supabase
    .from("beast_admin_member_module_access")
    .select("enabled")
    .eq("member_id", user.id)
    .eq("module_id", moduleId)
    .maybeSingle();
  const decision = resolveMemberModuleEntitlement({
    module: moduleId,
    birthday: profile.birthday,
    isAdmin: profile.role === "admin",
    entry: getModuleRegistryEntry(moduleId),
    override: typeof access?.enabled === "boolean" ? access.enabled : undefined,
  });
  return decision.allowed
    ? { ok: true as const, supabase, user, profile, decision }
    : { ok: false as const, status: decision.needsBirthday ? 428 : 403, supabase, user, profile, decision };
}

export async function requireProfessionalEntitlement(
  professionalId: string,
  authenticated?: AuthenticatedMemberContext
) {
  const moduleId = professionalId.startsWith("beastmoney.") ? "money" : professionalId.startsWith("beasthealth.") ? "health" : professionalId.startsWith("beastfusion.") ? "admin" : "learning";
  const result = await requireMemberModuleEntitlement(moduleId, authenticated);
  if (!result.ok) return result;
  const allowed = isProfessionalAllowedForMember(professionalId, result.profile.birthday, result.profile.role === "admin");
  return allowed ? result : { ...result, ok: false as const, status: 403, decision: { ...result.decision, allowed: false, reason: "minor_education_only" as const } };
}
