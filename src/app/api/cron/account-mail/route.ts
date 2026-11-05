import {createHash,createHmac,timingSafeEqual} from 'node:crypto';
import {NextRequest,NextResponse} from 'next/server';
import {accountMailAdmin,sendQueuedAccountMail} from '@/lib/auth/accountMail/server';
export const runtime='nodejs';
const json=(body:unknown,status=200)=>NextResponse.json(body,{status,headers:{'Cache-Control':'no-store'}});
function equal(left:string,right:string){return Buffer.byteLength(left)===Buffer.byteLength(right)&&timingSafeEqual(Buffer.from(left),Buffer.from(right))}
async function drain(){
 if(process.env.BEAST_ACCOUNT_MAIL_ENABLED!=='true')return json({disabled:true});
 try{let sent=0;for(let i=0;i<5;i++){if(!await sendQueuedAccountMail())break;sent++}return json({sent})}catch{return json({error:'Account mail processing unavailable'},503)}
}
export async function GET(request:NextRequest){
 const expected=process.env.CRON_SECRET,header=request.headers.get('authorization');
 if(!expected||!header||!equal(header,'Bearer '+expected))return json({error:'Unauthorized'},401);
 return drain();
}
// Existing pg_net wake-ups contain no reusable secret, account ID, email or
// recipient. Captured signatures expire quickly and each nonce is consumed once.
export async function POST(request:NextRequest){
 const secret=process.env.CRON_SECRET,stamp=request.headers.get('x-beast-mail-time')||'',nonce=request.headers.get('x-beast-mail-nonce')||'',signature=request.headers.get('x-beast-mail-signature')||'';
 if(!secret||!/^\d{10,12}$/.test(stamp)||!/^[a-f0-9-]{36}$/i.test(nonce)||!/^[a-f0-9]{64}$/.test(signature)||Math.abs(Date.now()/1000-Number(stamp))>120||!equal(signature,createHmac('sha256',secret).update(stamp+'.'+nonce).digest('hex')))return json({error:'Unauthorized'},401);
 if(process.env.BEAST_ACCOUNT_MAIL_ENABLED!=='true')return json({disabled:true});
 try{
  const accepted=await accountMailAdmin().rpc('beast_auth_attempt',{p_bucket:createHash('sha256').update('account-mail-wake:'+nonce).digest('hex'),p_limit:1});
  if(accepted.error)throw Error('WAKE_RECEIPT');
  if(accepted.data!==true)return json({replayed:true});
 }catch{return json({error:'Account mail processing unavailable'},503)}
 return drain();
}
