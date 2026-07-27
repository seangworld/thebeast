import { BeastAdminShell } from "../BeastAdminShell";
import { BeastAdminMemberManagementWorkspace } from "./BeastAdminMemberManagementWorkspace";

export default function BeastAdminMembersPage() {
  return (
    <BeastAdminShell
      title="Member Directory"
      description="Review authoritative account identity, access, beta assignments, and permissioned activity without exposing sensitive Auth metadata to members."
    >
      <BeastAdminMemberManagementWorkspace />
    </BeastAdminShell>
  );
}
