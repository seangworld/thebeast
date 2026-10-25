import {readFile} from 'node:fs/promises';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
import {socialOwner,socialJson} from '@/lib/server/social/auth';
import {talentAppearance} from '@/lib/agencyAppearance';
export const dynamic='force-dynamic';
export const runtime='nodejs';
export async function GET(request:Request){
 if(!await socialOwner())return socialJson({error:'Owner access required.'},403);
 const talent=new URL(request.url).searchParams.get('talent');
 if(talent!=='cole'&&talent!=='leila')return socialJson({error:'Unknown appearance reference.'},404);
 try{
  const reference=talentAppearance[talent];
  const bytes=await readFile(join(process.cwd(),'assets','agency',reference.filename));
  if(createHash('sha256').update(bytes).digest('hex')!==reference.sha256)throw Error('Reference mismatch');
  return new Response(new Uint8Array(bytes),{headers:{'Content-Type':'image/jpeg','Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff','Content-Disposition':`inline; filename="${reference.filename}"`}});
 }catch{return socialJson({error:'Appearance reference unavailable.'},503);}
}
