import { BeastAdminShell } from "../BeastAdminShell";
import { BeastAdminEcosystemVisualizationWorkspace } from "./BeastAdminEcosystemVisualizationWorkspace";

export default function BeastAdminEcosystemVisualizationPage() {
  return (
    <BeastAdminShell
      title="Ecosystem Visualization"
      purpose="Explore the verified ownership, context, permission, and service relationships connecting BeastOS, BeastFusion, professionals, and applications."
    >
      <BeastAdminEcosystemVisualizationWorkspace />
    </BeastAdminShell>
  );
}
