import Link from "next/link";
import {
  DashboardCard,
  ModuleBadge,
} from "@/app/components/design/DashboardPrimitives";

export function LearningWorkspaceShell({
  title,
  description,
  eyebrow,
  actions,
  children,
}: {
  title: string;
  description: string;
  eyebrow?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <main className="beast-page">
      <div className="beast-container space-y-6 sm:space-y-8">
        <section className="beast-page-header">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="min-w-0 space-y-3 sm:space-y-4">
              <ModuleBadge module="learning" label={eyebrow || "BeastEducation"} />
              <h1 className="beast-title">{title}</h1>
              <p className="beast-subtitle">{description}</p>
            </div>
            {actions ? (
              <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                {actions}
              </div>
            ) : null}
          </div>
        </section>
        {children}
      </div>
    </main>
  );
}

export function LearningEmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action: { label: string; href: string };
}) {
  return (
    <DashboardCard accent="learning" className="overflow-hidden text-center">
      <div className="relative mx-auto max-w-xl py-9 sm:py-14">
        <div className="pointer-events-none absolute left-1/2 top-0 h-40 w-40 -translate-x-1/2 rounded-full bg-indigo-400/10 blur-3xl" aria-hidden="true" />
        <div className="relative mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-indigo-300/30 bg-indigo-300/10 text-lg font-black text-indigo-100 shadow-[0_12px_35px_rgba(99,102,241,0.16)]" aria-hidden="true">
          L
        </div>
        <h2 className="relative mt-6 text-2xl font-black tracking-tight text-white sm:text-3xl">{title}</h2>
        <p className="relative mt-3 text-sm leading-6 text-[#aeb8c7] sm:text-base sm:leading-7">{description}</p>
        <Link href={action.href} className="beast-button relative mt-7 inline-flex w-full justify-center sm:w-auto">
          {action.label}
        </Link>
      </div>
    </DashboardCard>
  );
}

export function LearningWorkspaceLoading() {
  return (
    <main className="beast-page" aria-busy="true" aria-label="Loading Learning workspace">
      <div className="beast-container space-y-6 sm:space-y-8">
        <div className="space-y-4 rounded-2xl border border-[#2a3242] bg-[#151b26] p-5 motion-safe:animate-pulse sm:p-7">
          <div className="h-6 w-36 rounded-full bg-gradient-to-r from-[#2a3242] to-[#354055]" />
          <div className="h-10 w-3/4 max-w-xl rounded-lg bg-[#2a3242] sm:h-12" />
          <div className="h-5 w-full max-w-2xl rounded bg-[#222b3a]" />
        </div>
        <div className="grid gap-5 md:grid-cols-2 2xl:grid-cols-3">
          {[0, 1, 2, 3, 4, 5].map((item) => (
            <div key={item} className="h-56 rounded-2xl border border-[#2a3242] bg-gradient-to-br from-[#151b26] to-[#101620] motion-safe:animate-pulse" />
          ))}
        </div>
        <span className="sr-only" role="status">Loading your Learning workspace.</span>
      </div>
    </main>
  );
}
