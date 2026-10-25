import { createHash } from 'node:crypto';
import { allowedSocialMedia } from './marketingSocial';
export { COLE_NAME, FIRST_COLE_CAPTION } from './agencyBrand';
export type AgencyCreative = { caption: string; mediaUrl: string };
export type AgencyState = 'draft'|'approved'|'queued'|'publishing'|'processing'|'published'|'failed'|'unknown'|'cancelled';
export type AccountSnapshot = { connectionId:string; accountId:string; username:string; connectedAt:string };
export type AgencyPost = { id:string; presenter_profile_id:string; content:AgencyCreative; content_hash:string; media_hash:string; revision:number; status:AgencyState; profile_hash:string; account_snapshot:AccountSnapshot|null; approval_hash:string|null; approved_at:string|null; container_id:string|null; provider_post_id:string|null; published_at:string|null; last_error:string|null; updated_at:string; metrics:Record<string,number|null>|null;metrics_checked_at:string|null;metrics_error:string|null;unknown_stage?:string|null };
export function digest(value: unknown) { return createHash('sha256').update(JSON.stringify(value)).digest('hex'); }
export function profileFingerprint(profile:Record<string,unknown>) { return digest([profile.id,profile.name,profile.presenter_type,profile.allowed_topics,profile.visual_identity,profile.voice_identity,profile.presentation_rules,profile.disclosure_rules,profile.provenance]); }
export function creativeInput(value:unknown,supabaseUrl?:string):AgencyCreative {
 const c=value as Partial<AgencyCreative>|null;
 if(!c||typeof c.caption!=='string'||!c.caption.trim()||c.caption.length>1800)throw Error('Enter a caption of 1–1,800 characters.');
 const mediaUrl=typeof c.mediaUrl==='string'?c.mediaUrl.trim():'';
 if(mediaUrl&&(!allowedSocialMedia(mediaUrl,supabaseUrl)||!/^https:\/\/[^?]+\.jpe?g$/i.test(mediaUrl)))throw Error('Use an owned public JPEG URL. Local files can be previewed, but need an approved hosted asset before approval.');
 return {caption:c.caption.trim(),mediaUrl};
}
export function rejectPrivateIdentity(caption:string,privateValues:string[]) {
 for(const value of privateValues.map(x=>x.trim()).filter(x=>x.length>=3))if(caption.toLowerCase().includes(value.toLowerCase()))throw Error('Remove private owner identity or contact details from public content.');
 if(/[\w.+-]+@[\w.-]+\.[a-z]{2,}/i.test(caption))throw Error('Remove personal email addresses from public content.');
}
export function approvalFingerprint(post:Pick<AgencyPost,'content_hash'|'media_hash'|'revision'|'profile_hash'>,account:AccountSnapshot) {return digest([post.content_hash,post.media_hash,post.revision,post.profile_hash,account]);}
export function assertApproved(post:AgencyPost,profileHash:string,account:AccountSnapshot) {
 if(!['approved','processing'].includes(post.status)||!post.media_hash||post.profile_hash!==profileHash||!post.approved_at||post.approval_hash!==approvalFingerprint(post,account))throw Error('Content, brand or account changed. Save and approve the exact revision again.');
}
export function ownerState(post:Pick<AgencyPost,'status'|'updated_at'>,now=Date.now()) {return post.status==='publishing'&&now-Date.parse(post.updated_at)>120000?'unknown':post.status;}
export function metricState(checked:string|null,error:string|null,now=Date.now()) {return !checked||!Number.isFinite(Date.parse(checked))||Date.parse(checked)>now+30000?'Unavailable':error?'Partial / refresh unavailable':now-Date.parse(checked)>86400000?'Stale':'Available';}

export type PublishResult={status:AgencyState;containerId?:string;postId?:string;unknownStage?:string;error?:string};
export type PublishDependencies={
 verify:()=>Promise<void>; claim:()=>Promise<boolean>; prepare:()=>Promise<string>;
 containerStatus:(id:string)=>Promise<string>; publish:(id:string)=>Promise<string>;
 checkpoint:(id:string)=>Promise<void>; beforePublish:()=>Promise<void>; save:(result:PublishResult)=>Promise<void>;
};
/** One owner action, one claim. Never retry external writes after an uncertain outcome. */
export async function publishAgencyRevision(post:AgencyPost,d:PublishDependencies):Promise<PublishResult> {
 await d.verify(); if(!await d.claim())throw Error('This revision is already claimed or changed. Refresh its status.');
 let externalWrite=false;let stage='prepare';
 try {
  await d.verify();
  let container=post.container_id;
  if(!container){externalWrite=true;container=await d.prepare();if(!/^\d+$/.test(container))throw Error('Media preparation receipt is unknown.');await d.checkpoint(container);externalWrite=false;}
  const status=await d.containerStatus(container);
  if(status==='IN_PROGRESS'){const r:PublishResult={status:'processing',containerId:container};await d.save(r);return r;}
  if(status==='PUBLISHED')throw Error('Instagram reports a published container without a saved media receipt. Reconcile before any further publishing.');
  if(status!=='FINISHED')throw Error('Instagram rejected or expired this media. Review its format; do not retry this container.');
  await d.verify();await d.beforePublish();stage='publish';externalWrite=true;const postId=await d.publish(container);
  if(!/^\d+$/.test(postId))throw Error('Publication receipt is unknown.');
  stage='receipt';const r:PublishResult={status:'published',containerId:container,postId};await d.save(r);return r;
 } catch(e) {
  const message=e instanceof Error?e.message:'Publishing failed.';
  // A failed read after container creation is safe to resume only when the saved container is known.
  // PUBLISHED must remain unknown even if no new write occurred in this action.
  const definiteRejection=e instanceof Error&&'uncertain' in e&&e.uncertain===false;
  const status:AgencyState=(externalWrite&&!definiteRejection)||message.includes('published container')?'unknown':'failed';
  const result:PublishResult={status,error:message,...(status==='unknown'?{unknownStage:message.includes('published container')?'publish':stage}:{})};await d.save(result);return result;
 }
}
