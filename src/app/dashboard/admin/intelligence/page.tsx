import { BeastAdminShell } from "../BeastAdminShell";
import { SeangworldIntelligenceWorkspace } from "./SeangworldIntelligenceWorkspace";

export default function SeangworldIntelligencePage() {
  return (
    <BeastAdminShell
      title="SEANGWORLD Intelligence"
      purpose="Aggregate verified public-site analytics, search visibility, and ecosystem telemetry without inventing provider data."
    >
      <SeangworldIntelligenceWorkspace />
    </BeastAdminShell>
  );
}
