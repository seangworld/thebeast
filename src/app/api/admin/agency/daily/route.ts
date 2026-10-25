import {socialOwner,socialJson} from '@/lib/server/social/auth';
import {agencyWriteOwner} from '@/lib/server/agency/auth';
import {requireSupabasePublicConfiguration} from '@/lib/supabase/config';
import {dailySnapshot,dailyControl,prepareDaily,scheduleDaily,rejectDaily,publishDaily} from '@/lib/server/agency/daily';
import {isUuid} from '@/lib/marketingSocial';
export const dynamic='force-dynamic';export const runtime='nodejs';export const maxDuration=300;
export async function GET(){const owner=await socialOwner();if(!owner)return socialJson({error:'Owner access required.'},403);try{return socialJson(await dailySnapshot(owner.id));}catch{return socialJson({error:'Daily workflow data unavailable. No state inferred.'},503);}}
export async function POST(request:Request){
 const owner=await agencyWriteOwner(request,{env:process.env,getEffectiveSupabaseUrl:()=>requireSupabasePublicConfiguration().url,socialOwner});if(!owner)return socialJson({error:'Owner access required.'},403);
 const b=await request.json().catch(()=>null);
 try{
  if(b?.action==='enable'){await dailyControl(owner.id,true);return socialJson(await prepareDaily(owner.id));}
  if(b?.action==='pause'){await dailyControl(owner.id,false);return socialJson({status:'paused'});}
  if(b?.action==='prepare')return socialJson(await prepareDaily(owner.id));
  if(!isUuid(b?.jobId))throw Error('Choose a saved daily draft.');
  if(b.action==='continue'&&b.confirm===true)return socialJson(await publishDaily(owner.id,b.jobId,true));
  if(b.action==='reject'){await rejectDaily(owner.id,b.jobId);return socialJson({status:'rejected'});}
  if(b.action==='schedule'&&Number.isSafeInteger(b.revision)&&typeof b.username==='string')return socialJson(await scheduleDaily(owner.id,b.jobId,b.revision,b.username,b.reviewed===true));
  throw Error('Unsupported daily action.');
 }catch(e){return socialJson({error:e instanceof Error?e.message:'Daily action unconfirmed.'},409);}
}
