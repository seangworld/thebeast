import { BeastAdminProductWorkspace } from "@/app/dashboard/admin/BeastAdminProductWorkspace";
import { findEmpireProduct } from "@/lib/beastAdminEmpire";
import { OperationsWorkspaceShell } from "../OperationsWorkspaceShell";

export default function ChangeTheWorldOperationsPage() {
  return <OperationsWorkspaceShell title="Change the World" purpose="Civic-action product controls, participation, and impact analytics."><BeastAdminProductWorkspace product={findEmpireProduct("change-the-world")} /></OperationsWorkspaceShell>;
}
