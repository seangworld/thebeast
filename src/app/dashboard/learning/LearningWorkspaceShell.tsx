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
      <div className="beast-container space-y-8">
        <section className="beast-page-header">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="min-w-0 space-y-4">
              <ModuleBadge module="learning" label={eyebrow || "BeastEducation"} />
              <h1 className="beast-title">{title}</h1>
              <p className="beast-subtitle">{description}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {actions}
              <Link href="/dashboard/education" className="beast-button-secondary">
                Back to Learning Mission Control
              </Link>
            </div>
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
    <DashboardCard accent="learning" className="text-center">
      <div className="mx-auto max-w-xl py-8 sm:py-12">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl border border-indigo-300/30 bg-indigo-300/10 text-lg font-black text-indigo-100" aria-hidden="true">
          L
        </div>
        <h2 className="mt-5 text-2xl font-black text-white">{title}</h2>
        <p className="mt-3 text-sm leading-6 text-[#aeb8c7]">{description}</p>
        <Link href={action.href} className="beast-button mt-6 inline-flex">
          {action.label}
        </Link>
      </div>
    </DashboardCard>
  );
}

export function LearningWorkspaceLoading() {
  return (
    <main className="beast-page" aria-busy="true" aria-label="Loading Learning workspace">
      <div className="beast-container space-y-8">
        <div className="animate-pulse space-y-4 rounded-2xl border border-[#2a3242] bg-[#151b26] p-5 sm:p-7">
          <div className="h-6 w-36 rounded-full bg-[#2a3242]" />
          <div className="h-10 w-2/3 rounded bg-[#2a3242]" />
          <div className="h-5 w-full max-w-2xl rounded bg-[#222b3a]" />
        </div>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {[0, 1, 2].map((item) => (
            <div key={item} className="h-52 animate-pulse rounded-2xl border border-[#2a3242] bg-[#151b26]" />
          ))}
        </div>
        <span className="sr-only" role="status">Loading your Learning workspace.</span>
      </div>
    </main>
  );
}
