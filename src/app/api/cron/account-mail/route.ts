import {timingSafeEqual} from 'node:crypto';
import {NextRequest,NextResponse} from 'next/server';
import {sendQueuedAccountMail} from '@/lib/auth/accountMail/server';
export const runtime='nodejs';
export async function GET(request:NextRequest){
 const expected=process.env.CRON_SECRET,header=request.headers.get('authorization');
 if(!expected||!header||Buffer.byteLength(header)!==Buffer.byteLength('Bearer '+expected)||!timingSafeEqual(Buffer.from(header),Buffer.from('Bearer '+expected)))return NextResponse.json({error:'Unauthorized'},{status:401});
 if(process.env.BEAST_ACCOUNT_MAIL_ENABLED!=='true')return NextResponse.json({disabled:true},{headers:{'Cache-Control':'no-store'}});
 try{let sent=0;for(let i=0;i<5;i++){if(!await sendQueuedAccountMail())break;sent++}return NextResponse.json({sent},{headers:{'Cache-Control':'no-store'}})}catch{return NextResponse.json({error:'Account mail processing unavailable'},{status:503})}
}
