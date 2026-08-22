import { BeastAdminShell } from "../BeastAdminShell";
import { BeastAdminReleaseCenterWorkspace } from "./BeastAdminReleaseCenterWorkspace";

export default function BeastAdminReleaseCenterPage() {
  return (
    <BeastAdminShell
      title="Canonical Release Center"
      purpose="Read-only governed release truth from the accepted BeastFusion projection, with operational annotations kept explicitly separate."
    >
      <BeastAdminReleaseCenterWorkspace />
    </BeastAdminShell>
  );
}
