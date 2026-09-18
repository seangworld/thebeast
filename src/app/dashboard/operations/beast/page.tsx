import Link from "next/link";
import { OperationsWorkspaceShell } from "../OperationsWorkspaceShell";
import { BeastAdminProductWorkspace } from "../../admin/BeastAdminProductWorkspace";
import { findEmpireProduct } from "@/lib/beastAdminEmpire";

export default function BeastBusinessPage() {
  return <OperationsWorkspaceShell title="The Beast" purpose="The member product business, including BeastMoney, BeastHealth, and the rest of the Beast package." actions={<Link href="/dashboard/admin" className="min-h-11 rounded-xl bg-amber-200 px-4 py-3 text-sm font-bold text-slate-950">Manage The Beast</Link>}>
    <BeastAdminProductWorkspace product={findEmpireProduct("the-beast")} />
  </OperationsWorkspaceShell>;
}
