import { BeastAdminShell } from "../BeastAdminShell";
import { BeastAdminStaffWorkspace } from "./BeastAdminStaffWorkspace";

export default function BeastAdminStaffPage() {
  return (
    <BeastAdminShell
      title="Staff"
      purpose="Manager view of BeastFusion development staff, current assignments, capability levels, authority boundaries, and known limitations."
    >
      <BeastAdminStaffWorkspace />
    </BeastAdminShell>
  );
}
