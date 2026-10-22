import Link from "next/link";
import { BeastAdminShell } from "../BeastAdminShell";
import { BeastAdminStaffWorkspace } from "./BeastAdminStaffWorkspace";

export default function BeastAdminStaffPage() {
  return (
    <BeastAdminShell
      title="Staff"
      actions={<Link href="/dashboard/operations/staff" className="min-h-11 rounded-lg border border-cyan-300/30 px-4 py-3 text-cyan-200">SW HQ Staff Management →</Link>}
      purpose="Manager view of BeastFusion development staff, current assignments, capability levels, authority boundaries, and known limitations."
    >
      <BeastAdminStaffWorkspace />
    </BeastAdminShell>
  );
}
