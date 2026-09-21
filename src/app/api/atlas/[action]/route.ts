import { NextResponse, after } from 'next/server';
import { randomBytes } from 'node:crypto';
import { atlasAuth, atlasDB, atlasSnapshot, hashAtlasToken, reserveAtlas, runAtlasTurn } from '@/lib/atlas/server';
import { atlasText, isAtlasId } from '@/lib/atlas/shared';
import { createOpenAIRequestHeaders } from '@/lib/digitalStaffRuntime/provider';
export const runtime='nodejs';
export const dynamic='force-dynamic';
export const maxDuration=120;
const json=(v:unknown,status=200)=>NextResponse.json(v,{status,headers:{'Cache-Control':'private, no-store'}});
type Context={params:Promise<{action:string}>};
async function boundedBody(request:Request,max=16000) {
 const reader=request.body?.getReader(); if(!reader) throw new Error('Request body required.');
 const chunks:Uint8Array[]=[]; let size=0;
 while(true){const r=await reader.read(); if(r.done)break; size+=r.value.byteLength; if(size>max){await reader.cancel();throw new Error('Request is too large.');}chunks.push(r.value);}
 return JSON.parse(Buffer.concat(chunks).toString('utf8')) as Record<string,unknown>;
}
export async function GET(request:Request,context:Context) {
 try {
  const {action}=await context.params; const owner=await atlasAuth(request,action==='devices'); if(!owner)return json({error:'Owner access required.'},403);
  if(action==='state') return json(await atlasSnapshot(owner));
  if(action==='devices') {const r=await atlasDB().from('atlas_devices').select('id,label,created_at,expires_at,revoked_at').eq('owner_id',owner).order('created_at',{ascending:false});if(r.error)throw new Error('Devices unavailable.');return json({devices:r.data});}
  return json({error:'Unknown action.'},404);
 }catch{return json({error:'ATLAS is unavailable. Please try again shortly.'},503);}
}
export async function POST(request:Request,context:Context) {
 try {
  const {action}=await context.params; const owner=await atlasAuth(request,['pair','revoke','record'].includes(action)); if(!owner)return json({error:'Owner access required.'},403);
  const db=atlasDB();
  if(action==='transcribe') {
   if(!process.env.OPENAI_API_KEY)return json({error:'AI voice is not configured.'},503);
   // Bound the raw multipart bytes before parsing, including chunked requests.
   const reader=request.body?.getReader();if(!reader)return json({error:'Audio required.'},400);
   const chunks:Uint8Array[]=[];let size=0;
   while(true){const r=await reader.read();if(r.done)break;size+=r.value.byteLength;if(size>4_000_000){await reader.cancel();return json({error:'Recording exceeds 4 MB.'},413);}chunks.push(r.value);}
   const form=await new Response(Buffer.concat(chunks),{headers:{'Content-Type':request.headers.get('content-type')||''}}).formData();
   const file=form.get('audio');if(!(file instanceof File)||file.size<100||!['audio/webm','audio/mp4','audio/wav','audio/ogg','audio/mpeg'].includes(file.type.split(';')[0]))return json({error:'Use a supported audio recording.'},400);
   await reserveAtlas(owner,'transcribe');const body=new FormData();body.set('file',file);body.set('model','gpt-4o-mini-transcribe');body.set('language','en');body.set('prompt','ATLAS, Sean, SEANGWORLD, BEAST, VIP STATUS.');
   const headers=createOpenAIRequestHeaders(crypto.randomUUID());headers.delete('Content-Type');
   const r=await fetch('https://api.openai.com/v1/audio/transcriptions',{method:'POST',headers,body,signal:AbortSignal.timeout(45000)});
   if(!r.ok)return json({error:'Voice transcription unavailable. You can still type.'},502);
   const result=await r.json();return json({text:typeof result.text==='string'?result.text.slice(0,4000):''});
  }
  const body=await boundedBody(request);
  if(action==='turn') {
   if(!isAtlasId(body.id))return json({error:'A valid request ID is required.'},400);
   const question=atlasText(body.question);
   const exists=await db.from('atlas_turns').select('id').eq('id',body.id).eq('owner_id',owner).maybeSingle();
   if(exists.error)throw new Error('Storage unavailable.');
   if(exists.data)return json({id:body.id},202);
   await reserveAtlas(owner,'turn');
   const r=await db.from('atlas_turns').insert({id:body.id,owner_id:owner,question});
   if(r.error)return json({error:'Could not queue this request. Refresh before retrying.'},409);
   after(()=>runAtlasTurn(body.id as string,owner));return json({id:body.id},202);
  }
  if(action==='record') {
   if(!isAtlasId(body.id)||!['complete','reopen','delete'].includes(String(body.operation)))return json({error:'Invalid record action.'},400);
   const r=body.operation==='delete'?await db.from('atlas_records').delete().eq('id',body.id).eq('owner_id',owner).select('id'):await db.from('atlas_records').update({completed:body.operation==='complete',updated_at:new Date().toISOString()}).eq('id',body.id).eq('owner_id',owner).eq('kind','task').select('id');
   if(r.error||!r.data?.length)return json({error:'Record was not changed.'},409);return json({saved:true});
  }
  if(action==='pair') {
   const label=atlasText(body.label,80);const token='atlas_'+randomBytes(32).toString('hex');
   const count=await db.from('atlas_devices').select('id',{count:'exact',head:true}).eq('owner_id',owner).is('revoked_at',null).gt('expires_at',new Date().toISOString());
   if(count.error||(count.count||0)>=5)return json({error:'Revoke an old device before pairing another (maximum 5).'},409);
   const r=await db.from('atlas_devices').insert({owner_id:owner,label,token_hash:hashAtlasToken(token),expires_at:new Date(Date.now()+90*86400000).toISOString()}).select('id,expires_at').single();
   if(r.error)throw new Error('Pairing unavailable.');return json({token,...r.data});
  }
  if(action==='revoke') {
   if(!isAtlasId(body.id))return json({error:'Invalid device.'},400);
   const r=await db.from('atlas_devices').update({revoked_at:new Date().toISOString()}).eq('id',body.id).eq('owner_id',owner);if(r.error)throw new Error('Revocation unavailable.');return json({revoked:true});
  }
  if(action==='speech') {
   if(!process.env.OPENAI_API_KEY)return json({error:'AI voice is not configured.'},503);
   const input=atlasText(body.text,4000);await reserveAtlas(owner,'speech');
   const r=await fetch('https://api.openai.com/v1/audio/speech',{method:'POST',headers:createOpenAIRequestHeaders(crypto.randomUUID()),body:JSON.stringify({model:'gpt-4o-mini-tts',voice:'onyx',input,instructions:'Speak as ATLAS: a calm, natural American male assistant. Conversational, confident, warm, and concise. Use a neutral American accent.',response_format:'mp3'}),signal:AbortSignal.timeout(45000)});
   if(!r.ok)return json({error:'Speech unavailable. Your text answer is still saved.'},502);
   return new Response(r.body,{headers:{'Content-Type':'audio/mpeg','Cache-Control':'private, no-store'}});
  }
  return json({error:'Unknown action.'},404);
 }catch(error){const limit=error instanceof Error&&error.message.startsWith('Daily ATLAS');return json({error:limit?error.message:'ATLAS could not process this request. Refresh to check its status before repeating an action.'},limit?429:400);}
}
