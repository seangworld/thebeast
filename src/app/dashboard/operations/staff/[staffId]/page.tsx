import { notFound, redirect } from 'next/navigation';
import { getStaffDossier } from '@/lib/staffDossiers';
import { requireStaffDossierOwner } from '@/lib/server/staffDossierOwner';
import { StaffDossierDetail } from '../StaffDossierDetail';
export const dynamic='force-dynamic';
export default async function StaffDossierPage({params}:{params:Promise<{staffId:string}>}) {
 await requireStaffDossierOwner();
 const {staffId}=await params;
 if(['beastfusion.policy.product_specialist','product_specialist'].includes(staffId))redirect('/dashboard/operations/staff');
 const d=getStaffDossier(staffId); if(!d)notFound();
 return <StaffDossierDetail d={d}/>;
}
