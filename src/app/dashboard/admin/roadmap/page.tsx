import { BeastAdminShell } from "../BeastAdminShell";
import { BeastAdminRoadmapWorkspace } from "./BeastAdminRoadmapWorkspace";

export default function BeastAdminRoadmapPage() {
  return (
    <BeastAdminShell
      title="Product Roadmap"
      purpose="One owner-managed delivery view across BeastOS, its applications, BeastFusion, SEANGWORLD, and future products."
    >
      <BeastAdminRoadmapWorkspace />
    </BeastAdminShell>
  );
}
