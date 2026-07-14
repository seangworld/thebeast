import { BeastAdminShell } from "../BeastAdminShell";
import { beastAdminMembers } from "@/lib/beastAdmin";

export default function BeastAdminMembersPage() {
  return (
    <BeastAdminShell
      title="Members"
      description="Review member identity, join date, status, and role. Editing controls are reserved for the next admin phase."
    >
      <section className="overflow-hidden rounded-xl border border-[#2a3242] bg-[#111827]">
        <div className="grid grid-cols-[1.1fr_1.4fr_0.8fr_0.7fr_0.7fr_0.8fr] gap-3 border-b border-[#2a3242] px-4 py-3 text-xs font-black uppercase text-[#7f8da3]">
          <span>Name</span>
          <span>Email</span>
          <span>Join Date</span>
          <span>Status</span>
          <span>Role</span>
          <span>Editing</span>
        </div>
        {beastAdminMembers.map((member) => (
          <div key={member.id} className="grid grid-cols-[1.1fr_1.4fr_0.8fr_0.7fr_0.7fr_0.8fr] gap-3 border-b border-[#202634] px-4 py-3 text-sm text-[#dbe3ef] last:border-b-0">
            <span className="font-bold text-white">{member.name}</span>
            <span>{member.email}</span>
            <span>{member.joinDate}</span>
            <span>{member.status}</span>
            <span>{member.role}</span>
            <button
              type="button"
              disabled
              className="w-fit rounded-lg border border-[#2a3242] px-3 py-1 text-xs font-black text-[#7f8da3]"
              aria-label={`Editing for ${member.name} is reserved for a future admin phase`}
            >
              Edit Soon
            </button>
          </div>
        ))}
      </section>
    </BeastAdminShell>
  );
}
