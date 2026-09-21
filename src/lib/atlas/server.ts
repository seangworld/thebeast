import { createHash } from 'node:crypto';
import { createAdminClient } from '@/lib/supabase/admin';
import { createRouteClient } from '@/lib/supabase/server';
import { ATLAS_ORIGIN, atlasInstructions, atlasOutput, atlasSites, directAtlasAction } from './shared';
import { requestOpenAIResponse } from '@/lib/digitalStaffRuntime/provider';
export const hashAtlasToken = (v:string)=>createHash('sha256').update(v).digest('hex');
export function atlasDB() { const db=createAdminClient(); if(!db) throw new Error('ATLAS storage is unavailable.'); return db; }
export async function atlasAuth(request:Request, cookieOnly=false) {
 const bearer=request.headers.get('authorization');
 if(bearer && !cookieOnly) {
  if(!/^Bearer atlas_[a-f0-9]{64}$/.test(bearer)) return null;
  const db=atlasDB();
  const {data,error}=await db.from('atlas_devices').select('owner_id').eq('token_hash',hashAtlasToken(bearer.slice(7))).is('revoked_at',null).gt('expires_at',new Date().toISOString()).maybeSingle();
  if(error||!data) return null;
  const profile=await db.from('profiles').select('role').eq('id',data.owner_id).maybeSingle();
  return profile.data?.role==='admin'?data.owner_id:null;
 }
 if(request.method!=='GET' && request.headers.get('origin')!==ATLAS_ORIGIN) return null;
 const client=createRouteClient(); const {data,error}=await client.auth.getUser(); if(error||!data.user) return null;
 const profile=await client.from('profiles').select('role').eq('id',data.user.id).maybeSingle();
 return profile.data?.role==='admin'?data.user.id:null;
}
export async function reserveAtlas(owner:string, category:'turn'|'speech'|'transcribe') {
 const r=await atlasDB().rpc('atlas_reserve_call',{p_owner:owner,p_category:category}); if(r.error||r.data!==true) throw new Error('Daily ATLAS limit reached, or usage controls are unavailable. Try again tomorrow.');
}
export async function atlasSnapshot(owner:string) {
 const db=atlasDB();
 const [records,turns,observations,usage]=await Promise.all([
  db.from('atlas_records').select('*').eq('owner_id',owner).order('created_at',{ascending:false}).limit(200),
  db.from('atlas_turns').select('*').eq('owner_id',owner).order('created_at',{ascending:false}).limit(30),
  db.from('beast_admin_staff_observation_runs').select('status,started_at,completed_at,unavailable_sources,next_step').eq('owner_id',owner).order('started_at',{ascending:false}).limit(3),
  db.from('atlas_usage').select('category,calls').eq('owner_id',owner).eq('day',new Date().toISOString().slice(0,10))
 ]);
 if(records.error||turns.error||usage.error) throw new Error('ATLAS storage is not ready.');
 return {records:records.data,turns:turns.data,observations:{available:!observations.error,rows:observations.data||[]},usage:usage.data,checkedAt:new Date().toISOString(),aiReady:!!process.env.OPENAI_API_KEY};
}
export async function checkAtlasSites(fetcher:typeof fetch=fetch) {
 return Promise.all(atlasSites.map(async url=>{ const start=Date.now(); try {const r=await fetcher(url,{method:'HEAD',redirect:'manual',cache:'no-store',signal:AbortSignal.timeout(8000)});return {url,status:r.status,reachable:r.status>=200&&r.status<400,ms:Date.now()-start,checkedAt:new Date().toISOString()};} catch {return {url,status:null,reachable:false,ms:Date.now()-start,checkedAt:new Date().toISOString()};}}));
}
export async function runAtlasTurn(id:string, owner:string) {
 const db=atlasDB();
 const profile=await db.from('profiles').select('role').eq('id',owner).maybeSingle();
 if(profile.error) return;
 if(profile.data?.role!=='admin') { await db.from('atlas_turns').update({status:'failed',answer:'Owner authorization is no longer active.',updated_at:new Date().toISOString()}).eq('id',id).eq('owner_id',owner).eq('status','queued'); return; }
 const claim=await db.from('atlas_turns').update({status:'processing',updated_at:new Date().toISOString()}).eq('id',id).eq('owner_id',owner).eq('status','queued').select('*').maybeSingle();
 if(claim.error||!claim.data) return;
 try {
  const question=claim.data.question as string;
  const action=directAtlasAction(question);
  let answer='',evidence:unknown={};
  if(action) {
   // Turn id also identifies the record: a receipt can never create a duplicate.
   const r=await db.from('atlas_records').insert({id,owner_id:owner,...action}).select('id').single();
   if(r.error) throw new Error('Record could not be saved.');
   answer=`Saved ${action.kind==='task'?'to your ATLAS task list':'in ATLAS memory'}: ${action.body}`; evidence={recordId:r.data.id};
  } else if(/^(?:hey atlas[, ]*)?check (?:my |the )?sites[.!]?$/i.test(question.trim())) {
   const sites=await checkAtlasSites(); evidence={sites}; answer=sites.map(s=>`${new URL(s.url).hostname}: ${s.reachable?'reachable':s.status?`HTTP ${s.status}`:'could not be reached'}${s.status?` (${s.status})`:''}.`).join('\n')+'\nThese are homepage reachability checks, not full functional tests.';
  } else {
   if(!process.env.OPENAI_API_KEY) throw new Error('AI connection is not configured. Notes, tasks, and site checks still work.');
   const snapshot=await atlasSnapshot(owner);
   const history=snapshot.turns.filter(t=>t.id!==id&&t.status==='completed').slice(0,8).reverse().map(t=>({question:t.question,answer:t.answer,at:t.created_at}));
   const payload=await requestOpenAIResponse<{output?:Array<{type?:string;content?:Array<{type?:string;text?:string}>}>}>({model:process.env.ATLAS_MODEL||'gpt-5.6-luna',store:false,max_output_tokens:1500,instructions:atlasInstructions,input:JSON.stringify({question,history,records:snapshot.records.slice(0,80).map(r=>({...r,body:r.body.slice(0,600)})),recordLimit:80,recordBodyLimit:600,observations:snapshot.observations,checkedAt:snapshot.checkedAt})},{signal:AbortSignal.timeout(55000)});
   answer=atlasOutput(payload); if(!answer) throw new Error('ATLAS did not return an answer.'); evidence={contextAt:snapshot.checkedAt,recordCount:Math.min(snapshot.records.length,80),observations:snapshot.observations};
  }
  const receipt=await db.from('atlas_turns').update({status:'completed',answer,evidence,updated_at:new Date().toISOString()}).eq('id',id).eq('owner_id',owner).eq('status','processing');
  if(receipt.error) throw new Error('Result receipt unavailable. Check memory and tasks before repeating a save.');
 }catch(error) {
  const safe=error instanceof Error&&/^(AI connection|Record could|ATLAS did|Result receipt)/.test(error.message)?error.message:'ATLAS could not complete this request. Check saved records before repeating an action; no automatic retry was made.';
  await db.from('atlas_turns').update({status:'failed',answer:safe,updated_at:new Date().toISOString()}).eq('id',id).eq('owner_id',owner).eq('status','processing');
 }
}
