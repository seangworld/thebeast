"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { BEAST_MONEY_VERSION_LABEL } from "@/lib/appVersion";
import { ModuleBadge } from "@/app/components/design/DashboardPrimitives";
import { beastMoneyCoreNavigation, isBeastMoneyNavigationActive } from "@/lib/moneyNavigation";

export const beastMoneySections = beastMoneyCoreNavigation;

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
  const pathname = usePathname();
  const [hash, setHash] = useState("");

  useEffect(() => {
    const syncHash = () => setHash(window.location.hash);
    syncHash();
    window.addEventListener("hashchange", syncHash);
    window.addEventListener("popstate", syncHash);
    return () => {
      window.removeEventListener("hashchange", syncHash);
      window.removeEventListener("popstate", syncHash);
    };
  }, [pathname]);

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

        <nav className="beast-module-tabs" aria-label="BeastMoney sections">
          {beastMoneySections.map((item) => {
            const active = isBeastMoneyNavigationActive(item, pathname, hash);
            return <Link key={item.href} href={item.href} className={`beast-module-tab ${active ? "border-green-400/50 bg-green-400/10 text-green-100" : ""}`} aria-current={active ? "page" : undefined}>
              {item.label}
            </Link>;
          })}
        </nav>

        {children}
      </div>
    </main>
  );
}
