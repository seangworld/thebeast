import { BeastAdminShell } from "../BeastAdminShell";
import { BeastAdminReleaseCenterWorkspace } from "./BeastAdminReleaseCenterWorkspace";

export default function BeastAdminReleaseCenterPage() {
  return (
    <BeastAdminShell
      title="Release Center"
      purpose="Maintain complete, evidence-backed release history across every Beast product."
    >
      <BeastAdminReleaseCenterWorkspace />
    </BeastAdminShell>
  );
}
