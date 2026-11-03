import {createHmac} from 'node:crypto';
import {CANONICAL,IdentityError} from './proof.js';
export function registrationAdapter({pool,key,salt,validated=false,fetcher=fetch}){
 if(!validated||!key||!salt||salt.length<32)return null;
 return {async createBeastGuideUser(input){
  const emailHash=createHmac('sha256',salt).update(input.email.trim().toLowerCase()).digest('hex');
  // Persisted global and per-address caps also bound failed/retried admin calls.
  for(const [bucket,cap] of [['global',60],['email:'+emailHash,3]]){
   const r=await pool.query("insert into beastguide_identity.registration_budget(bucket,window_start,attempts) values($1,date_trunc('hour',now()),1) on conflict(bucket,window_start) do update set attempts=beastguide_identity.registration_budget.attempts+1 where beastguide_identity.registration_budget.attempts<$2 returning attempts",[bucket,cap]);
   if(!r.rows.length)throw new IdentityError('REGISTRATION_TRY_LATER',429);
  }
  const r=await fetcher('https://'+CANONICAL+'.supabase.co/auth/v1/admin/users',{method:'POST',headers:{apikey:key,Authorization:'Bearer '+key,'Content-Type':'application/json'},body:JSON.stringify({email:input.email.trim(),app_metadata:{beastguide_only:true},email_confirm:false}),signal:AbortSignal.timeout(8000)});
  if(!r.ok){const body=await r.json().catch(()=>({}));if(!['email_exists','user_already_exists'].includes(body.code))throw new IdentityError('REGISTRATION_UNAVAILABLE',503)}
 }};
}
