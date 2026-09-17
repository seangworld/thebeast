import { NextResponse } from "next/server";
import { extractHealthDocumentProposals, fingerprintHealthDocument, healthDocumentExtractionVersion } from "@/lib/health/documentExtraction";
import { extractHealthFile, maximumHealthFileBytes, healthFileInput } from "@/lib/health/documentFileExtraction";
import { createRouteClient } from "@/lib/supabase/server";
import { requireMemberModuleEntitlement } from "@/lib/memberAgeServer";
import { acquireDigitalStaffRequestLease } from "@/lib/digitalStaffRuntime/requestBudget";
export const dynamic = "force-dynamic";
export const maxDuration = 90;
const json = (body: unknown, status = 200) => NextResponse.json(body, {status, headers:{'Cache-Control':'private, no-store'}});
export async function POST(request: Request, context: {params: Promise<{documentId:string}>}) {
  const supabase = createRouteClient();
  const {data:{user},error:authError} = await supabase.auth.getUser();
  if(authError || !user) return json({error:'Authentication required.'},401);
  const access = await requireMemberModuleEntitlement('health',{supabase,user});
  if(!access.ok) return json({error:'BeastHealth access is required.'},access.status);
  const {documentId} = await context.params;
  const body = await request.json().catch(()=>null) as {consent?:boolean;text?:string;source?:string}|null;
  if(body?.consent !== true) return json({error:'Choose document processing before continuing.'},400);
  const fromFile = body.source === 'file';
  const text = typeof body.text === 'string' ? body.text.trim() : '';
  if(!fromFile && (!text || text.length > 250000)) return json({error:'Paste between 1 and 250,000 characters.'},400);
  const {data:document,error:documentError} = await supabase.from('beast_documents').select('id,storage_bucket,storage_path,mime_type,size_bytes,status').eq('id',documentId).eq('owner_id',user.id).eq('category','Health').maybeSingle();
  if(documentError || !document || ['Archived','Deleted'].includes(document.status)) return json({error:'Health document not found.'},404);
  const lease = acquireDigitalStaffRequestLease(user.id,'beasthealth.health-advisor');
  if(!lease.ok) return json({error:'Another health request is running. Try again shortly.'},429);
  let extractionId = '';
  try {
    let bytes = new TextEncoder().encode(text) as Uint8Array;
    if(fromFile) {
      if(document.size_bytes > maximumHealthFileBytes) return json({error:'Use a file up to 10 MB, or paste relevant text.'},400);
      const {data,error} = await supabase.storage.from(document.storage_bucket).download(document.storage_path);
      if(error || !data) return json({error:'The original document could not be read.'},503);
      bytes = new Uint8Array(await data.arrayBuffer());
      healthFileInput(bytes,document.mime_type);
    }
    const version = `${healthDocumentExtractionVersion}-${fromFile?'file':'text'}`;
    const fingerprint = fingerprintHealthDocument(bytes);
    const {data:remembered,error:readError} = await supabase.from('beast_health_document_extractions').select('id,status,created_at').eq('owner_id',user.id).eq('document_id',documentId).eq('content_fingerprint',fingerprint).eq('extraction_version',version).maybeSingle();
    if(readError) throw new Error('Document review is temporarily unavailable.');
    if(remembered?.status === 'ready') return json({extractionId:remembered.id,status:'ready',reused:true});
    if(remembered?.status === 'processing' && Date.now()-Date.parse(remembered.created_at)<120000) return json({error:'This document is already being processed. Reload the review shortly.'},409);
    if(remembered) {
      // Delete only failed/stale runs; ready results and approved items are never retried.
      const {error} = await supabase.from('beast_health_document_extractions').delete().eq('id',remembered.id).eq('owner_id',user.id).eq('status',remembered.status);
      if(error) throw new Error('The previous extraction could not be retried.');
    }
    const {data:run,error:runError} = await supabase.from('beast_health_document_extractions').insert({owner_id:user.id,document_id:documentId,content_fingerprint:fingerprint,extraction_version:version,status:'processing'}).select('id').single();
    if(runError || !run) return json({error:'The document is already processing or could not be queued. Reload the review.'},409);
    extractionId=run.id;
    const parsed = fromFile ? await extractHealthFile(bytes,document.mime_type) : extractHealthDocumentProposals(text);
    if(parsed.items.length > 200) throw new Error('Too many proposals. Use a shorter document section.');
    if(parsed.items.length) {
      const {error} = await supabase.from('beast_health_document_extraction_items').insert(parsed.items.map(i=>({owner_id:user.id,extraction_id:run.id,category:i.category,label:i.label,value:i.value,occurred_on:i.occurredOn,source_excerpt:i.sourceExcerpt,confidence:i.confidence})));
      if(error) throw new Error('Review proposals could not be saved.');
    }
    const {data:finished,error} = await supabase.from('beast_health_document_extractions').update({status:'ready',summary:parsed.summary,completed_at:new Date().toISOString()}).eq('id',run.id).eq('owner_id',user.id).eq('status','processing').select('id').single();
    if(error || !finished) throw new Error('Could not confirm that document processing finished.');
    return json({extractionId:run.id,status:'ready',reused:false});
  } catch {
    if(extractionId) await supabase.from('beast_health_document_extractions').update({status:'failed',error_message:'Processing failed. The original file is safe; no health records were created.'}).eq('id',extractionId).eq('owner_id',user.id).eq('status','processing');
    return json({error:'Could not analyze this document. Your original upload is safe. Try a smaller readable PDF/image, retry, or paste text instead.'},503);
  } finally { lease.release(); }
}
