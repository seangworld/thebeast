import type { SupabaseClient } from "@supabase/supabase-js";
import { validateVeteranClaim, veteranClaimFromRow, type VeteranClaim } from "./veteranClaims";
type Client = Pick<SupabaseClient, "auth" | "from">;
export async function loadVeteranClaims(client: Client) {
  const { data: auth, error } = await client.auth.getUser();
  if (error || !auth.user) throw new Error("Sign in again to load your claims.");
  const result = await client.from("beast_veteran_claims").select("*").eq("owner_id", auth.user.id).order("updated_at", { ascending: false }).limit(201);
  if (result.error || !result.data) throw new Error("Claims could not be loaded. Refresh to try again.");
  if (result.data.length > 200) throw new Error("This workspace currently supports viewing up to 200 claims. Contact support to review your records.");
  return result.data.map(veteranClaimFromRow);
}
export async function saveVeteranClaim(client: Client, claim: VeteranClaim): Promise<VeteranClaim> {
  const invalid = validateVeteranClaim(claim);
  if (invalid) throw new Error(invalid);
  const { data: auth, error: authError } = await client.auth.getUser();
  if (authError || !auth.user) throw new Error("Sign in again before saving your claim.");
  const payload = { title: claim.title.trim(), claim_type: claim.claimType, stage: claim.stage, next_action_date: claim.nextActionDate || null, details: claim.details, revision: claim.revision + 1, updated_at: new Date().toISOString() };
  const query = claim.revision === 0
    ? client.from("beast_veteran_claims").insert({ ...payload, id: claim.id, owner_id: auth.user.id })
    : client.from("beast_veteran_claims").update(payload).eq("id", claim.id).eq("owner_id", auth.user.id).eq("revision", claim.revision);
  const { data, error } = await query.select("*").maybeSingle();
  if (error) throw new Error("Could not confirm the save. Your edits are still here. Reload your claims before retrying if your connection was interrupted.");
  if (!data) throw new Error("This claim changed in another session. Copy your unsaved notes, then reload before editing again.");
  if (data.owner_id !== auth.user.id || data.id !== claim.id || data.revision !== payload.revision) throw new Error("Could not confirm the saved claim. Reload to check it.");
  return veteranClaimFromRow(data);
}
