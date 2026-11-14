import {requiredProfileError,signupProfile} from '../server/identity/account-profile.js';
import {guideVerificationCallback} from '../src/auth-continuity.js';
import {createHmac,randomUUID} from 'node:crypto';
import {createClient} from '@supabase/supabase-js';
import {AUTH_FAILURE,REGISTRATION_NOTICE,normalizeUsername,validPassword} from '../server/auth/policy.js';
const canonical='https://grpyzwvgqiwtxadfdtni.supabase.co';
const disabled=u=>u?.app_metadata?.is_disabled===true||String(u?.app_metadata?.account_status||'').toLowerCase()==='disabled';
// Standalone adapter of the released BeastOS gateway. Same private registry,
// persistent limits, managed password verification and session-control policy.
// Only the same-origin app receives its own session, never a resolved email.
export function createUniversalHandler({env=process.env,client=createClient,delay=ms=>new Promise(r=>setTimeout(r,ms)),originAllowed=req=>Boolean(req.headers.origin)&&req.headers.origin===env.BEAST_AUTH_ORIGIN}={}){return async(req,res)=>{
 res.setHeader('Cache-Control','no-store');res.setHeader('Content-Type','application/json');
 const reply=(status,message,extra={})=>{res.statusCode=status;res.end(JSON.stringify({message,...extra}))};
 if(env.BEAST_UNIVERSAL_AUTH_ENABLED!=='true')return reply(503,'Authentication is unavailable.');
 if(req.method!=='POST')return reply(405,'Request rejected.');
 if(!originAllowed(req))return reply(403,'Request rejected.');
 if(!String(req.headers['content-type']||'').startsWith('application/json'))return reply(415,'Request rejected.');
 if(Number(req.headers['content-length']||0)>8192)return reply(413,'Request too large.');
 const started=Date.now();let phase='configuration';
 try{
  const raw=typeof req.body==='string'?req.body:JSON.stringify(req.body||{});if(Buffer.byteLength(raw)>8192)return reply(413,'Request too large.');
  const input=JSON.parse(raw),username=normalizeUsername(input.username),action=input.action;
  if(!username||!['login','register','resend','availability'].includes(action))return reply(400,'Use a username of 3–32 letters, numbers or underscores, starting with a letter.');
  if(env.BEAST_IDENTITY_URL!==canonical||!env.BEAST_CANONICAL_PUBLISHABLE_KEY||!env.BEAST_CANONICAL_AUTH_SERVICE_KEY||!env.BEAST_AUTH_RATE_SECRET||env.BEAST_AUTH_RATE_SECRET.length<32)throw Error('Configuration');
  const opts={auth:{persistSession:false,autoRefreshToken:false}};
  const admin=client(canonical,env.BEAST_CANONICAL_AUTH_SERVICE_KEY,opts),auth=client(canonical,env.BEAST_CANONICAL_PUBLISHABLE_KEY,opts);
  const network=env.VERCEL==='1'?req.headers['x-vercel-forwarded-for']||'unknown':'local-shared';phase='rate_limit';
  for(const [value,limit] of [[`network:${network}`,30],[`${action==='availability'?'availability':'username'}:${username}`,10]]){
   const bucket=createHmac('sha256',env.BEAST_AUTH_RATE_SECRET).update(value).digest('hex');const {data,error}=await admin.rpc('beast_auth_attempt',{p_bucket:bucket,p_limit:limit});if(error)throw error;if(data!==true)return reply(429,'Please wait before trying again.');
  }
  if(action==='availability'){
   const found=await admin.rpc('beast_auth_identity',{p_username:username});if(found.error)throw found.error;
   return reply(200,found.data?'That username is unavailable. Choose another one.':'That username is available. It is reserved only when setup succeeds.');
  }
  if(action==='resend'){
   if(typeof input.email!=='string'||input.email.length>254||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.email))return reply(400,'Enter a valid email address.');
   await auth.auth.resend({type:'signup',email:input.email,options:{emailRedirectTo:guideVerificationCallback(env.BEAST_AUTH_ORIGIN,input.next)}});
   return reply(200,'If verification is pending, a new email will be sent. Check your inbox and spam folder.');
  }
  if(action==='register'&&!validPassword(input.password))return reply(400,'Use at least 12 characters and at most 72 UTF-8 bytes.');
  if(typeof input.password!=='string'||!input.password||input.password.length>128)return reply(401,AUTH_FAILURE);
  if(input.captchaToken!==undefined&&typeof input.captchaToken!=='string')return reply(400,'Invalid security check.');
  if(env.BEAST_AUTH_CAPTCHA_REQUIRED==='true'&&!input.captchaToken)return reply(400,'Complete the security check.');
  if(action==='register'){
   if(env.BEAST_PUBLIC_REGISTRATION_ENABLED!=='true')return reply(503,'Registration is unavailable.');
   if(typeof input.email!=='string'||input.email.length>254||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.email))return reply(400,'Enter a valid email address.');
   const profileError=requiredProfileError(input.name,input.birthday);if(profileError)return reply(400,profileError);
   const available=await admin.rpc('beast_auth_identity',{p_username:username});if(available.error)throw available.error;
   if(available.data)return reply(409,'That username is unavailable. Choose another one.');
   const result=await auth.auth.signUp({email:input.email,password:input.password,options:{captchaToken:input.captchaToken,data:{beast_username:username,beast_setup_profile:signupProfile(input.name,input.birthday)},emailRedirectTo:guideVerificationCallback(env.BEAST_AUTH_ORIGIN,input.next)}});
   if(result.error&&!['user_already_exists','email_exists'].includes(result.error.code||''))throw Error('Registration service');
   return reply(200,REGISTRATION_NOTICE);
  }
  phase='identity_resolution';const identity=await admin.rpc('beast_auth_identity',{p_username:username});if(identity.error)throw identity.error;
  const account=identity.data?await admin.auth.admin.getUserById(identity.data):null;if(account?.error)throw account.error;
  const email=account?.data?.user?.email||`${randomUUID()}@invalid.example`;phase='password_verification';
  const signed=await auth.auth.signInWithPassword({email,password:input.password,options:{captchaToken:input.captchaToken}});
  if(signed.error||!identity.data||signed.data.user?.id!==identity.data||!signed.data.user?.email_confirmed_at||disabled(signed.data.user)){
   if(signed.data.session)await auth.auth.signOut({scope:'local'});return reply(401,AUTH_FAILURE);
  }
  const control=await auth.rpc('is_current_beast_session_allowed');if(control.error||control.data!==true){await auth.auth.signOut({scope:'local'});return reply(401,AUTH_FAILURE)}
  return reply(200,'Signed in.',{session:{access_token:signed.data.session.access_token,refresh_token:signed.data.session.refresh_token}});
 }catch{console.error('BeastGuide auth gateway unavailable',{phase});return reply(503,'Authentication is temporarily unavailable.');}
 finally{await delay(Math.max(0,800-(Date.now()-started)))}
}}
export default createUniversalHandler();
