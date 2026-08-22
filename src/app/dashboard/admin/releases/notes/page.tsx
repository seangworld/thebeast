import { BeastAdminShell } from "../../BeastAdminShell";
import { BeastAdminReleaseNotesWorkspace } from "../BeastAdminReleaseNotesWorkspace";

export default function BeastAdminReleaseNotesPage() {
  return (
    <BeastAdminShell
      title="Operational Release Annotations"
      purpose="Maintain owner observations and supplemental release evidence without changing canonical release, validation, deployment, or governance state."
    >
      <BeastAdminReleaseNotesWorkspace />
    </BeastAdminShell>
  );
}
