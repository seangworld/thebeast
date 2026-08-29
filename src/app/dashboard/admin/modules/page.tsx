import { BeastAdminShell } from "../BeastAdminShell";
import { beastModuleRegistry, getModuleVisibilityLabel } from "@/lib/moduleRegistry";
import { beastAdminPortfolio } from "@/lib/beastAdminPortfolio";
import { BeastAdminCanonicalPortfolioWorkspace } from "./BeastAdminCanonicalPortfolioWorkspace";
import { ProductRoadmapStatusBadge } from "@/app/components/ProductRoadmapVisibility";
import { productRoadmapItems } from "@/lib/productRoadmapVisibility";

export default function BeastAdminModulesPage() {
  return (
    <BeastAdminShell
      title="Modules"
      purpose="Canonical BeastFusion product portfolio with Beast runtime module configuration kept explicitly separate."
    >
      <BeastAdminCanonicalPortfolioWorkspace />
      <section className="mb-6 rounded-2xl border border-amber-300/20 bg-amber-300/[0.04] p-5">
        <h2 className="text-lg font-black text-white">Member and public Product Roadmap mirror</h2>
        <p className="mt-2 text-sm leading-6 text-slate-300">
          Presentation-only BO-UX-002 allowlist. BeastFusion remains canonical;
          this surface cannot edit status, authorize work, or expose private roadmap records.
        </p>
        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {productRoadmapItems.map((item) => (
            <article key={item.slug} className="rounded-xl border border-white/10 bg-[#111827] p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-xs font-black uppercase text-slate-400">{item.product}</span>
                <ProductRoadmapStatusBadge status={item.status} />
              </div>
              <h3 className="mt-3 font-black text-white">{item.capability}</h3>
              <p className="mt-2 text-sm leading-6 text-slate-300">{item.availability}</p>
              <p className="mt-3 font-mono text-xs text-slate-500">{item.sourcePackage}</p>
            </article>
          ))}
        </div>
      </section>
      <section className="mb-6 rounded-2xl border border-white/10 bg-[#111827] p-5">
        <h2 className="text-lg font-black text-white">Generated operational portfolio</h2>
        <p className="mt-2 text-sm leading-6 text-slate-400">
          Supplemental generated identities for runtime comparison only. The canonical portfolio above remains authoritative.
        </p>
        <div className="mt-4 overflow-x-auto" tabIndex={0} aria-label="Current ecosystem portfolio, horizontally scrollable">
          <table className="min-w-[48rem] w-full text-left text-sm">
            <thead className="text-slate-400"><tr><th className="p-3">Product</th><th className="p-3">Version</th><th className="p-3">Lifecycle</th><th className="p-3">Production</th><th className="p-3">Authority</th></tr></thead>
            <tbody>{beastAdminPortfolio.map((entry) => <tr key={`${entry.id}-${entry.product}`} className="border-t border-white/10 text-slate-200"><td className="p-3 font-bold text-white">{entry.product}</td><td className="p-3">{entry.version}</td><td className="p-3">{entry.lifecycle}</td><td className="p-3">{entry.production}</td><td className="p-3 text-slate-400">{entry.source}</td></tr>)}</tbody>
          </table>
        </div>
      </section>
      <section className="grid gap-4 lg:grid-cols-2">
        {beastModuleRegistry.map((module) => (
          <article key={module.identifier} className="rounded-xl border border-[#2a3242] bg-[#111827] p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-black text-white">{module.name}</h2>
                <p className="text-sm text-[#9aa7b8]">{module.identifier}</p>
              </div>
              <span className="rounded-full border border-amber-300/40 bg-amber-300/10 px-3 py-1 text-xs font-black text-amber-100">
                {getModuleVisibilityLabel(module.visibility)}
              </span>
            </div>
            <dl className="mt-4 grid gap-3 text-sm text-[#dbe3ef] sm:grid-cols-2">
              <div><dt className="font-bold text-[#7f8da3]">Version</dt><dd>{module.version}</dd></div>
              <div><dt className="font-bold text-[#7f8da3]">Status</dt><dd>{module.status}</dd></div>
              <div><dt className="font-bold text-[#7f8da3]">Enabled</dt><dd>{module.enabled ? "Yes" : "No"}</dd></div>
              <div><dt className="font-bold text-[#7f8da3]">Beta</dt><dd>{module.beta ? "Yes" : "No"}</dd></div>
            </dl>
            <p className="mt-4 text-sm leading-6 text-[#c7cfdb]">{module.ownerNotes}</p>
          </article>
        ))}
      </section>
    </BeastAdminShell>
  );
}
