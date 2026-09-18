import { BeastHunterWorkspace } from "@/app/dashboard/admin/intelligence/hunter/BeastHunterWorkspace";
import { OperationsWorkspaceShell } from "../OperationsWorkspaceShell";

export default function OpportunitiesPage() {
  return <OperationsWorkspaceShell title="BeastHunter" purpose="Define the opportunity you want, filter the market first, then rank evidence-backed opportunities by urgency, commercial value, risk, and SEANGWORLD fit."><BeastHunterWorkspace /></OperationsWorkspaceShell>;
}
