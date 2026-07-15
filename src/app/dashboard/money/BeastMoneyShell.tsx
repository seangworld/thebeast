import Link from "next/link";
import { BEAST_MONEY_VERSION_LABEL } from "@/lib/appVersion";
import { ModuleBadge } from "@/app/components/design/DashboardPrimitives";

export const beastMoneySections = [
  { label: "Dashboard", href: "/dashboard/money" },
  { label: "Cash Flow", href: "/dashboard/money/cashflow" },
  { label: "Bills", href: "/dashboard/money/cashflow#bills" },
  { label: "Debts", href: "/dashboard/money/debts" },
  { label: "Payoff Plan", href: "/dashboard/money/debts#payoff-plan" },
  { label: "Velocity", href: "/dashboard/money/velocity" },
  { label: "Billing", href: "/dashboard/money/billing" },
  { label: "Settings", href: "/dashboard/money/settings" },
];

export function BeastMoneyShell({
  title,
  description,
  actions,
  children,
}: {
  title: string;
  description: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <main className="beast-page">
      <div className="beast-container money-page-stack">
        <section className="beast-page-header">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="space-y-4">
              <ModuleBadge module="money" label={BEAST_MONEY_VERSION_LABEL} />
              <h1 className="beast-title">{title}</h1>
              <p className="beast-subtitle">{description}</p>
            </div>
            {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
          </div>
        </section>

        <nav className="beast-module-tabs" aria-label="BeastMoney sections">
          {beastMoneySections.map((item) => (
            <Link key={item.href} href={item.href} className="beast-module-tab">
              {item.label}
            </Link>
          ))}
        </nav>

        {children}
      </div>
    </main>
  );
}
