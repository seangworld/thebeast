import { BeastAdminShell } from "../BeastAdminShell";
import { BeastAdminFeedbackWorkspace } from "./BeastAdminFeedbackWorkspace";

export default function BeastAdminFeedbackPage() {
  return (
    <BeastAdminShell
      title="Beta Feedback"
      description="Acknowledge member feedback, connect it to delivery work, and close the loop when an improvement is released."
    >
      <BeastAdminFeedbackWorkspace />
    </BeastAdminShell>
  );
}
