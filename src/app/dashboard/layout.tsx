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
  moduleAccents,
  type ModuleKey,
} from "@/app/components/design/DashboardPrimitives";
import {
  beastModuleNavigation,
  primaryNavigation,
  sharedNavigation,
  type ModuleChildNavItem,
  type ModuleNavSection,
} from "@/lib/moduleNavigation";

function getWorkspaceModule(pathname: string): ModuleKey {
  if (pathname.startsWith("/dashboard/money")) return "money";
  if (pathname.startsWith("/dashboard/learning")) return "learning";
  if (pathname.startsWith("/dashboard/calendar")) return "calendar";
  if (pathname.startsWith("/dashboard/notifications")) return "notifications";
  if (pathname.startsWith("/dashboard/timeline")) return "timeline";
  if (pathname.startsWith("/dashboard/search")) return "search";
  if (pathname.startsWith("/dashboard/uploads")) return "documents";

  return "beastos";
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [expandedModules, setExpandedModules] = useState<Record<string, boolean>>({});
  const pathname = usePathname();
  const workspaceModule = getWorkspaceModule(pathname);

  function isActiveRoute(href: string) {
    const [path] = href.split("#");

    if (href === "/dashboard") {
      return pathname === "/dashboard";
    }

    return pathname === path || pathname.startsWith(`${path}/`);
  }

  function isModuleActive(item: ModuleNavSection) {
    return item.href ? isActiveRoute(item.href) : workspaceModule === item.module;
  }

  function isChildActive(item: ModuleChildNavItem) {
    const [path, hash] = item.href.split("#");

    if (hash) return false;

    return path === "/dashboard" ? isActiveRoute(path) : pathname === path || pathname.startsWith(`${path}/`);
  }

  function NavRail({
    compact = false,
    onNavigate,
  }: {
    compact?: boolean;
    onNavigate?: () => void;
  }) {
    function ChildLink({
      item,
      module,
    }: {
      item: ModuleChildNavItem;
      module: ModuleKey;
    }) {
      const accent = moduleAccents[module];
      const active = isChildActive(item);

      return (
        <Link
          href={item.href}
          onClick={onNavigate}
          className={`block rounded-lg border px-3 py-1.5 text-sm font-semibold transition ${
            active
              ? `${accent.border} ${accent.bg} ${accent.text}`
              : "border-transparent text-[#9aa7b8] hover:border-[#2a3242] hover:bg-[#1a1f2b] hover:text-white"
          }`}
        >
          {item.label}
        </Link>
      );
    }

    function ExpandableModuleNavItem({ item }: { item: ModuleNavSection }) {
      const hasChildren = Boolean(item.children?.length);
      const active = isModuleActive(item);
      const expanded =
        !compact &&
        hasChildren &&
        (expandedModules[item.module] ?? active);
      const navGroupId = `${item.module}-nav-group`;

      if (compact || !hasChildren) {
        return (
          <div onClick={item.comingSoon ? undefined : onNavigate}>
            <ModuleNavItem
              label={item.label}
              href={item.href}
              module={item.module}
              active={active}
              comingSoon={item.comingSoon}
              compact={compact}
            />
          </div>
        );
      }

      return (
        <div>
          <button
            type="button"
            onClick={() =>
              setExpandedModules((current) => ({
                ...current,
                [item.module]: !expanded,
              }))
            }
            className={`group flex w-full shrink-0 items-center gap-2 whitespace-nowrap rounded-xl border px-3 py-2 text-sm font-bold transition duration-200 sm:px-4 ${
              active
                ? `${moduleAccents[item.module].border} ${moduleAccents[item.module].bg} ${moduleAccents[item.module].text}`
                : "border-transparent text-[#c7cfdb] hover:border-[#2a3242] hover:bg-[#1a1f2b]"
            }`}
            aria-expanded={expanded}
            aria-controls={navGroupId}
          >
            <span
              className="h-2 w-2 rounded-full"
              style={{
                background: active ? moduleAccents[item.module].color : "#596579",
              }}
            />
            <span className="flex-1 text-left">{item.label}</span>
            <span className="text-xs text-[#7f8da3]">
              {expanded ? "−" : "+"}
            </span>
          </button>

          {expanded ? (
            <div id={navGroupId} className="mt-2 space-y-1 pl-4">
              {item.children?.filter((child) => !child.future).map((child) => (
                <ChildLink key={child.label} item={child} module={item.module} />
              ))}
              {item.children?.some((child) => child.future) ? (
                <div className="pt-2">
                  <div className="px-3 text-[10px] font-bold uppercase tracking-wide text-[#596579]">
                    Future
                  </div>
                  <div className="mt-1 space-y-1">
                    {item.children
                      .filter((child) => child.future)
                      .map((child) => (
                        <span
                          key={child.label}
                          className="block rounded-lg border border-transparent px-3 py-1.5 text-sm font-semibold text-[#596579]"
                        >
                          {child.label}
                        </span>
                      ))}
                  </div>
                </div>
              ) : null}
            </div>
          ) : null}
        </div>
      );
    }

    return (
      <div className="flex h-full min-h-0 flex-col">
        <div className={compact ? "flex justify-center px-3 py-4" : "px-4 py-5"}>
          <BeastBrandMark
            module={workspaceModule}
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
                  Navigation
                </div>
              ) : null}
              {primaryNavigation.map((item) => (
                <div key={item.label} onClick={onNavigate}>
                  <ModuleNavItem
                    label={item.label}
                    href={item.href}
                    module={item.module}
                    active={item.href ? isActiveRoute(item.href) : false}
                    compact={compact}
                  />
                </div>
              ))}
            </nav>

            <div className="border-t border-[#2a3242]" />

            <nav className="space-y-2" aria-label="BeastOS modules">
              {!compact ? (
                <div className="px-2 text-xs font-bold uppercase tracking-wide text-[#596579]">
                  Beast Modules
                </div>
              ) : null}
              {beastModuleNavigation.map((item) => (
                <ExpandableModuleNavItem key={item.label} item={item} />
              ))}
            </nav>

            <div className="border-t border-[#2a3242]" />

            <nav className="space-y-2" aria-label="Shared navigation">
              {!compact ? (
                <div className="px-2 text-xs font-bold uppercase tracking-wide text-[#596579]">
                  Shared
                </div>
              ) : null}
              {sharedNavigation.map((item) => (
                <div key={item.label} onClick={onNavigate}>
                  <ModuleNavItem
                    label={item.label}
                    href={item.href}
                    module={item.module}
                    active={item.href ? isActiveRoute(item.href) : false}
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
