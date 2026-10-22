import { notFound } from 'next/navigation';
import { getStaffDossier } from '@/lib/staffDossiers';
import { requireStaffDossierOwner } from '@/lib/server/staffDossierOwner';
import { StaffDossierDetail } from '../StaffDossierDetail';
export const dynamic='force-dynamic';
export default async function StaffDossierPage({params}:{params:Promise<{staffId:string}>}) {
 await requireStaffDossierOwner();
 const {staffId}=await params; const d=getStaffDossier(staffId); if(!d)notFound();
 return <StaffDossierDetail d={d}/>;
}
