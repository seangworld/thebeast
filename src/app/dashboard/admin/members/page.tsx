import { BeastAdminShell } from "../BeastAdminShell";
import { beastAdminMembers } from "@/lib/beastAdmin";

export default function BeastAdminMembersPage() {
  return (
    <BeastAdminShell
      title="Members"
      description="Review member identity, join date, status, and role. Editing controls are reserved for the next admin phase."
    >
      <section className="min-w-0 overflow-hidden rounded-xl border border-[#2a3242] bg-[#111827]">
        <div className="hidden grid-cols-[minmax(0,1.1fr)_minmax(0,1.4fr)_minmax(0,0.8fr)_minmax(0,0.7fr)_minmax(0,0.7fr)_minmax(0,0.8fr)] gap-3 border-b border-[#2a3242] px-4 py-3 text-xs font-black uppercase text-[#7f8da3] xl:grid">
          <span>Name</span>
          <span>Email</span>
          <span>Join Date</span>
          <span>Status</span>
          <span>Role</span>
          <span>Editing</span>
        </div>
        {beastAdminMembers.map((member) => (
          <div key={member.id} className="grid min-w-0 gap-3 border-b border-[#202634] px-4 py-4 text-sm text-[#dbe3ef] last:border-b-0 sm:grid-cols-2 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,1.4fr)_minmax(0,0.8fr)_minmax(0,0.7fr)_minmax(0,0.7fr)_minmax(0,0.8fr)] xl:py-3">
            <span className="min-w-0 font-bold text-white"><span className="mr-2 text-xs uppercase text-[#7f8da3] xl:hidden">Name</span>{member.name}</span>
            <span className="min-w-0 break-all"><span className="mr-2 text-xs font-black uppercase text-[#7f8da3] xl:hidden">Email</span>{member.email}</span>
            <span><span className="mr-2 text-xs font-black uppercase text-[#7f8da3] xl:hidden">Joined</span>{member.joinDate}</span>
            <span><span className="mr-2 text-xs font-black uppercase text-[#7f8da3] xl:hidden">Status</span>{member.status}</span>
            <span><span className="mr-2 text-xs font-black uppercase text-[#7f8da3] xl:hidden">Role</span>{member.role}</span>
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
