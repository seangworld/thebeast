"use client";

import { BEAST_MONEY_VERSION_LABEL } from "@/lib/appVersion";
import { PlatformPageHeader } from "@/app/components/design/DashboardPrimitives";

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
        {showPageHeader ? (
          <PlatformPageHeader
            module="money"
            badge={BEAST_MONEY_VERSION_LABEL}
            title={title}
            description={description}
            actions={actions}
          />
        ) : null}

        {children}
      </div>
    </main>
  );
}
