import Link from "next/link";
import {
  DashboardCard,
  SectionHeader,
} from "@/app/components/design/DashboardPrimitives";
import { BeastAdminShell } from "../BeastAdminShell";

export default function BeastAdminSettingsPage() {
  return (
    <BeastAdminShell
      title="Settings"
      purpose="Owner-only entry points for live BeastAdmin access and visibility controls."
    >
      <DashboardCard accent="admin">
        <SectionHeader
          eyebrow="Beta Access"
          title="Manage live assignments in Feature Flags"
          description="Beta access is resolved from persisted module, role, and member assignments. This page does not display seeded members or placeholder assignments."
        />
        <div className="mt-5 rounded-xl border border-[#2a3242] bg-[#111827] p-4">
          <h2 className="font-black text-white">Authoritative source</h2>
          <p className="mt-2 text-sm leading-6 text-[#c7cfdb]">
            Feature definitions and assignments come from{" "}
            <code className="text-amber-100">
              beast_admin_feature_flags
            </code>{" "}
            and{" "}
            <code className="text-amber-100">
              beast_admin_feature_flag_assignments
            </code>
            . Member email and name are joined from Supabase Auth and the
            shared public profile at read time.
          </p>
          <Link
            href="/dashboard/admin/flags"
            className="mt-4 inline-flex min-h-11 items-center rounded-lg border border-amber-300/30 bg-amber-300/10 px-4 py-2 text-sm font-black text-amber-100 transition hover:border-amber-200 hover:bg-amber-200/20"
          >
            Open Feature Flags
          </Link>
        </div>
      </DashboardCard>

      <DashboardCard accent="admin">
        <SectionHeader
          eyebrow="Member Identity"
          title="Audit identity sources in Member Timeline"
          description="The Members workspace documents whether each displayed value comes from Supabase Auth, public profiles, or derived activity."
        />
        <Link
          href="/dashboard/admin/members"
          className="mt-5 inline-flex min-h-11 items-center rounded-lg border border-amber-300/30 bg-amber-300/10 px-4 py-2 text-sm font-black text-amber-100 transition hover:border-amber-200 hover:bg-amber-200/20"
        >
          Open Member Timeline
        </Link>
      </DashboardCard>
    </BeastAdminShell>
  );
}
