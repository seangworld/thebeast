"use client";

import { BEAST_MONEY_VERSION_LABEL } from "@/lib/appVersion";
import { ModuleBadge } from "@/app/components/design/DashboardPrimitives";

export function BeastMoneyShell({
  title,
  description,
  actions,
  children,
  showPageHeader = true,
}: {
  title: string;
  description: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
  showPageHeader?: boolean;
}) {
  return (
    <main className="beast-page">
      <div className="beast-container money-page-stack">
        {showPageHeader ? <section className="beast-page-header">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="space-y-4">
              <ModuleBadge module="money" label={BEAST_MONEY_VERSION_LABEL} />
              <h1 className="beast-title">{title}</h1>
              <p className="beast-subtitle">{description}</p>
            </div>
            {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
          </div>
        </section> : null}

        {children}
      </div>
    </main>
  );
}
