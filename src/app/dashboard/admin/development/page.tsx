import { BeastAdminShell } from "../BeastAdminShell";
import { BeastAdminDevelopmentConsoleWorkspace } from "./BeastAdminDevelopmentConsoleWorkspace";

export default function BeastAdminDevelopmentConsolePage() {
  return (
    <BeastAdminShell
      title="Development Console"
      description="Owner-only delivery context assembled from the canonical roadmap, Release Center, generated version manifest, and verified deployment metadata."
    >
      <BeastAdminDevelopmentConsoleWorkspace />
    </BeastAdminShell>
  );
}
