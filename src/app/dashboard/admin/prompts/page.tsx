import { BeastAdminShell } from "../BeastAdminShell";
import { BeastAdminPromptLibraryWorkspace } from "./BeastAdminPromptLibraryWorkspace";

export default function BeastAdminPromptLibraryPage() {
  return (
    <BeastAdminShell
      title="Prompt Library"
      description="Manage AI prompts as owner-controlled, versioned assets across the Beast ecosystem."
    >
      <BeastAdminPromptLibraryWorkspace />
    </BeastAdminShell>
  );
}
