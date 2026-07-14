import { BeastAdminShell } from "../BeastAdminShell";
import { beastAdminMembers } from "@/lib/beastAdmin";

export default function BeastAdminMembersPage() {
  return (
    <BeastAdminShell
      title="Members"
      description="Review member identity, join date, status, and role. Editing controls are reserved for the next admin phase."
    >
      <section className="overflow-hidden rounded-xl border border-[#2a3242] bg-[#111827]">
        <div className="grid grid-cols-5 gap-3 border-b border-[#2a3242] px-4 py-3 text-xs font-black uppercase text-[#7f8da3]">
          <span>Name</span>
          <span>Email</span>
          <span>Join Date</span>
          <span>Status</span>
          <span>Role</span>
        </div>
        {beastAdminMembers.map((member) => (
          <div key={member.id} className="grid grid-cols-5 gap-3 border-b border-[#202634] px-4 py-3 text-sm text-[#dbe3ef] last:border-b-0">
            <span className="font-bold text-white">{member.name}</span>
            <span>{member.email}</span>
            <span>{member.joinDate}</span>
            <span>{member.status}</span>
            <span>{member.role}</span>
          </div>
        ))}
      </section>
    </BeastAdminShell>
  );
}
