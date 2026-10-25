import { BeastAdminShell } from '../../BeastAdminShell';
import { requireStaffDossierOwner } from '@/lib/server/staffDossierOwner';
import { AgencyMetricsContent } from './AgencyMetricsContent';
export const dynamic='force-dynamic';
export default async function AgencyMetricsPage(){
 await requireStaffDossierOwner();
 return <BeastAdminShell title="Beast AI Talent Agency" purpose="Cole After Hours · Private daily drafts, exact-post approval and read-only results. Unattended publishing is off."><AgencyMetricsContent/></BeastAdminShell>;
}
