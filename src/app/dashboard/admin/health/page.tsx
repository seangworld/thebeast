import { BeastAdminShell } from "../BeastAdminShell";
import { BeastAdminPlatformHealthWorkspace } from "./BeastAdminPlatformHealthWorkspace";

export default function BeastAdminPlatformHealthPage() {
  return (
    <BeastAdminShell
      title="Platform Health"
      description="Monitor verified platform services and identify errors, warnings, and observability gaps quickly."
    >
      <BeastAdminPlatformHealthWorkspace />
    </BeastAdminShell>
  );
}
