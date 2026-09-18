import { BeastAdminRevenueCenterWorkspace } from "@/app/dashboard/admin/ads/BeastAdminRevenueCenterWorkspace";
import { OperationsWorkspaceShell } from "../OperationsWorkspaceShell";

export default function RevenuePage() {
  return <OperationsWorkspaceShell title="Revenue" purpose="Monitor connected revenue sources and govern privacy-safe advertising placements across the ecosystem."><BeastAdminRevenueCenterWorkspace /></OperationsWorkspaceShell>;
}
