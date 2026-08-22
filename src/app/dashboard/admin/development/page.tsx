import { BeastAdminShell } from "../BeastAdminShell";
import { BeastAdminDevelopmentConsoleWorkspace } from "./BeastAdminDevelopmentConsoleWorkspace";
import { BeastAdminRepositoryReleaseIntelligenceWorkspace } from "./BeastAdminRepositoryReleaseIntelligenceWorkspace";

export default function BeastAdminDevelopmentConsolePage() {
  return (
    <BeastAdminShell
      title="Development Console"
      purpose="Owner-only canonical governance, repository, release, and deployment evidence with legacy operational notes kept explicitly separate."
    >
      <div className="space-y-6">
        <BeastAdminRepositoryReleaseIntelligenceWorkspace />
        <BeastAdminDevelopmentConsoleWorkspace />
      </div>
    </BeastAdminShell>
  );
}
