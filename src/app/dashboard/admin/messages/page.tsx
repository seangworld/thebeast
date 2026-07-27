import { BeastAdminShell } from "../BeastAdminShell";
import { BeastAdminMemberMessagesWorkspace } from "./BeastAdminMemberMessagesWorkspace";

export default function BeastAdminMessagesPage() {
  return (
    <BeastAdminShell
      title="Member Messages"
      description="Review private account and support communication between Beast Administration and individual members."
    >
      <BeastAdminMemberMessagesWorkspace />
    </BeastAdminShell>
  );
}
