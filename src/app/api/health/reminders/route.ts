import { NextResponse } from 'next/server';
import { requireMemberModuleEntitlement } from '@/lib/memberAgeServer';
import { normalizeHealthRecord } from '@/lib/health/foundation';
import { isVaccination } from '@/lib/health/vaccinations';
export const dynamic='force-dynamic';
export async function GET() {
  const access=await requireMemberModuleEntitlement('health');
  const headers={'Cache-Control':'private, no-store'};
  if(!access.ok) return NextResponse.json({error:'Health access is required.'},{status:access.status,headers});
  const {data,error}=await access.supabase.from('beast_health_records').select('*').eq('owner_id',access.user.id).in('record_type',['profile','procedure']).neq('status','archived').order('updated_at',{ascending:false}).limit(1000);
  if(error || !data || data.length===1000) return NextResponse.json({error:'The complete reminder list could not be loaded.'},{status:503,headers});
  const records=data.map(normalizeHealthRecord).filter(r=>r && isVaccination(r)).map(r=>({...r!,notes:null,source:null,details:{subtype:'vaccination',vaccinationName:r!.details.vaccinationName || r!.title,dueOn:r!.details.dueOn || null,dueSource:r!.details.dueSource || null}}));
  return NextResponse.json({records},{headers});
}
