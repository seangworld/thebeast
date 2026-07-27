import { BeastAdminShell } from "../../BeastAdminShell";
import { BeastAdminMigrationSqlExplorerWorkspace } from "./BeastAdminMigrationSqlExplorerWorkspace";

export default function BeastAdminMigrationSqlExplorerPage() {
  return (
    <BeastAdminShell
      title="Migration SQL Explorer"
      purpose="Owner-only, read-only inspection of repository migration purpose, database objects, safety signals, environment status, and complete SQL source."
    >
      <BeastAdminMigrationSqlExplorerWorkspace />
    </BeastAdminShell>
  );
}
