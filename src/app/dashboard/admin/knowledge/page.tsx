import { BeastAdminShell } from "../BeastAdminShell";
import { BeastAdminKnowledgeInspectorWorkspace } from "./BeastAdminKnowledgeInspectorWorkspace";

export default function BeastAdminKnowledgeInspectorPage() {
  return (
    <BeastAdminShell
      title="Knowledge Inspector"
      description="Inspect the evidence, confidence, open questions, and durable memory behind each professional’s understanding without changing member data."
    >
      <BeastAdminKnowledgeInspectorWorkspace />
    </BeastAdminShell>
  );
}
