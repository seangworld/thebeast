import Link from "next/link";
import { BeastAdminShell } from "./BeastAdminShell";
import { beastAdminNavigation } from "@/lib/moduleNavigation";

export default function BeastAdminDashboardPage() {
  const groups = Array.from(new Set(beastAdminNavigation.children?.map((item) => item.group)));
  return <BeastAdminShell title="BeastAdmin" purpose="Manage The Beast, its members, and platform controls." actions={<Link href="/dashboard/operations" className="min-h-11 rounded-xl bg-amber-200 px-4 py-3 text-sm font-bold text-slate-950">Open Operations</Link>}>
    <div className="grid gap-5 md:grid-cols-2">
      {groups.map((group) => <section key={group} className="rounded-2xl border border-white/10 bg-slate-900/60 p-5">
        <h2 className="mb-3 text-lg font-bold text-white">{group}</h2>
        <nav aria-label={group} className="grid gap-2">{beastAdminNavigation.children?.filter((item) => item.group === group).map((item) => <Link key={item.href} href={item.href} className="min-h-11 rounded-lg px-3 py-3 text-sm font-semibold text-slate-300 hover:bg-white/5 hover:text-white">{item.label}</Link>)}</nav>
      </section>)}
    </div>
  </BeastAdminShell>;
}
