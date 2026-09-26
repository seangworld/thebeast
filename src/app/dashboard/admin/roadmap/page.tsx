import { BeastAdminShell } from "../BeastAdminShell";
import { BeastAdminRoadmapWorkspace } from "./BeastAdminRoadmapWorkspace";

export default function BeastAdminRoadmapPage() {
  return (
    <BeastAdminShell
      title="Active Work"
      purpose="Current governed work, blockers, authorization, and delivery state from BeastFusion. Historical roadmap documents stay out of routine operations."
    >
      <BeastAdminRoadmapWorkspace />
    </BeastAdminShell>
  );
}
