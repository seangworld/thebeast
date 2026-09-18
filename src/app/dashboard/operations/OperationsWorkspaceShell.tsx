import { ModuleBadge } from "@/app/components/design/DashboardPrimitives";

export function OperationsWorkspaceShell({ title, purpose, actions, children }: {
  title: string;
  purpose: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <main className="beast-page">
      <div className="beast-container space-y-6">
        <header className="beast-page-header" aria-label={`${title} workspace`}>
          <div className="flex min-w-0 flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
            <div className="min-w-0 max-w-4xl space-y-4">
              <span title="SEANGWORLD HQ is available only to the verified owner in Admin view.">
                <ModuleBadge module="admin" label="SEANGWORLD HQ · Owner Only" />
              </span>
              <div className="min-w-0 space-y-2">
                <h1 className="beast-title">{title}</h1>
                <p className="beast-subtitle">{purpose}</p>
              </div>
            </div>
            {actions ? <div className="flex min-w-0 flex-wrap items-center gap-3 lg:shrink-0 lg:justify-end" aria-label={`${title} actions`}>{actions}</div> : null}
          </div>
        </header>
        <details className="rounded-xl border border-cyan-300/20 bg-cyan-300/[0.06] px-4 py-3 text-sm text-slate-300">
          <summary className="cursor-pointer font-black text-cyan-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-cyan-200">Owner guidance</summary>
          <div className="mt-3 space-y-2 leading-6">
            <p>{purpose}</p>
            <p>Keep business decisions, publishing, revenue, and cross-system orchestration here. Use BeastAdmin for member administration, platform health, releases, and technical governance.</p>
            <p>Review source, timestamp, limitations, and unavailable states before acting. A missing or stale source is not a confirmed zero.</p>
          </div>
        </details>
        {children}
      </div>
    </main>
  );
}
