import { BeastAdminShell } from "../BeastAdminShell";
import { BeastAdminMemberTimelineWorkspace } from "./BeastAdminMemberTimelineWorkspace";

export default function BeastAdminMembersPage() {
  return (
    <BeastAdminShell
      title="Member Timeline"
      description="Follow each member’s Beast journey from registration through real module activity, without exposing raw private content."
    >
      <BeastAdminMemberTimelineWorkspace />
    </BeastAdminShell>
  );
}
