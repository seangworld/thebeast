import { BeastAdminProductWorkspace } from "@/app/dashboard/admin/BeastAdminProductWorkspace";
import { findEmpireProduct } from "@/lib/beastAdminEmpire";
import { OperationsWorkspaceShell } from "../OperationsWorkspaceShell";

export default function CompanyOperationsPage() {
  return <OperationsWorkspaceShell title="SEANGWORLD.com" purpose="Company-site controls and analytics in one owner-only product section."><BeastAdminProductWorkspace product={findEmpireProduct("seangworld")} /></OperationsWorkspaceShell>;
}
