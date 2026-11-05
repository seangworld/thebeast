import {createHash,randomBytes} from 'node:crypto';
export const CANONICAL='grpyzwvgqiwtxadfdtni';
export const LEGACY='zvzcojwjgnedrouilovc';
export const uuid=/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;
export class IdentityError extends Error {constructor(code,status=400){super(code);this.code=code;this.status=status}}
export const digest=value=>createHash('sha256').update(value).digest('hex');
export const nonce=()=>randomBytes(32).toString('base64url');
export function bearer(req){const m=/^Bearer ([A-Za-z0-9_.-]+)$/.exec(req.headers.authorization||'');if(!m||m[1].length>12000)throw new IdentityError('AUTH_REQUIRED',401);return m[1]}
export function sameOrigin(req,origin){const allowed=typeof origin==='string'?origin.split(',').map(x=>x.trim()):[];if(!allowed.length||allowed.some(x=>{const u=new URL(x);return u.origin!==x||(u.protocol!=='https:'&&!['127.0.0.1','localhost'].includes(u.hostname))})||!allowed.includes(req.headers.origin))throw new IdentityError('ORIGIN_DENIED',403)}
export function createVerifier({canonicalKey,legacyKey,fetcher=fetch,now=()=>Date.now(),requireAccountSetup=false}){
 return async function verify(token,project,{fresh=false}={}){
  if(![CANONICAL,LEGACY].includes(project))throw new IdentityError('WRONG_ISSUER',401);
  if(typeof token!=='string'||token.length>12000)throw new IdentityError('AUTH_REQUIRED',401);
  const key=project===CANONICAL?canonicalKey:legacyKey;if(!key)throw new IdentityError('IDENTITY_NOT_CONFIGURED',503);
  const base='https://'+project+'.supabase.co';
  // Authenticate against the fixed issuer. Decoded claims below are never trusted
  // until the Auth service has verified this exact token.
  const response=await fetcher(base+'/auth/v1/user',{headers:{apikey:key,Authorization:'Bearer '+token},signal:AbortSignal.timeout(8000)});
  if(!response.ok)throw new IdentityError(response.status===429||response.status>=500?'AUTH_TEMPORARILY_UNAVAILABLE':'AUTH_INVALID',response.status===429||response.status>=500?503:401);
  const user=await response.json();let claims;
  try{claims=JSON.parse(Buffer.from(token.split('.')[1],'base64url').toString())}catch{throw new IdentityError('AUTH_INVALID',401)}
  if(user.app_metadata?.is_disabled===true||String(user.app_metadata?.account_status||'').toLowerCase()==='disabled')throw new IdentityError('ACCOUNT_DISABLED',403);
  if(project===CANONICAL){const control=await fetcher(base+'/rest/v1/rpc/is_current_beast_session_allowed',{method:'POST',headers:{apikey:key,Authorization:'Bearer '+token,'Content-Type':'application/json'},body:'{}',signal:AbortSignal.timeout(8000)});if(!control.ok)throw new IdentityError('SESSION_CONTROL_UNAVAILABLE',503);if(await control.json()!==true)throw new IdentityError('FRESH_SIGN_IN_REQUIRED',401)}
  const seconds=now()/1000;
  if(!uuid.test(user.id||'')||user.id!==claims.sub||claims.iss!==base+'/auth/v1'||claims.aud!=='authenticated'||claims.role!=='authenticated'||claims.exp<=seconds||!Number.isFinite(claims.exp)||!uuid.test(claims.session_id||'')||user.is_anonymous||(!user.email_confirmed_at&&!user.phone_confirmed_at)||Date.parse(user.banned_until||'')>now())throw new IdentityError('AUTH_INVALID',401);
  const authAt=Math.max(0,...(Array.isArray(claims.amr)?claims.amr:[]).filter(a=>['password','otp','oauth','totp','mfa/totp'].includes(a.method)).map(a=>Number(a.timestamp)||0));
  if(fresh&&(authAt<seconds-300||authAt>seconds+30))throw new IdentityError('REAUTH_REQUIRED',401);
  if(project===CANONICAL&&requireAccountSetup){
   const setup=await fetcher(base+'/rest/v1/rpc/beast_auth_account_setup_complete',{method:'POST',headers:{apikey:key,Authorization:'Bearer '+token,'Content-Type':'application/json'},body:'{}',signal:AbortSignal.timeout(8000)});
   if(!setup.ok)throw new IdentityError('ACCOUNT_SETUP_UNAVAILABLE',503);
   if(await setup.json()!==true)throw new IdentityError('ACCOUNT_SETUP_REQUIRED',403);
  }
  return Object.freeze({id:user.id,session:claims.session_id,authAt,project});
 };
}
