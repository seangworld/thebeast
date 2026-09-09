import { BeastAdminShell } from "../BeastAdminShell";
import { DashboardCard, SectionHeader } from "@/app/components/design/DashboardPrimitives";
import { empireCostCategories, empireProducts } from "@/lib/beastAdminEmpire";
import { CompanyCostsWorkspace } from "./CompanyCostsWorkspace";

export default function EmpireControlPage() {
  return (
    <BeastAdminShell title="Empire Overview" purpose="Private cross-product operating costs, cost recovery, and product control boundaries.">
      <DashboardCard accent="admin">
        <SectionHeader eyebrow="CEO only" title="Cost to run the empire" description="A verified monthly total will appear only after every required provider or owner-entered expense has evidence." />
        <CompanyCostsWorkspace />
        <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {empireCostCategories.map((category) => <div key={category.id} className="rounded-xl border border-[#2a3242] bg-[#111827] p-4"><p className="font-black text-white">{category.label}</p><p className="mt-2 text-sm text-amber-200">Not connected</p><p className="mt-1 text-xs leading-5 text-[#7f8da3]">Required evidence: {category.evidence}</p></div>)}
        </div>
        <div className="mt-5 rounded-xl border border-dashed border-amber-300/25 bg-amber-300/[0.04] p-4 text-sm leading-6 text-slate-300">
          Cost-recovery goal: unavailable until verified monthly costs and revenue/support receipts are connected. This financial view remains inside CEO access.
        </div>
      </DashboardCard>
      <section className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {empireProducts.map((product) => <article key={product.id} className="rounded-xl border border-white/10 bg-[#111827] p-4"><p className="text-xs font-black uppercase tracking-wide text-amber-200">Product</p><h2 className="mt-2 text-lg font-black text-white">{product.name}</h2><p className="mt-2 text-sm leading-6 text-slate-400">{product.purpose}</p></article>)}
      </section>
    </BeastAdminShell>
  );
}
