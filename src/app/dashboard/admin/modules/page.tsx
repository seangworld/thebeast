import { BeastAdminShell } from "../BeastAdminShell";
import { beastModuleRegistry, getModuleVisibilityLabel } from "@/lib/moduleRegistry";
import { beastAdminPortfolio } from "@/lib/beastAdminPortfolio";

export default function BeastAdminModulesPage() {
  return (
    <BeastAdminShell
      title="Modules"
      purpose="Central registry for Beast applications, visibility, status, beta flags, and owner notes."
    >
      <section className="mb-6 rounded-2xl border border-white/10 bg-[#111827] p-5">
        <h2 className="text-lg font-black text-white">Current ecosystem portfolio</h2>
        <p className="mt-2 text-sm leading-6 text-slate-400">
          Static operational projection generated from BeastFusion version identities. Owner-only and internal components remain distinct from released products.
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
