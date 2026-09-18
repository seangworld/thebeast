import { BeastAdminProductWorkspace } from "@/app/dashboard/admin/BeastAdminProductWorkspace";
import { findEmpireProduct } from "@/lib/beastAdminEmpire";
import { OperationsWorkspaceShell } from "../OperationsWorkspaceShell";

export default function BeastFusionOperationsPage() {
  return <OperationsWorkspaceShell title="BeastFusion" purpose="Connect company strategy, governed development, digital staff, delivery, and measured outcomes across SEANGWORLD."><BeastAdminProductWorkspace product={findEmpireProduct("beastfusion")} /></OperationsWorkspaceShell>;
}
