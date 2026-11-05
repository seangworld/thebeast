import {createHmac} from 'node:crypto';
import {after,NextRequest,NextResponse} from 'next/server';
import {createAsyncRouteClient} from '@/lib/supabase/server';
import {getSafeAuthDestination,isDisabledBeastUser} from '@/lib/auth/experience';
import {accountMailAdmin,sendQueuedAccountMail} from '@/lib/auth/accountMail/server';
export const runtime='nodejs';
export async function POST(request:NextRequest){
 const started=Date.now();
 const reply=(message:string,status=202)=>NextResponse.json({message},{status,headers:{'Cache-Control':'private, no-store'}});
 if(request.headers.get('origin')!==request.nextUrl.origin)return reply('Request rejected.',403);
 if(!request.headers.get('content-type')?.startsWith('application/json'))return reply('Request rejected.',415);
 if(Number(request.headers.get('content-length')||0)>1024)return reply('Request too large.',413);
 if(process.env.BEAST_ACCOUNT_MAIL_ENABLED!=='true')return reply('Username emails are not enabled. Use the existing account recovery link.',503);
 try{
  const raw=await request.text();if(raw.length>1024)return reply('Request too large.',413);
  const input=JSON.parse(raw),admin=accountMailAdmin();
  if(input.action==='deliver'){
   const client=await createAsyncRouteClient(),result=await client.auth.getUser(),user=result.data.user;
   if(result.error||!user?.email_confirmed_at||isDisabledBeastUser(user))return reply('Sign in with your verified Beast account.',401);
   const allowed=await client.rpc('is_current_beast_session_allowed');if(allowed.error||allowed.data!==true)return reply('Sign in again.',401);
   after(async()=>{try{await sendQueuedAccountMail(user.id,'username_assigned')}catch{console.error('ACCOUNT_MAIL_PROCESSING_UNAVAILABLE')}});
   return reply('Account email request received.');
  }
  if(input.action!=='recover'||typeof input.email!=='string'||input.email.length>254||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.email))return reply('Enter your registered email address.',400);
  const secret=process.env.BEAST_AUTH_RATE_SECRET;if(!secret||secret.length<32)throw Error('CONFIGURATION');
  const network=process.env.VERCEL==='1'?request.headers.get('x-vercel-forwarded-for')||'unknown':'local-shared';
  const notice='If this verified address belongs to a Beast account, check your inbox and spam folder for your username or setup instructions.';
  for(const [value,limit] of [[`mail-network:${network}`,30],[`mail-recipient:${input.email.trim().toLowerCase()}`,3]] as const){
   const attempt=await admin.rpc('beast_auth_attempt',{p_bucket:createHmac('sha256',secret).update(value).digest('hex'),p_limit:limit});if(attempt.error)throw Error('RATE_STORE');if(attempt.data!==true)return reply(notice);
  }
  const queued=await admin.rpc('beast_account_mail_queue_recovery',{p_email:input.email,p_next:getSafeAuthDestination(input.next)});if(queued.error){console.error('ACCOUNT_MAIL_QUEUE_UNAVAILABLE');return reply(notice);}
  // Response timing and content never depend on SMTP delivery or account existence.
  after(async()=>{try{if(typeof queued.data==='string')await sendQueuedAccountMail(queued.data,'username_recovery')}catch{console.error('ACCOUNT_MAIL_PROCESSING_UNAVAILABLE')}});
  return reply(notice);
 }catch{return reply('Account email service is temporarily unavailable. Use login help or retry later.',503)}
 finally{await new Promise(resolve=>setTimeout(resolve,Math.max(0,800-(Date.now()-started))))}
}
