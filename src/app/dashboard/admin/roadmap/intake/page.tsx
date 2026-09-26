import { BeastAdminShell } from "../../BeastAdminShell";
import { BeastAdminRoadmapIntakeWorkspace } from "../BeastAdminRoadmapIntakeWorkspace";

export default function BeastAdminRoadmapIntakePage() {
  return (
    <BeastAdminShell
      title="Work Candidate Intake"
      purpose="Capture owner ideas, BeastHunter handoffs, and private annotations without granting canonical status, approval, authorization, or execution."
    >
      <BeastAdminRoadmapIntakeWorkspace />
    </BeastAdminShell>
  );
}
