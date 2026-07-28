import { BeastAdminShell } from "../BeastAdminShell";
import { BeastAdminExecutionHistoryWorkspace } from "./BeastAdminExecutionHistoryWorkspace";

export default function BeastAdminExecutionHistoryPage() {
  return (
    <BeastAdminShell
      title="Execution History"
      purpose="Review durable execution, approval, recommendation, confidence, outcome, and follow-up evidence without changing member records."
    >
      <BeastAdminExecutionHistoryWorkspace />
    </BeastAdminShell>
  );
}
