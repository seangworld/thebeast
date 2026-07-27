import { BeastAdminShell } from "../BeastAdminShell";
import { BeastAdminMigrationStatusWorkspace } from "./BeastAdminMigrationStatusWorkspace";

export default function BeastAdminMigrationStatusPage() {
  return (
    <BeastAdminShell
      title="Migration Status"
      purpose="Owner-only comparison of repository migrations, authoritative Supabase migration history, and the database objects required by BeastAdmin."
    >
      <BeastAdminMigrationStatusWorkspace />
    </BeastAdminShell>
  );
}
