import { BeastAdminShell } from "../BeastAdminShell";
import { DashboardCard, SectionHeader } from "@/app/components/design/DashboardPrimitives";
import {
  beastAdminBetaAssignments,
  buildBetaAssignmentRows,
  getBetaAssignableModuleLabels,
} from "@/lib/beastAdmin";

export default function BeastAdminSettingsPage() {
  const betaModuleLabels = getBetaAssignableModuleLabels();
  const assignmentRows = buildBetaAssignmentRows();

  return (
    <BeastAdminShell
      title="Settings"
      description="Owner-only settings foundation for module visibility and beta access controls."
    >
      <DashboardCard accent="admin">
        <SectionHeader
          eyebrow="Beta Access"
          title="Beta assignments are separate from user role"
          description={`${beastAdminBetaAssignments.length} assignment is seeded. Supported beta apps: ${betaModuleLabels.join(", ")}.`}
        />
        <div className="mt-5 grid gap-4 lg:grid-cols-[1fr_1fr]">
          <div className="rounded-xl border border-[#2a3242] bg-[#111827] p-4">
            <h2 className="text-sm font-black uppercase text-[#7f8da3]">
              Supported beta apps
            </h2>
            <div className="mt-3 flex flex-wrap gap-2">
              {betaModuleLabels.map((label) => (
                <span
                  key={label}
                  className="rounded-full border border-amber-300/40 bg-amber-300/10 px-3 py-1 text-xs font-black text-amber-100"
                >
                  {label}
                </span>
              ))}
            </div>
          </div>
          <div className="rounded-xl border border-[#2a3242] bg-[#111827] p-4">
            <h2 className="text-sm font-black uppercase text-[#7f8da3]">
              Current assignments
            </h2>
            <div className="mt-3 space-y-2">
              {assignmentRows.map((assignment) => (
                <div
                  key={assignment.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-[#2a3242] px-3 py-2 text-sm text-[#dbe3ef]"
                >
                  <span>
                    <span className="font-bold text-white">
                      {assignment.memberName}
                    </span>{" "}
                    <span className="text-[#9aa7b8]">
                      ({assignment.memberRole})
                    </span>
                  </span>
                  <span>{assignment.moduleName}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
        <button
          type="button"
          disabled
          className="mt-5 rounded-lg border border-[#2a3242] px-4 py-2 text-sm font-black text-[#7f8da3]"
        >
          Assign Beta Access Soon
        </button>
      </DashboardCard>
      <DashboardCard accent="admin">
        <SectionHeader
          eyebrow="Visibility"
          title="Module visibility controls"
          description="Supported states are Admin Only, Beta, Released, and Disabled. Interactive editing is reserved for the next phase."
        />
      </DashboardCard>
    </BeastAdminShell>
  );
}
