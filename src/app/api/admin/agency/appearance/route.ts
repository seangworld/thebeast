import {readFile} from 'node:fs/promises';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
import {socialOwner,socialJson} from '@/lib/server/social/auth';
import {talentAppearance} from '@/lib/agencyAppearance';
export const dynamic='force-dynamic';
export const runtime='nodejs';
export async function GET(request:Request){
 const owner=await socialOwner();
 if(!owner)return socialJson({error:'Owner access required.'},403);
 const talent=new URL(request.url).searchParams.get('talent');
 if(talent!=='cole'&&talent!=='leila')return socialJson({error:'Unknown appearance reference.'},404);
 try{
  const reference=talentAppearance[talent];
  let bytes:Uint8Array;
  if(talent==='cole'){
   const cole=talentAppearance.cole;
   const stored=await owner.client.storage.from('beast-marketing-media').download(`${owner.id}/agency-appearance/${cole.storageFilename}`,{}, {cache:'no-store'});
   if(stored.error||!stored.data||stored.data.size!==cole.bytes)throw Error('Reference unavailable');
   bytes=new Uint8Array(await stored.data.arrayBuffer());
  }else{bytes=await readFile(join(process.cwd(),'assets','agency',talentAppearance.leila.filename));}
  if(createHash('sha256').update(bytes).digest('hex')!==reference.sha256)throw Error('Reference mismatch');
  return new Response(new Uint8Array(bytes),{headers:{'Content-Type':talent==='cole'?'image/png':'image/jpeg','Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff','Content-Disposition':`inline; filename="${reference.filename}"`}});
 }catch{return socialJson({error:'Appearance reference unavailable.'},503);}
}
