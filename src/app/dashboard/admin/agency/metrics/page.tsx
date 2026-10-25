import { BeastAdminShell } from '../../BeastAdminShell';
import { requireStaffDossierOwner } from '@/lib/server/staffDossierOwner';
import { AgencyMetricsContent } from './AgencyMetricsContent';
export const dynamic='force-dynamic';
export default async function AgencyMetricsPage(){
 await requireStaffDossierOwner();
 return <BeastAdminShell title="Beast AI Talent Agency" purpose="Cole After Hours · Private drafts and read-only results. Publishing and automation remain paused."><AgencyMetricsContent/></BeastAdminShell>;
}
