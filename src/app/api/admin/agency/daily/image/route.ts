import {socialOwner,socialJson} from '@/lib/server/social/auth';
import {privateDailyImage} from '@/lib/server/agency/daily';
import {isUuid} from '@/lib/marketingSocial';
export const dynamic='force-dynamic';export const runtime='nodejs';
export async function GET(request:Request){const owner=await socialOwner();if(!owner)return socialJson({error:'Owner access required.'},403);const id=new URL(request.url).searchParams.get('job');if(!isUuid(id))return socialJson({error:'Choose a saved draft.'},404);try{return new Response(new Uint8Array(await privateDailyImage(owner.id,id!)),{headers:{'Content-Type':'image/jpeg','Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff','Content-Disposition':'inline; filename="cole-daily-draft.jpeg"'}});}catch{return socialJson({error:'Private draft image unavailable.'},503);}}
