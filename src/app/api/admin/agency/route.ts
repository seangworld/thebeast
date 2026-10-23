import { socialOwner,socialJson,socialConfiguration,unseal } from '@/lib/server/social/auth';
import { createBeastFusionPublicationClient } from '@/lib/supabase/service';
import { requireSupabasePublicConfiguration } from '@/lib/supabase/config';
import { agencyWriteOwner } from '@/lib/server/agency/auth';
import { metaRequest } from '@/lib/server/social/providers';
import { agencyAccount } from '@/lib/server/agency/store';
import { agencyMediaHash } from '@/lib/server/agency/media';
import { COLE_NAME,creativeInput,digest,profileFingerprint,rejectPrivateIdentity,approvalFingerprint,assertApproved,publishAgencyRevision,ownerState,type AgencyPost } from '@/lib/agencyWorkflow';
import { isAvailableAgencyConnection } from '@/lib/agencyPreparation';
import { isUuid } from '@/lib/marketingSocial';
export const dynamic='force-dynamic';export const runtime='nodejs';export const maxDuration=120;
const fields='id,presenter_profile_id,content,content_hash,media_hash,revision,status,profile_hash,account_snapshot,approval_hash,approved_at,container_id,provider_post_id,published_at,last_error,updated_at,metrics,metrics_checked_at,metrics_error,unknown_stage';
export async function GET(){
 const owner=await socialOwner();if(!owner)return socialJson({error:'Owner access required.'},403);
 try{
  const db=createBeastFusionPublicationClient();const [profiles,connections,bindings,posts]=await Promise.all([
   owner.client.from('beast_marketing_presenter_profiles').select('id,name,active,updated_at,presenter_type,visual_identity,voice_identity,presentation_rules,allowed_topics,disclosure_rules,provenance').eq('owner_id',owner.id).eq('presenter_type','future_character').in('name',[COLE_NAME,'Leila Bautista']),
   db.from('beast_marketing_social_connections').select('id,channel,account_id,label,connected_at,expires_at').eq('owner_id',owner.id).eq('channel','instagram').is('disconnected_at',null),
   db.from('beast_marketing_agency_bindings').select('presenter_profile_id,connection_id,expected_account_id,expected_username,connection_version,metrics,metrics_checked_at,metrics_error').eq('owner_id',owner.id),
   db.from('beast_marketing_agency_posts').select(fields).eq('owner_id',owner.id).order('created_at',{ascending:false}).limit(50),
  ]);
  if([profiles,connections,bindings,posts].some(r=>r.error))return socialJson({error:'Agency data is unavailable. Verify the two Agency migrations and server configuration; do not treat this as an empty queue.'},503);
  return socialJson({profiles:profiles.data,connections:connections.data,bindings:bindings.data,posts:posts.data?.map(p=>({...p,displayStatus:ownerState(p as AgencyPost)})),configuration:socialConfiguration(),automationEnabled:false,dmEnabled:false,metricsNote:'Metrics refresh is manual. Missing access or values remain unavailable.'});
 }catch{return socialJson({error:'Agency configuration is unavailable. No data or metrics inferred.'},503);}
}
export async function POST(request:Request){
 const owner=await agencyWriteOwner(request,{env:process.env,getEffectiveSupabaseUrl:()=>requireSupabasePublicConfiguration().url,socialOwner});
 if(!owner)return socialJson({error:'Owner access required. Agency writes are unavailable in ordinary previews.'},403);
 const body=await request.json().catch(()=>null);
 try{
  if(!isUuid(body?.presenterProfileId))throw Error('Choose Cole’s saved profile.');
  const db=createBeastFusionPublicationClient();
  const pr=await owner.client.from('beast_marketing_presenter_profiles').select('*').eq('owner_id',owner.id).eq('id',body.presenterProfileId).eq('name',COLE_NAME).eq('presenter_type','future_character').maybeSingle();
  if(pr.error||!pr.data)throw Error('Cole’s owned profile is unavailable. Leila remains deferred.');const profile=pr.data;
  const now=()=>new Date().toISOString();
  const privacyCheck=async(caption:string)=>{const [auth,identity]=await Promise.all([owner.client.auth.getUser(),owner.client.from('profiles').select('full_name,display_name').eq('id',owner.id).maybeSingle()]);if(auth.error||identity.error)throw Error('Owner privacy check unavailable.');const names=[identity.data?.full_name,identity.data?.display_name,auth.data.user?.user_metadata?.full_name].filter((v):v is string=>typeof v==='string');const firstNames=names.map(n=>n.trim().split(/\s+/)[0]).filter(n=>!['the','owner','admin'].includes(n.toLowerCase()));rejectPrivateIdentity(caption,[auth.data.user?.email||'',...names,...firstNames]);};
  if(body.action==='brand'){
   if(body.confirm!==true)throw Error('Explicitly approve Cole’s locked brand and AI disclosure. This grants no automation authority.');
   const keys=['visualDirection','audience','voiceDirection'] as const;for(const key of keys)if(typeof body[key]!=='string'||!body[key].trim()||body[key].length>500)throw Error('Complete the brand fields within 500 characters.');
   if(profile.updated_at!==body.updatedAt)throw Error('Brand configuration changed. Refresh before saving.');
   const saved=await owner.client.from('beast_marketing_presenter_profiles').update({visual_identity:{...profile.visual_identity,direction:body.visualDirection.trim()},voice_identity:{...profile.voice_identity,direction:body.voiceDirection.trim()},presentation_rules:{...profile.presentation_rules,audience:body.audience.trim()},provenance:{...profile.provenance,identityApproval:true,disclosureApproved:true,manualAgencyApproved:true},updated_at:now()}).eq('id',profile.id).eq('owner_id',owner.id).eq('updated_at',body.updatedAt).select('id').maybeSingle();
   if(saved.error||!saved.data)throw Error('Brand save was not confirmed. Refresh.');return socialJson({saved:true});
  }
  if(body.action==='bind'){
   if(body.confirm!==true||!isUuid(body.connectionId)||typeof body.username!=='string'||!body.username.trim())throw Error('Type Cole’s exact Instagram username and explicitly confirm the existing account.');
   const c=await db.from('beast_marketing_social_connections').select('*').eq('owner_id',owner.id).eq('id',body.connectionId).eq('channel','instagram').is('disconnected_at',null).maybeSingle();
   if(c.error||!c.data||!/^\d+$/.test(c.data.account_id)||!isAvailableAgencyConnection(c.data,new Date().toISOString()))throw Error('An existing available Instagram connection is required.');
   const live=await metaRequest(c.data.account_id,unseal(c.data.credentials,owner.id).access_token,{fields:'id,username'});
   if(live.id!==c.data.account_id||live.username!==body.username.trim().replace(/^@/,''))throw Error('Instagram identity does not match the username you confirmed. No binding saved.');
   const prior=await db.from('beast_marketing_agency_bindings').select('*').eq('owner_id',owner.id).eq('presenter_profile_id',profile.id).eq('channel','instagram').maybeSingle();
   if(prior.error||prior.data&&(prior.data.expected_account_id!==live.id||prior.data.expected_username!==live.username))throw Error('Existing talent account identity differs. Account reassignment is not supported; no binding changed.');
   const payload={owner_id:owner.id,presenter_profile_id:profile.id,connection_id:c.data.id,channel:'instagram',expected_account_id:live.id,expected_username:live.username,connection_version:c.data.connected_at};
   const saved=prior.data?await db.from('beast_marketing_agency_bindings').update(payload).eq('owner_id',owner.id).eq('presenter_profile_id',profile.id).eq('channel','instagram').eq('connection_version',prior.data.connection_version).select('connection_id').maybeSingle():await db.from('beast_marketing_agency_bindings').insert(payload).select('connection_id').single();
   if(saved.error||!saved.data)throw Error('Binding not saved. This talent or account may already be assigned; refresh before retrying.');return socialJson({saved:true,publishingAuthorized:false});
  }
  if(body.action==='save'){
   if(!isUuid(body.id)||!Number.isSafeInteger(body.revision)||body.revision<0)throw Error('Choose a valid draft revision.');
   const content=creativeInput(body.content,process.env.NEXT_PUBLIC_SUPABASE_URL);
   await privacyCheck(content.caption);
   const mediaHash=content.mediaUrl?await agencyMediaHash(content.mediaUrl,process.env.NEXT_PUBLIC_SUPABASE_URL):'';
   const payload={content,media_hash:mediaHash,content_hash:digest([content.caption,mediaHash||content.mediaUrl]),profile_hash:profileFingerprint(profile),approval_hash:null,approved_at:null,account_snapshot:null,status:'draft',unknown_stage:null,container_id:null,last_error:null,updated_at:now()};
   const saved=body.revision===0?await db.from('beast_marketing_agency_posts').insert({id:body.id,owner_id:owner.id,presenter_profile_id:profile.id,...payload}).select(fields).single():await db.from('beast_marketing_agency_posts').update({...payload,revision:body.revision+1}).eq('owner_id',owner.id).eq('presenter_profile_id',profile.id).eq('id',body.id).eq('revision',body.revision).in('status',['draft','approved','failed','cancelled']).select(fields).maybeSingle();
   if(saved.error||!saved.data)throw Error('Draft not saved. It may be duplicated, changed or in flight. Refresh before retrying.');return socialJson({post:saved.data});
  }
  if(body.action==='accountMetrics'){
   const {account,token}=await agencyAccount(owner.id,profile.id,true);let metrics:Record<string,number|null>|undefined;let error:string|null=null;
   try{const data=await metaRequest(account.accountId,token,{fields:'followers_count,media_count'});const n=(x:unknown)=>typeof x==='number'&&Number.isFinite(x)&&x>=0?x:null;metrics={followers:n(data.followers_count),mediaCount:n(data.media_count)};if(Object.values(metrics).every(v=>v===null))error='Requested account metrics unavailable; no zero values inferred.';}catch{error='Account metrics unavailable. Retained values keep their prior timestamp. Check reporting permissions.';}
   const saved=await db.from('beast_marketing_agency_bindings').update({...(metrics?{metrics,metrics_checked_at:now()}:{}),metrics_error:error}).eq('owner_id',owner.id).eq('presenter_profile_id',profile.id).eq('expected_account_id',account.accountId).eq('connection_version',account.connectedAt).select('connection_id').maybeSingle();if(saved.error||!saved.data)throw Error('Account metrics save unconfirmed. Refresh.');return socialJson({saved:true});
  }
  if(!isUuid(body.id)||!Number.isSafeInteger(body.revision))throw Error('Choose a saved revision.');
  const read=await db.from('beast_marketing_agency_posts').select(fields).eq('owner_id',owner.id).eq('presenter_profile_id',profile.id).eq('id',body.id).eq('revision',body.revision).maybeSingle();if(read.error||!read.data)throw Error('This draft changed. Refresh.');const post=read.data as AgencyPost;
  const savePatch=async(patch:Record<string,unknown>,statuses:string[])=>{const r=await db.from('beast_marketing_agency_posts').update({...patch,updated_at:now()}).eq('owner_id',owner!.id).eq('id',post.id).eq('revision',post.revision).in('status',statuses).select('id').maybeSingle();if(r.error||!r.data)throw Error('Status save was not confirmed. Refresh; never assume publishing failed.');};
  if(body.action==='abandonPreparation'){
   if(body.confirm!==true||ownerState(post)!=='unknown'||post.unknown_stage!=='prepare')throw Error('A possible publication cannot be discarded. Reconcile its Instagram receipt.');
   const saved=await db.from('beast_marketing_agency_posts').update({status:'failed',approval_hash:null,approved_at:null,last_error:'Owner abandoned uncertain media preparation. No publish request had started; an orphan unpublished container may remain.',updated_at:now()}).eq('owner_id',owner.id).eq('id',post.id).eq('revision',post.revision).eq('unknown_stage','prepare').in('status',['unknown','publishing']).select('id').maybeSingle();if(saved.error||!saved.data)throw Error('Preparation advanced or changed. Refresh and do not retry.');return socialJson({saved:true});
  }
  if(body.action==='cancel'){if(post.status==='processing'){const {token}=await agencyAccount(owner.id,profile.id,true);const remote=await metaRequest(post.container_id!,token,{fields:'status_code'});if(remote.status_code==='PUBLISHED'){await savePatch({status:'unknown',last_error:'Instagram reports published media. Reconcile the receipt; do not repost.'},['processing']);throw Error('Publication may exist. Reconcile its receipt.');}if(!['IN_PROGRESS','FINISHED','ERROR','EXPIRED'].includes(remote.status_code))throw Error('Container outcome is unknown. Inspect Instagram before cancellation.');}await savePatch({status:'cancelled',approval_hash:null,approved_at:null},['draft','approved','failed','processing']);return socialJson({saved:true});}
  if(body.action==='approve'){
   if(profile.provenance?.manualAgencyApproved!==true||profile.provenance?.identityApproval!==true||profile.provenance?.disclosureApproved!==true)throw Error('Approve Cole’s brand identity and disclosure first.');
   if(post.status!=='draft'||body.confirm!==true||body.privacyReviewed!==true)throw Error('Review the saved caption, image, disclosure, privacy and account before approval.');
   await privacyCheck(post.content.caption);
   if(!post.content.mediaUrl||!post.media_hash)throw Error('The approved Cole JPEG asset is missing. Save the hosted asset before approval.');
   if(post.profile_hash!==profileFingerprint(profile)||await agencyMediaHash(post.content.mediaUrl,process.env.NEXT_PUBLIC_SUPABASE_URL)!==post.media_hash)throw Error('Brand or media bytes changed. Save and review again.');
   const {account}=await agencyAccount(owner.id,profile.id,true);
   if(body.username!==account.username)throw Error('Confirm the exact bound Instagram username.');
   await savePatch({status:'approved',account_snapshot:account,approval_hash:approvalFingerprint(post,account),approved_at:now()},['draft']);return socialJson({saved:true});
  }
  if(body.action==='publish'){
   if(body.confirm!==true)throw Error('Explicitly confirm this publish action.');
   let providerChecked=false;
   const verify=async()=>{const unresolved=await db.from('beast_marketing_agency_posts').select('id').eq('owner_id',owner!.id).eq('presenter_profile_id',profile.id).neq('id',post.id).in('status',['unknown','publishing']).limit(1);if(unresolved.error||unresolved.data?.length)throw Error('Reconcile Cole’s other unknown or in-flight publication before publishing again.');const role=await owner!.client.from('profiles').select('role').eq('id',owner!.id).maybeSingle();if(role.error||role.data?.role!=='admin')throw Error('Owner access changed.');const current=await owner!.client.from('beast_marketing_presenter_profiles').select('*').eq('owner_id',owner!.id).eq('id',profile.id).maybeSingle();if(current.error||!current.data||current.data.provenance?.manualAgencyApproved!==true||current.data.provenance?.identityApproval!==true||current.data.provenance?.disclosureApproved!==true)throw Error('Cole brand approval is unavailable or revoked.');const {account}=await agencyAccount(owner!.id,profile.id,!providerChecked);assertApproved(post,profileFingerprint(current.data),account);if(body.username!==account.username)throw Error('Account confirmation changed.');if(!providerChecked){if(await agencyMediaHash(post.content.mediaUrl,process.env.NEXT_PUBLIC_SUPABASE_URL)!==post.media_hash)throw Error('Media bytes changed. Save and approve again.');providerChecked=true;}};
   const {account,token}=await agencyAccount(owner.id,profile.id);
   const result=await publishAgencyRevision(post,{verify,claim:async()=>{const r=await db.from('beast_marketing_agency_posts').update({status:'publishing',unknown_stage:'prepare',updated_at:now(),last_error:null}).eq('owner_id',owner.id).eq('id',post.id).eq('revision',post.revision).eq('approval_hash',post.approval_hash!).eq('status',post.status).in('status',['approved','processing']).select('id').maybeSingle();if(r.error)throw Error('Could not claim publishing.');return !!r.data;},prepare:async()=>{const r=await metaRequest(`${account.accountId}/media`,token,{caption:post.content.caption,image_url:post.content.mediaUrl},true);return r.id;},containerStatus:async id=>(await metaRequest(id,token,{fields:'status_code'})).status_code,publish:async id=>(await metaRequest(`${account.accountId}/media_publish`,token,{creation_id:id},true)).id,checkpoint:async id=>savePatch({container_id:id},['publishing']),beforePublish:async()=>savePatch({unknown_stage:'publish'},['publishing']),save:async r=>savePatch({status:r.status,unknown_stage:r.unknownStage||null,...(r.containerId?{container_id:r.containerId}:{}),...(r.postId?{provider_post_id:r.postId,published_at:now()}:{}),last_error:r.error||null},['publishing'])});return socialJson(result);
  }
  if(body.action==='metrics'||body.action==='reconcile'){
   const {account,token}=await agencyAccount(owner.id,profile.id,true);
   const mediaId=body.action==='reconcile'?body.mediaId:post.provider_post_id;
   if(!/^\d+$/.test(mediaId||''))throw Error('A confirmed Instagram media ID is required.');
   if(body.action==='reconcile'&&(!['unknown','publishing'].includes(ownerState(post))||body.confirm!==true))throw Error('Only an unknown outcome can be reconciled after inspecting Instagram.');
   let media;try{media=await metaRequest(mediaId,token,{fields:'id,owner,caption,timestamp,like_count,comments_count,permalink'});}catch{if(body.action==='metrics')await savePatch({metrics_error:'Metrics refresh unavailable. Retained values keep their prior timestamp; reconnect or check reporting access.'},['published']);throw Error('Instagram reporting unavailable; no publication receipt changed.');}
   if(media.id!==mediaId||(typeof media.owner==='string'?media.owner:media.owner?.id)!==account.accountId||media.caption!==post.content.caption||!post.approved_at||!Number.isFinite(Date.parse(media.timestamp))||Date.parse(media.timestamp)<Date.parse(post.approved_at)-60000)throw Error('Instagram ownership, caption or publication time could not be matched. No receipt changed.');
   const number=(x:unknown)=>typeof x==='number'&&Number.isFinite(x)&&x>=0?x:null;
   let followers:number|null=null;let metricError:string|null=null;try{followers=number((await metaRequest(account.accountId,token,{fields:'followers_count'})).followers_count);}catch{metricError='Follower reporting unavailable. Check account insights access.';}
   if(followers===null&&number(media.like_count)===null&&number(media.comments_count)===null)metricError='Requested metrics are unavailable; no zero values inferred.';
   await savePatch({...(body.action==='reconcile'?{status:'published',provider_post_id:mediaId,published_at:media.timestamp,last_error:null}:{}),metrics:{likes:number(media.like_count),comments:number(media.comments_count),followers},metrics_checked_at:now(),metrics_error:metricError},body.action==='reconcile'?['unknown','publishing']:['published']);return socialJson({saved:true});
  }
  throw Error('Choose a supported Agency action.');
 }catch(error){return socialJson({error:error instanceof Error?error.message:'Agency action could not be confirmed.'},409);}
}
