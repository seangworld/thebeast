import type { SupabaseClient } from "@supabase/supabase-js";
import { claimStages, claimTypes, validateVeteranClaim, veteranClaimFromRow, type VeteranClaim } from "./veteranClaims";
type Client = Pick<SupabaseClient, "auth" | "from">;
export async function loadVeteranClaims(client: Client) {
  const { data: auth, error } = await client.auth.getUser();
  if (error || !auth.user) throw new Error("Sign in again to load your claims.");
  const result = await client.from("beast_veteran_claims").select("*").eq("owner_id", auth.user.id).order("updated_at", { ascending: false }).limit(201);
  if (result.error || !result.data) throw new Error("Claims could not be loaded. Refresh to try again.");
  if (result.data.length > 200) throw new Error("This workspace currently supports viewing up to 200 claims. Contact support to review your records.");
  if(result.data.some(row=>row.owner_id!==auth.user.id))throw new Error("Claims could not be loaded. Refresh to try again.");
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
  const saved = veteranClaimFromRow(data);
  if (saved.title !== payload.title || saved.claimType !== claim.claimType || saved.stage !== claim.stage || saved.nextActionDate !== claim.nextActionDate
    || (['serviceContext','impactNotes','timeline','nextAction','statement'] as const).some(key=>saved.details[key]!==claim.details[key])
    || Object.keys(claim.details.evidence).some(key=>{const k=key as keyof typeof claim.details.evidence;return saved.details.evidence[k].status!==claim.details.evidence[k].status || saved.details.evidence[k].reference!==claim.details.evidence[k].reference;})) throw new Error('Could not confirm the saved content. Your edits are still here. Reload to check it before retrying.');
  return saved;
}

/** Caller has already authenticated; independently confirm returned owner and identity. */
export async function loadSelectedVeteranClaim(client: Client, ownerId: string, id: unknown) {
  if (typeof id !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) throw new Error('Selected claim unavailable.');
  const {data,error}=await client.from('beast_veteran_claims').select('id,owner_id,title,claim_type,stage,next_action_date,details,revision,updated_at').eq('id',id).eq('owner_id',ownerId).maybeSingle();
  if(error || !data || data.id!==id || data.owner_id!==ownerId || !Number.isSafeInteger(data.revision) || data.revision<1 || !Object.hasOwn(claimStages,String(data.stage)) || !Object.hasOwn(claimTypes,String(data.claim_type)))throw new Error('Selected claim unavailable.');
  const claim=veteranClaimFromRow(data);
  if(validateVeteranClaim(claim))throw new Error('Selected claim unavailable.');
  return {claim,updatedAt:typeof data.updated_at==='string'?data.updated_at:null};
}
