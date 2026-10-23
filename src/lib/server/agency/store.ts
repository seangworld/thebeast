import { createBeastFusionPublicationClient } from '@/lib/supabase/service';
import { unseal } from '@/lib/server/social/auth';
import { metaRequest } from '@/lib/server/social/providers';
import type { AccountSnapshot } from '@/lib/agencyWorkflow';
export async function agencyAccount(ownerId:string,profileId:string,verifyProvider=false) {
 const db=createBeastFusionPublicationClient();
 const binding=await db.from('beast_marketing_agency_bindings').select('*').eq('owner_id',ownerId).eq('presenter_profile_id',profileId).eq('channel','instagram').maybeSingle();
 if(binding.error||!binding.data?.expected_account_id||!binding.data.expected_username)throw Error('Cole needs an explicitly verified Instagram account binding.');
 const c=await db.from('beast_marketing_social_connections').select('*').eq('owner_id',ownerId).eq('id',binding.data.connection_id).eq('channel','instagram').is('disconnected_at',null).maybeSingle();
 if(c.error||!c.data||c.data.account_id!==binding.data.expected_account_id||c.data.connected_at!==binding.data.connection_version||!/^\d+$/.test(c.data.account_id)||c.data.expires_at&&(!Number.isFinite(Date.parse(c.data.expires_at))||Date.parse(c.data.expires_at)<=Date.now()+60000))throw Error('Account authorization changed or expired. Verify the binding again; publishing is blocked.');
 const account:AccountSnapshot={connectionId:c.data.id,accountId:c.data.account_id,username:binding.data.expected_username,connectedAt:c.data.connected_at};
 const token=unseal(c.data.credentials,ownerId).access_token;
 if(verifyProvider){const live=await metaRequest(account.accountId,token,{fields:'id,username'});if(live.id!==account.accountId||live.username!==account.username)throw Error('Instagram account identity does not match the approved binding.');}
 return {account,token};
}
