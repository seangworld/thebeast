import { NextResponse } from 'next/server';
import { verifyCronAuthorization } from '@/lib/standingObservation';
import { atlasDB, runAtlasTurn } from '@/lib/atlas/server';
export const runtime='nodejs'; export const dynamic='force-dynamic'; export const maxDuration=120;
export async function GET(request:Request) {
 if(!verifyCronAuthorization(request.headers.get('authorization'),process.env.CRON_SECRET))return NextResponse.json({error:'Not authorized.'},{status:401});
 const db=atlasDB();
 const stale=await db.from('atlas_turns').update({status:'failed',answer:'This request was interrupted. Check saved records before repeating an action; it was not automatically retried.',updated_at:new Date().toISOString()}).eq('status','processing').lt('updated_at',new Date(Date.now()-5*60000).toISOString());
 if(stale.error)return NextResponse.json({error:'Queue unavailable.'},{status:503});
 const next=await db.from('atlas_turns').select('id,owner_id').eq('status','queued').order('created_at',{ascending:true}).limit(1).maybeSingle();
 if(next.error)return NextResponse.json({error:'Queue unavailable.'},{status:503});
 if(next.data)await runAtlasTurn(next.data.id,next.data.owner_id);
 return NextResponse.json({checked:true,claimed:!!next.data});
}
