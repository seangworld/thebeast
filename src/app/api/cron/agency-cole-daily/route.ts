import {verifyCronAuthorization} from '@/lib/standingObservation';
import {requireSupabasePublicConfiguration} from '@/lib/supabase/config';
import {AGENCY_PRODUCTION_SUPABASE_REF} from '@/lib/server/agency/auth';
import {createBeastFusionPublicationClient} from '@/lib/supabase/service';
import {prepareDaily,publishDaily} from '@/lib/server/agency/daily';
import {nyHour} from '@/lib/agencyDaily';
import {socialJson} from '@/lib/server/social/auth';
export const dynamic='force-dynamic';export const runtime='nodejs';export const maxDuration=300;
export async function GET(request:Request){
 if(!verifyCronAuthorization(request.headers.get('authorization'),process.env.CRON_SECRET))return socialJson({error:'Not authorized.'},401);
 if(process.env.VERCEL_ENV!=='production'||requireSupabasePublicConfiguration().url!==`https://${AGENCY_PRODUCTION_SUPABASE_REF}.supabase.co`)return socialJson({error:'Production only.'},403);
 const phase=new URL(request.url).searchParams.get('phase');if(phase!=='prepare'&&phase!=='publish')return socialJson({error:'Unknown phase.'},400);
 // Two UTC slots cover DST. Only the matching New York hour may run; the
 // durable per-day claim and exact scheduled approval prevent duplicate work.
 if(nyHour(new Date())!==(phase==='prepare'?6:18))return socialJson({status:'outside_new_york_window'});
 const service=createBeastFusionPublicationClient(),c=await service.from('agency_cole_daily_controls').select('owner_id').eq('enabled',true).eq('paused',false);if(c.error)return socialJson({error:'Daily controls unavailable.'},503);
 let completed=0,held=0;
 for(const row of c.data){try{if(phase==='prepare'){await prepareDaily(row.owner_id);}else{const jobs=await service.from('agency_cole_daily_jobs').select('id').eq('owner_id',row.owner_id).eq('state','scheduled').lte('scheduled_for',new Date().toISOString());if(jobs.error)throw Error('Queue unavailable');for(const j of jobs.data)await publishDaily(row.owner_id,j.id);}completed++;}catch{held++;}}
 return socialJson({completed,held,mode:'approval_required'});
}
