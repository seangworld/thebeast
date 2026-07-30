import { BeastAdminShell } from "../BeastAdminShell";
import { BeastAdminRevenueCenterWorkspace } from "./BeastAdminRevenueCenterWorkspace";

export default function BeastAdminRevenueCenterPage() {
  return (
    <BeastAdminShell
      title="Revenue"
      purpose="Monitor connected revenue sources and govern privacy-safe advertising placements across the ecosystem."
    >
      <BeastAdminRevenueCenterWorkspace />
    </BeastAdminShell>
  );
}
