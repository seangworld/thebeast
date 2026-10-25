import {createHash} from 'node:crypto';
import {createBeastFusionPublicationClient} from '@/lib/supabase/service';
import {COLE_DAILY,dailyCreative,nyDay,nyMonth,nextPostingTime,requestQuote,safeDailyReason,generationUsage,providerFailure,type GenerationUsage} from '@/lib/agencyDaily';
import {talentAppearance} from '@/lib/agencyAppearance';
import {agencyAccount} from './store';
import {approvalFingerprint,assertApproved,digest,profileFingerprint,publishAgencyRevision,type AgencyPost} from '@/lib/agencyWorkflow';
import {metaRequest} from '@/lib/server/social/providers';
const bucket='beast-marketing-media';
const hash=(b:Uint8Array)=>createHash('sha256').update(b).digest('hex');
const db=()=>createBeastFusionPublicationClient();
const now=()=>new Date().toISOString();
export async function coleProfile(ownerId:string){const r=await db().from('beast_marketing_presenter_profiles').select('*').eq('owner_id',ownerId).eq('name','Cole Mercer').eq('presenter_type','future_character').single();if(r.error||!r.data)throw Error('Cole profile unavailable.');return r.data;}
export async function dailySnapshot(ownerId:string){
 const service=db(),month=nyMonth(new Date()),[c,j,r,u]=await Promise.all([service.from('agency_cole_daily_controls').select('*').eq('owner_id',ownerId).maybeSingle(),service.from('agency_cole_daily_jobs').select('*,post:beast_marketing_agency_posts(revision,status,published_at)').eq('owner_id',ownerId).order('local_day',{ascending:false}).limit(31),service.from('agency_cole_ai_reservations').select('job_id,month,state,maximum_micros,settled_micros,usage_counts').eq('owner_id',ownerId).eq('month',month),service.from('agency_cole_ai_reservations').select('id').eq('owner_id',ownerId).in('state',['dispatched','uncertain']).limit(1)]);
 if(c.error||j.error||r.error||u.error)throw Error('Daily workflow unavailable.');
 const current=r.data;
 const today=nyDay(new Date()),todayJob=j.data.find(x=>x.local_day===today);
 const canPrepareToday=!!c.data?.enabled&&!c.data.paused&&(!todayJob||todayJob.state==='blocked'&&todayJob.reason==='request_cost_bound_unverified'&&!current.some(x=>x.job_id===todayJob.id));
 return {control:c.data,jobs:j.data,month,canPrepareToday,generationConfigured:!!process.env.OPENAI_API_KEY?.trim(),cronConfigured:!!process.env.CRON_SECRET?.trim(),spentMicros:current.reduce((s,x)=>s+(x.settled_micros??0),0),reservedMicros:current.filter(x=>['reserved','dispatched','uncertain'].includes(x.state)).reduce((s,x)=>s+x.maximum_micros,0),spendingRecords:current.map(r=>({jobId:r.job_id,state:r.state,estimateMicros:r.maximum_micros,costMicros:r.settled_micros,usage:r.usage_counts})),unresolved:!!u.data?.length,limitMicros:COLE_DAILY.monthlyLimitMicros,nextPostingTime:nextPostingTime(new Date()),pricing:{model:COLE_DAILY.model,checked:COLE_DAILY.pricingChecked,source:COLE_DAILY.pricingSource,reservationEstimateMicros:COLE_DAILY.reservationEstimateMicros,estimate:COLE_DAILY.estimate,billingOverrunPossible:true},today:nyDay(new Date())};
}
export async function dailyControl(ownerId:string,enable:boolean){
 const p=await coleProfile(ownerId),service=db();
 const prior=await service.from('agency_cole_daily_controls').select('*').eq('owner_id',ownerId).maybeSingle();if(prior.error)throw Error('Daily control unavailable.');
 if(enable&&['usage_unverified','reservation_exceeded'].includes(prior.data?.hold_reason))throw Error('Reconcile generation usage before resuming.');
 if(enable){const {account}=await agencyAccount(ownerId,p.id,true);if(account.username!==COLE_DAILY.username)throw Error('Cole binding differs.');}
 let reason:string|null=['usage_unverified','reservation_exceeded'].includes(prior.data?.hold_reason)?prior.data.hold_reason:null;
 if(!reason)try{requestQuote(new Date());}catch(e){reason=safeDailyReason(e);}
 const payload={owner_id:ownerId,presenter_profile_id:p.id,enabled:enable,paused:!enable,epoch:(prior.data?.epoch??0)+1,hold_reason:reason,updated_at:now()};
 const saved=prior.data?await service.from('agency_cole_daily_controls').update(payload).eq('owner_id',ownerId).eq('epoch',prior.data.epoch).select('owner_id').maybeSingle():await service.from('agency_cole_daily_controls').insert(payload).select('owner_id').single();
 if(saved.error||!saved.data)throw Error('Control changed. Refresh.');
 // Epoch also revokes scheduled approvals. Resuming never restores them.
 if(!enable){const cancelled=await service.from('beast_marketing_agency_posts').update({status:'cancelled',approval_hash:null,approved_at:null,updated_at:now()}).eq('owner_id',ownerId).eq('presenter_profile_id',p.id).eq('status','approved').in('id',(await service.from('agency_cole_daily_jobs').select('post_id').eq('owner_id',ownerId).eq('state','scheduled')).data?.map(j=>j.post_id)??[]);if(cancelled.error)throw Error('Paused; inspect queued approval cancellation.');}
}
async function active(ownerId:string,epoch:number){const [r,role]=await Promise.all([db().from('agency_cole_daily_controls').select('*').eq('owner_id',ownerId).single(),db().from('profiles').select('role').eq('id',ownerId).single()]);if(r.error||!r.data.enabled||r.data.paused||r.data.epoch!==epoch||role.error||role.data?.role!=='admin')throw Error('paused');return r.data;}
export async function privateDailyImage(ownerId:string,jobId:string){
 const service=db(),r=await service.from('agency_cole_daily_jobs').select('media_path,media_hash,media_bytes').eq('owner_id',ownerId).eq('id',jobId).single();
 if(r.error||!r.data?.media_path?.startsWith(`${ownerId}/agency-daily/`))throw Error('Private image unavailable.');
 const object=await service.storage.from(bucket).download(r.data.media_path,{}, {cache:'no-store'});if(object.error||!object.data||object.data.size!==r.data.media_bytes||object.data.size>8*1024*1024)throw Error('Private image unavailable.');
 const bytes=new Uint8Array(await object.data.arrayBuffer());if(bytes[0]!==255||bytes[1]!==216||hash(bytes)!==r.data.media_hash)throw Error('Private image checksum mismatch.');return bytes;
}
function rpcFailure(error:{message?:string}|null,fallback:string){const message=error?.message??'';for(const code of ['budget_exhausted','spending_unresolved','paused','job_changed','day_changed'])if(message===code)return Error(code);return Error(fallback);}
async function maySaveGeneratedDraft(ownerId:string,epoch:number,jobId:string){
 const [control,role,job]=await Promise.all([db().from('agency_cole_daily_controls').select('*').eq('owner_id',ownerId).single(),db().from('profiles').select('role').eq('id',ownerId).single(),db().from('agency_cole_daily_jobs').select('state').eq('owner_id',ownerId).eq('id',jobId).single()]);
 if(control.error||!control.data.enabled||control.data.epoch!==epoch||role.error||role.data?.role!=='admin'||job.error||job.data.state!=='preparing'||control.data.paused&&!['usage_unverified','reservation_exceeded'].includes(control.data.hold_reason))throw Error('paused');
}
export async function prepareDaily(ownerId:string){
 const service=db(),snapshot=await dailySnapshot(ownerId),control=snapshot.control;
 if(!control?.enabled||control.paused)throw Error('paused');
 const creative=dailyCreative(snapshot.today);
 const claimed=await service.rpc('agency_cole_claim_day',{p_owner:ownerId,p_day:snapshot.today,p_theme:creative.theme,p_caption:creative.caption});
 if(claimed.error)throw rpcFailure(claimed.error,'daily_claim_unconfirmed');
 if(!claimed.data)return {status:'already_attempted_or_prepared'};
 const jobId=claimed.data as string;
 let reservation:string|null=null,dispatched=false,settlement:{state:string;cost_micros:number|null;pause_reason:string|null}|null=null,phase='preflight';
 let providerStatus:number|null=null,providerCode:string|null=null;
 const settle=async(usage:GenerationUsage|null)=>{
  const r=await service.rpc('agency_cole_settle_estimate',{p_owner:ownerId,p_reservation:reservation,p_usage:usage});
  if(r.error||!r.data)throw Error('usage_save_unconfirmed');settlement=r.data;
  return r.data as {state:string;cost_micros:number|null;pause_reason:string|null};
 };
 try{
  const estimate=requestQuote(new Date());
  if(snapshot.unresolved)throw Error('spending_unresolved');
  phase='account';const p=await coleProfile(ownerId);if(p.id!==control.presenter_profile_id)throw Error('account_changed');
  if(p.visual_identity?.canonicalAppearance?.sha256!==talentAppearance.cole.sha256)throw Error('reference_unavailable');
  const {account}=await agencyAccount(ownerId,p.id,true);if(account.username!==COLE_DAILY.username)throw Error('account_changed');
  phase='reference';const reference=talentAppearance.cole,object=await service.storage.from(bucket).download(`${ownerId}/agency-appearance/${reference.storageFilename}`,{}, {cache:'no-store'});
  if(object.error||!object.data||object.data.size!==reference.bytes)throw Error('reference_unavailable');
  const referenceBytes=new Uint8Array(await object.data.arrayBuffer());if(hash(referenceBytes)!==reference.sha256)throw Error('reference_unavailable');
  const key=process.env.OPENAI_API_KEY?.trim();if(!key)throw Error('generation_not_configured');
  phase='reservation';const reserve=await service.rpc('agency_cole_reserve',{p_owner:ownerId,p_job:jobId,p_maximum:estimate,p_model:COLE_DAILY.model,p_pricing:COLE_DAILY.pricingChecked});
  if(reserve.error||!reserve.data)throw rpcFailure(reserve.error,'reservation_unconfirmed');reservation=reserve.data;
  await active(ownerId,control.epoch);
  phase='dispatch';const dispatch=await service.rpc('agency_cole_dispatch',{p_owner:ownerId,p_reservation:reservation});if(dispatch.error||dispatch.data!==true)throw Error('paused');
  dispatched=true;await active(ownerId,control.epoch);
  // One production attempt only. An estimate controls admission, not billing.
  phase='provider';let response:Response;
  try{response=await fetch('https://api.openai.com/v1/images/edits',{method:'POST',headers:{Authorization:`Bearer ${key}`,'Content-Type':'application/json'},body:JSON.stringify({model:COLE_DAILY.model,prompt:creative.prompt,images:[{image_url:`data:image/png;base64,${Buffer.from(referenceBytes).toString('base64')}`}],n:1,size:'1024x1024',quality:'low',output_format:'jpeg'}),signal:AbortSignal.timeout(180000)});}catch(e){throw Error(e instanceof Error&&['TimeoutError','AbortError'].includes(e.name)?'provider_timeout':'provider_network_error');}
  providerStatus=response.status;
  if(!response.ok){const errorBody=await response.json().catch(()=>null),safe=providerFailure(response.status,errorBody?.error?.code);providerCode=safe.code;throw Error(safe.reason);}
  const result=await response.json();let usage:GenerationUsage|null=null;try{usage=generationUsage(result.usage);}catch{/* Unknown usage remains reserved and pauses generation. */}
  phase='usage';const receipt=await settle(usage);
  if(result.data?.length!==1||typeof result.data[0]?.b64_json!=='string'||result.data[0].b64_json.length>12_000_000)throw Error('generated_image_invalid');
  const bytes=Buffer.from(result.data[0].b64_json,'base64');if(bytes.length>8*1024*1024||bytes[0]!==255||bytes[1]!==216)throw Error('generated_image_invalid');
  // A spending pause does not discard already-paid private media. Explicit
  // owner pause changes epoch and still stops persistence before each action.
  phase='private_storage';await maySaveGeneratedDraft(ownerId,control.epoch,jobId);
  const mediaHash=hash(bytes),path=`${ownerId}/agency-daily/${jobId}.jpeg`;
  const upload=await service.storage.from(bucket).upload(path,bytes,{contentType:'image/jpeg',upsert:false});if(upload.error)throw Error('private_save_unconfirmed');
  const readback=await service.storage.from(bucket).download(path,{}, {cache:'no-store'});if(readback.error||!readback.data||hash(new Uint8Array(await readback.data.arrayBuffer()))!==mediaHash)throw Error('private_save_unconfirmed');
  await maySaveGeneratedDraft(ownerId,control.epoch,jobId);phase='draft_save';
  const post=await service.from('beast_marketing_agency_posts').insert({owner_id:ownerId,presenter_profile_id:p.id,content:{caption:creative.caption,mediaUrl:''},content_hash:digest([creative.caption,mediaHash]),media_hash:mediaHash,profile_hash:profileFingerprint(p),status:'draft'}).select('id').single();if(post.error||!post.data)throw Error('draft_save_unconfirmed');
  const ready=await service.from('agency_cole_daily_jobs').update({state:'ready',post_id:post.data.id,media_path:path,media_hash:mediaHash,media_bytes:bytes.length,provider_status:providerStatus,reason:receipt.pause_reason,updated_at:now()}).eq('owner_id',ownerId).eq('id',jobId).eq('state','preparing').select('id').single();if(ready.error)throw Error('draft_save_unconfirmed');
  return {status:'ready',jobId,postId:post.data.id,generationCostMicros:receipt.cost_micros,spendState:receipt.state,pauseReason:receipt.pause_reason};
 }catch(e){
  const raw=e instanceof Error?e.message:'',known=safeDailyReason(e);
  const reason=/^provider_http_[1-5][0-9]{2}$/.test(raw)?raw:known!=='preparation_unconfirmed'?known:`${phase}_unconfirmed`;
  if(reservation){if(dispatched&&!settlement){try{await settle(null);}catch{/* Dispatched reservation remains durable and blocks future dispatch. */}}else if(!dispatched){await service.from('agency_cole_ai_reservations').update({state:'released'}).eq('id',reservation).eq('owner_id',ownerId).eq('state','reserved');}}
  const saved=await service.from('agency_cole_daily_jobs').update({state:'blocked',reason,provider_status:providerStatus,provider_error_code:providerCode,updated_at:now()}).eq('owner_id',ownerId).eq('id',jobId).eq('state','preparing').select('id').single();if(saved.error)throw Error('Daily failure save unconfirmed. Do not retry.');
  return {status:'blocked',reason,providerStatus,providerCode,jobId};
 }
}
export async function scheduleDaily(ownerId:string,jobId:string,revision:number,username:string,reviewed:boolean){
 const service=db(),j=await service.from('agency_cole_daily_jobs').select('*').eq('owner_id',ownerId).eq('id',jobId).eq('state','ready').single();if(j.error||!j.data||!reviewed||username.replace(/^@/,'')!==COLE_DAILY.username)throw Error('Review the exact photo, caption, disclosure, privacy and destination.');const job=j.data;
 await active(ownerId,job.control_epoch);const profile=await coleProfile(ownerId);
 if(!profile.provenance?.manualAgencyApproved||!profile.provenance?.identityApproval||!profile.provenance?.disclosureApproved)throw Error('Review and approve Cole’s Brand & Style first.');
 const read=await service.from('beast_marketing_agency_posts').select('*').eq('owner_id',ownerId).eq('id',job.post_id).eq('revision',revision).eq('status','draft').single();if(read.error||!read.data)throw Error('Draft revision changed.');const post=read.data as AgencyPost;
 if(post.profile_hash!==profileFingerprint(profile)||hash(await privateDailyImage(ownerId,job.id))!==post.media_hash||post.content.caption!==job.caption)throw Error('Photo, caption or brand changed. Review again.');
 const {account}=await agencyAccount(ownerId,profile.id,true);if(account.username!==COLE_DAILY.username)throw Error('Cole binding differs.');
 const scheduled=nextPostingTime(new Date()),time=now();await active(ownerId,job.control_epoch);
 const approve=await service.from('beast_marketing_agency_posts').update({status:'approved',account_snapshot:account,approval_hash:approvalFingerprint(post,account),approved_at:time,updated_at:time}).eq('owner_id',ownerId).eq('id',post.id).eq('revision',revision).eq('status','draft').select('id').single();if(approve.error)throw Error('Approval not saved.');
 const saved=await service.from('agency_cole_daily_jobs').update({state:'scheduled',approved_revision:revision,scheduled_for:scheduled,publish_day:nyDay(new Date(scheduled)),updated_at:time}).eq('owner_id',ownerId).eq('id',job.id).eq('state','ready').select('id').single();if(saved.error)throw Error('Schedule not saved. A post may already occupy that day. No daily worker can publish this unscheduled approval.');return {scheduledFor:scheduled};
}
export async function rejectDaily(ownerId:string,jobId:string){
 const service=db(),j=await service.from('agency_cole_daily_jobs').select('*').eq('owner_id',ownerId).eq('id',jobId).single();if(j.error||!j.data||!['ready','scheduled','blocked'].includes(j.data.state))throw Error('An in-flight or unknown post must be reconciled, not rejected.');
 const saved=await service.from('agency_cole_daily_jobs').update({state:'rejected',reason:'owner_rejected',updated_at:now()}).eq('owner_id',ownerId).eq('id',jobId).eq('state',j.data.state).select('id').single();if(saved.error)throw Error('Rejection changed. Refresh.');
 if(j.data.post_id){const revoked=await service.from('beast_marketing_agency_posts').update({status:'cancelled',approval_hash:null,approved_at:null,updated_at:now()}).eq('owner_id',ownerId).eq('id',j.data.post_id).in('status',['draft','approved']).select('id').single();if(revoked.error)throw Error('Rejected; inspect approval revocation.');}
}
export async function publishDaily(ownerId:string,jobId:string,continueProcessing=false){
 const service=db(),jr=await service.from('agency_cole_daily_jobs').select('*').eq('owner_id',ownerId).eq('id',jobId).eq('state',continueProcessing?'processing':'scheduled').single();if(jr.error||!jr.data)return {status:'not_due'};const job=jr.data;
 if(Date.parse(job.scheduled_for)>Date.now()||nyDay(new Date())!==job.publish_day)return {status:'not_due'};
 const pr=await service.from('beast_marketing_agency_posts').select('*').eq('owner_id',ownerId).eq('id',job.post_id).eq('revision',job.approved_revision).single();if(pr.error||!pr.data)throw Error('Approved revision unavailable.');const post=pr.data as AgencyPost;
 const verify=async()=>{
  await active(ownerId,job.control_epoch);
  const [current,role,other,profile]=await Promise.all([service.from('agency_cole_daily_jobs').select('state').eq('owner_id',ownerId).eq('id',job.id).single(),service.from('profiles').select('role').eq('id',ownerId).single(),service.from('beast_marketing_agency_posts').select('id').eq('owner_id',ownerId).eq('presenter_profile_id',post.presenter_profile_id).neq('id',post.id).in('status',['unknown','publishing','processing']).limit(1),coleProfile(ownerId)]);
  if(current.error||!['scheduled','processing','publishing'].includes(current.data?.state)||role.error||role.data.role!=='admin'||other.error||other.data?.length)throw Error('Publishing paused or unresolved.');
  if(profile.id!==post.presenter_profile_id||!profile.provenance?.manualAgencyApproved||!profile.provenance?.identityApproval||!profile.provenance?.disclosureApproved)throw Error('Brand approval changed.');
  const live=await service.from('beast_marketing_agency_posts').select('revision,status,approval_hash').eq('owner_id',ownerId).eq('id',post.id).single();if(live.error||live.data.revision!==post.revision||live.data.approval_hash!==post.approval_hash||!['approved','processing','publishing'].includes(live.data.status))throw Error('Post approval changed.');
  const {account}=await agencyAccount(ownerId,profile.id,true);if(account.username!==COLE_DAILY.username)throw Error('Cole binding differs.');assertApproved(post,profileFingerprint(profile),account);if(hash(await privateDailyImage(ownerId,job.id))!==post.media_hash)throw Error('Media changed.');
 };
 const patch=async(p:Record<string,unknown>)=>{const r=await service.from('beast_marketing_agency_posts').update({...p,updated_at:now()}).eq('owner_id',ownerId).eq('id',post.id).eq('revision',post.revision).eq('status','publishing').select('id').single();if(r.error)throw Error('Publication save unconfirmed.');};
 const {account,token}=await agencyAccount(ownerId,post.presenter_profile_id);
 const result=await publishAgencyRevision(post,{verify,claim:async()=>{const claim=await service.from('agency_cole_daily_jobs').update({state:'publishing',updated_at:now()}).eq('owner_id',ownerId).eq('id',job.id).eq('state',continueProcessing?'processing':'scheduled').select('id').maybeSingle();if(claim.error||!claim.data)return false;const p=await service.from('beast_marketing_agency_posts').update({status:'publishing',unknown_stage:'prepare',updated_at:now()}).eq('owner_id',ownerId).eq('id',post.id).eq('revision',post.revision).eq('approval_hash',post.approval_hash!).eq('status',continueProcessing?'processing':'approved').select('id').maybeSingle();if(p.error||!p.data)throw Error('Publishing claim unconfirmed.');return true;},prepare:async()=>{await verify();const signed=await service.storage.from(bucket).createSignedUrl(job.media_path,600);if(signed.error||!signed.data?.signedUrl)throw Error('Approved media access unavailable.');await verify();return (await metaRequest(`${account.accountId}/media`,token,{caption:post.content.caption,image_url:signed.data.signedUrl},true)).id;},checkpoint:async id=>patch({container_id:id}),containerStatus:async id=>{await verify();return (await metaRequest(id,token,{fields:'status_code'})).status_code;},beforePublish:async()=>{await verify();await patch({unknown_stage:'publish'});},publish:async id=>{await verify();return (await metaRequest(`${account.accountId}/media_publish`,token,{creation_id:id},true)).id;},save:async r=>{await patch({status:r.status,unknown_stage:r.unknownStage??null,...(r.containerId?{container_id:r.containerId}:{}),...(r.postId?{provider_post_id:r.postId,published_at:now()}:{}),last_error:r.error??null});const state=r.status==='failed'?'blocked':r.status;const updated=await service.from('agency_cole_daily_jobs').update({state,reason:r.error?'publication_requires_review':null,updated_at:now()}).eq('owner_id',ownerId).eq('id',job.id).eq('state','publishing').select('id').single();if(updated.error)throw Error('Daily publication receipt unconfirmed.');}});
 return result;
}
