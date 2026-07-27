import { BeastAdminShell } from "../BeastAdminShell";
import { BeastAdminFeatureFlagsWorkspace } from "./BeastAdminFeatureFlagsWorkspace";

export default function BeastAdminFeatureFlagsPage() {
  return (
    <BeastAdminShell
      title="Feature Flags"
      purpose="Control feature visibility by module, role, and individual member through one owner-managed release system."
    >
      <BeastAdminFeatureFlagsWorkspace />
    </BeastAdminShell>
  );
}
