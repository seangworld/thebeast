import { BeastAdminShell } from "../BeastAdminShell";
import { BeastAdminRoadmapWorkspace } from "./BeastAdminRoadmapWorkspace";

export default function BeastAdminRoadmapPage() {
  return (
    <BeastAdminShell
      title="Canonical Product Roadmap"
      purpose="Read-only governed delivery truth from the accepted BeastFusion projection, with candidate ideas kept in a separate non-canonical intake workspace."
    >
      <BeastAdminRoadmapWorkspace />
    </BeastAdminShell>
  );
}
