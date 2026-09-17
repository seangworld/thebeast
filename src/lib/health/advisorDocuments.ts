import type { SupabaseClient } from '@supabase/supabase-js';
import { healthFileInput, maximumHealthFileBytes } from './documentFileExtraction';
import type { RuntimeContext } from '../digitalStaffRuntime/types';

export function parseAdvisorDocumentIds(value: unknown, professionalId: string): string[] {
  if (value === undefined) return [];
  if (!Array.isArray(value) || value.length > 2 || value.some(id => typeof id !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id))) throw new Error('Invalid document selection.');
  if (value.length && professionalId !== 'beasthealth.health-advisor') throw new Error('Health document access is unavailable.');
  return Array.from(new Set(value as string[]));
}

/** Download only explicitly selected, member-owned active Health originals through their authenticated client. */
export async function loadAdvisorDocuments(supabase: SupabaseClient, ownerId: string, ids: string[]): Promise<NonNullable<RuntimeContext['documents']>> {
  if (!ids.length) return [];
  const {data, error} = await supabase.from('beast_documents').select('id,title,storage_bucket,storage_path,mime_type,size_bytes,status').eq('owner_id',ownerId).eq('category','Health').in('id',ids).not('status','in','(Archived,Deleted)');
  if (error || !data || data.length !== ids.length) throw new Error('Selected Health document unavailable.');
  if (data.reduce((sum, doc) => sum + Number(doc.size_bytes || 0),0) > maximumHealthFileBytes) throw new Error('Selected documents exceed 10 MB.');
  const documents: NonNullable<RuntimeContext['documents']> = [];
  let totalBytes = 0;
  for (const doc of data) {
    const {data:file,error:downloadError} = await supabase.storage.from(doc.storage_bucket).download(doc.storage_path);
    if (downloadError || !file) throw new Error('Selected original could not be read.');
    totalBytes += file.size;
    if (totalBytes > maximumHealthFileBytes) throw new Error('Selected documents exceed 10 MB.');
    const content = healthFileInput(new Uint8Array(await file.arrayBuffer()),doc.mime_type);
    documents.push({id:doc.id,title:doc.title,content});
  }
  return documents;
}
