"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { APP_VERSION_LABEL } from "@/lib/appVersion";
import LogoutButton from "@/app/components/LogoutButton";
import AdminViewAsControl from "@/app/components/AdminViewAsControl";
import {
  BeastBrandMark,
  ModuleNavItem,
  type ModuleKey,
} from "@/app/components/design/DashboardPrimitives";

const primaryNav = [
  { label: "Today", href: "/dashboard", module: "beastos" as ModuleKey },
];

const platformNav = [
  { label: "Calendar", href: "/dashboard/calendar", module: "calendar" as ModuleKey },
  { label: "Notifications", href: "/dashboard/notifications", module: "notifications" as ModuleKey },
  { label: "Timeline", href: "/dashboard/timeline", module: "timeline" as ModuleKey },
  { label: "Search", href: "/dashboard/search", module: "search" as ModuleKey },
];

const moneyNavItems = [
  { label: "Dashboard", href: "/dashboard/money" },
  { label: "Cash Flow", href: "/dashboard/money/cashflow" },
  { label: "Bills", href: "/dashboard/money/cashflow#bills" },
  { label: "Debts", href: "/dashboard/money/debts" },
  { label: "Payoff Plan", href: "/dashboard/money/debts#payoff-plan" },
  { label: "Velocity", href: "/dashboard/money/velocity" },
  { label: "Billing", href: "/dashboard/money/billing" },
  { label: "Settings", href: "/dashboard/money/settings" },
];

const futureMoneyActions = ["Add Bill", "Add Debt"];

const moduleNav: {
  label: string;
  href?: string;
  module: ModuleKey;
  comingSoon: boolean;
}[] = [
  { label: "Health", module: "health" as ModuleKey, comingSoon: true },
  { label: "Home", module: "home" as ModuleKey, comingSoon: true },
  { label: "Projects", module: "projects" as ModuleKey, comingSoon: true },
  { label: "Vehicles", module: "vehicles" as ModuleKey, comingSoon: true },
  { label: "Family", module: "family" as ModuleKey, comingSoon: true },
  { label: "Goals", module: "goals" as ModuleKey, comingSoon: true },
  { label: "Documents", module: "documents" as ModuleKey, comingSoon: true },
];

function getWorkspaceModule(pathname: string): ModuleKey {
  if (pathname.startsWith("/dashboard/money")) return "money";
  if (pathname.startsWith("/dashboard/calendar")) return "calendar";
  if (pathname.startsWith("/dashboard/notifications")) return "notifications";
  if (pathname.startsWith("/dashboard/timeline")) return "timeline";
  if (pathname.startsWith("/dashboard/search")) return "search";

  return "beastos";
}

function getWorkspaceName(module: ModuleKey) {
  if (module === "money") return "BeastMoney";
  if (module === "calendar") return "Calendar";
  if (module === "notifications") return "Notifications";
  if (module === "timeline") return "Timeline";
  if (module === "search") return "Search";

  return "BeastOS";
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [moneyNavOpen, setMoneyNavOpen] = useState(true);
  const pathname = usePathname();
  const workspaceModule = getWorkspaceModule(pathname);
  const isMoneyWorkspace = pathname.startsWith("/dashboard/money");
  function isActiveRoute(href: string) {
    if (href === "/dashboard") {
      return pathname === "/dashboard" || pathname === "/dashboard/today";
    }

    return pathname === href || pathname.startsWith(`${href}/`);
  }

  function NavRail({
    compact = false,
    onNavigate,
  }: {
    compact?: boolean;
    onNavigate?: () => void;
  }) {
    const showMoneyChildren = !compact && (moneyNavOpen || isMoneyWorkspace);
    const moneyActive = isMoneyWorkspace;

    function isMoneyChildActive(href: string) {
      const [path, hash] = href.split("#");

      if (hash) {
        return false;
      }

      return href === "/dashboard/money"
        ? pathname === "/dashboard/money"
        : pathname === href || pathname.startsWith(`${href}/`);
    }

    function MoneyChildLink({
      href,
      label,
      active,
    }: {
      href: string;
      label: string;
      active: boolean;
    }) {
      return (
        <Link
          href={href}
          onClick={onNavigate}
          className={`block rounded-lg border px-3 py-1.5 text-sm font-semibold transition ${
            active
              ? "border-green-400/40 bg-green-400/10 text-green-100"
              : "border-transparent text-[#9aa7b8] hover:border-[#2a3242] hover:bg-[#1a1f2b] hover:text-white"
          }`}
        >
          {label}
        </Link>
      );
    }

    return (
      <div className="flex h-full min-h-0 flex-col">
        <div className={compact ? "flex justify-center px-3 py-4" : "px-4 py-5"}>
          <BeastBrandMark
            module={workspaceModule}
            workspaceName={compact ? "" : getWorkspaceName(workspaceModule)}
            subtitle={compact ? "" : "Platform Shell"}
            size="sm"
            iconOnly={compact}
          />
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-3 pb-4">
          <div className="space-y-6">
            <nav className="space-y-2" aria-label="Primary navigation">
              {!compact ? (
                <div className="px-2 text-xs font-bold uppercase tracking-wide text-[#596579]">
                  Primary
                </div>
              ) : null}
              {primaryNav.map((item) => (
                <div key={item.href} onClick={onNavigate}>
                  <ModuleNavItem
                    label={item.label}
                    href={item.href}
                    module={item.module}
                    active={isActiveRoute(item.href)}
                    compact={compact}
                  />
                </div>
              ))}

              <div>
                {compact ? (
                  <div onClick={onNavigate}>
                    <ModuleNavItem
                      label="Money"
                      href="/dashboard/money"
                      module="money"
                      active={moneyActive}
                      compact={compact}
                    />
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setMoneyNavOpen((open) => !open)}
                    className={`group flex w-full shrink-0 items-center gap-2 whitespace-nowrap rounded-xl border px-3 py-2 text-sm font-bold transition duration-200 sm:px-4 ${
                      moneyActive
                        ? "border-green-400/50 bg-green-400/15 text-green-100"
                        : "border-transparent text-[#c7cfdb] hover:border-[#2a3242] hover:bg-[#1a1f2b]"
                    }`}
                    aria-expanded={showMoneyChildren}
                    aria-controls="money-nav-group"
                  >
                    <span
                      className="h-2 w-2 rounded-full"
                      style={{ background: moneyActive ? "#22c55e" : "#596579" }}
                    />
                    <span className="flex-1 text-left">Money</span>
                    <span className="text-xs text-[#7f8da3]">
                      {showMoneyChildren ? "−" : "+"}
                    </span>
                  </button>
                )}

                {showMoneyChildren ? (
                  <div id="money-nav-group" className="mt-2 space-y-1 pl-4">
                    {moneyNavItems.map((item) => (
                      <MoneyChildLink
                        key={item.label}
                        href={item.href}
                        label={item.label}
                        active={isMoneyChildActive(item.href)}
                      />
                    ))}
                    <div className="pt-2">
                      <div className="px-3 text-[10px] font-bold uppercase tracking-wide text-[#596579]">
                        Future
                      </div>
                      <div className="mt-1 space-y-1">
                        {futureMoneyActions.map((label) => (
                          <span
                            key={label}
                            className="block rounded-lg border border-transparent px-3 py-1.5 text-sm font-semibold text-[#596579]"
                          >
                            {label}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                ) : null}
              </div>

              {platformNav.map((item) => (
                <div key={item.href} onClick={onNavigate}>
                  <ModuleNavItem
                    label={item.label}
                    href={item.href}
                    module={item.module}
                    active={isActiveRoute(item.href)}
                    compact={compact}
                  />
                </div>
              ))}
            </nav>

            <div className="border-t border-[#2a3242]" />

            <nav className="space-y-2" aria-label="BeastOS modules">
              {!compact ? (
                <div className="px-2 text-xs font-bold uppercase tracking-wide text-[#596579]">
                  Modules
                </div>
              ) : null}
              {moduleNav.map((item) => (
                <div key={item.label} onClick={item.comingSoon ? undefined : onNavigate}>
                  <ModuleNavItem
                    label={item.label}
                    href={item.href}
                    module={item.module}
                    active={item.href ? isActiveRoute(item.href) : false}
                    comingSoon={item.comingSoon}
                    compact={compact}
                  />
                </div>
              ))}
            </nav>
          </div>
        </div>

        <AdminViewAsControl compact={compact} surface="sidebar" />

        <div className="border-t border-[#2a3242] p-3">
          <div className="space-y-2">
            <Link
              href="/dashboard/profile"
              onClick={onNavigate}
              className="flex min-h-10 items-center rounded-xl border border-[#2a3242] bg-[#0f1419] px-3 py-2 text-sm font-bold text-[#c7cfdb] transition hover:border-[#38bdf8]/50 hover:bg-[#1a1f2b]"
            >
              {compact ? "P" : "Profile"}
            </Link>
            <Link
              href="/dashboard/settings"
              onClick={onNavigate}
              className="flex min-h-10 items-center rounded-xl border border-[#2a3242] bg-[#0f1419] px-3 py-2 text-sm font-bold text-[#c7cfdb] transition hover:border-[#38bdf8]/50 hover:bg-[#1a1f2b]"
            >
              {compact ? "S" : "Settings"}
            </Link>
            <div className={compact ? "[&>button]:w-full [&>button]:px-2" : "[&>button]:w-full"}>
              <LogoutButton />
            </div>
            {!compact ? (
              <a
                href="/release-notes"
                className="block px-1 text-xs font-semibold text-[#7c8798] transition hover:text-white"
              >
                {APP_VERSION_LABEL}
              </a>
            ) : (
              <a
                href="/release-notes"
                className="block text-center text-[10px] font-bold text-[#7c8798]"
                aria-label={APP_VERSION_LABEL}
              >
                v
              </a>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#11151c] text-white">
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-20 border-r border-[#2a3242] bg-[#0f1419]/98 backdrop-blur md:block lg:w-72">
        <div className="hidden h-full lg:block">
          <NavRail />
        </div>
        <div className="h-full lg:hidden">
          <NavRail compact />
        </div>
      </aside>

      <header className="sticky top-0 z-50 border-b border-[#2a3242] bg-[#11151c]/95 px-3 py-3 backdrop-blur md:hidden">
        <div className="flex items-center justify-between gap-3">
          <BeastBrandMark
            module={workspaceModule}
            workspaceName={getWorkspaceName(workspaceModule)}
            size="sm"
          />
          <button
            type="button"
            onClick={() => setMobileMenuOpen(true)}
            className="rounded-xl border border-[#2a3242] bg-[#0f1419] px-3 py-2 text-sm font-bold text-[#c7cfdb]"
            aria-label="Open navigation menu"
          >
            Menu
          </button>
        </div>
      </header>

      {mobileMenuOpen ? (
        <div className="fixed inset-0 z-[60] md:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-black/60"
            aria-label="Close navigation menu"
            onClick={() => setMobileMenuOpen(false)}
          />
          <div className="relative h-full w-[min(86vw,330px)] border-r border-[#2a3242] bg-[#0f1419] shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#2a3242] px-4 py-3">
              <BeastBrandMark
                module={workspaceModule}
                workspaceName={getWorkspaceName(workspaceModule)}
                size="sm"
              />
              <button
                type="button"
                onClick={() => setMobileMenuOpen(false)}
                className="rounded-lg border border-[#2a3242] px-3 py-2 text-sm font-bold text-[#c7cfdb]"
              >
                Close
              </button>
            </div>
            <NavRail onNavigate={() => setMobileMenuOpen(false)} />
          </div>
        </div>
      ) : null}

      <div className="min-h-screen md:pl-20 lg:pl-72">
        {children}
      </div>
    </div>
  );
}
