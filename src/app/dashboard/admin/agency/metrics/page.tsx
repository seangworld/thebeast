import { BeastAdminShell } from '../../BeastAdminShell';
import { requireStaffDossierOwner } from '@/lib/server/staffDossierOwner';
import { AgencyMetricsContent } from './AgencyMetricsContent';
export const dynamic='force-dynamic';
export default async function AgencyMetricsPage(){
 await requireStaffDossierOwner();
 return <BeastAdminShell title="Agency" purpose="Owner-controlled Virtual Talent. Cole setup first; Leila deferred. No automation or DMs."><AgencyMetricsContent/></BeastAdminShell>;
}
