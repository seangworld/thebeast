"use client";

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
  { label: "Money", href: "/dashboard/money", module: "money" as ModuleKey },
  { label: "Calendar", href: "/dashboard/calendar", module: "calendar" as ModuleKey },
  { label: "Notifications", href: "/dashboard/notifications", module: "notifications" as ModuleKey },
  { label: "Timeline", href: "/dashboard/timeline", module: "timeline" as ModuleKey },
  { label: "Search", href: "/dashboard/search", module: "search" as ModuleKey },
];

const futureModules = [
  { label: "Health", module: "health" as ModuleKey },
  { label: "Home", module: "home" as ModuleKey },
  { label: "Projects", module: "projects" as ModuleKey },
  { label: "Vehicles", module: "vehicles" as ModuleKey },
  { label: "Family", module: "family" as ModuleKey },
  { label: "Goals", module: "goals" as ModuleKey },
  { label: "Documents", module: "documents" as ModuleKey },
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
  const pathname = usePathname();
  const today = new Date().toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
  const workspaceModule = getWorkspaceModule(pathname);
  function isActiveRoute(href: string) {
    if (href === "/dashboard") {
      return pathname === "/dashboard" || pathname === "/dashboard/today";
    }

    return pathname === href || pathname.startsWith(`${href}/`);
  }

  return (
    <div className="min-h-screen bg-[#11151c] text-white">
      <header className="sticky top-0 z-50 border-b border-[#2a3242] bg-[#11151c]/95 backdrop-blur">
        <div className="mx-auto flex w-full max-w-[1600px] flex-col gap-4 px-3 py-3 sm:px-4 lg:flex-row lg:items-center lg:justify-between lg:gap-5">
          <div className="flex min-w-0 flex-col gap-3">
            <BeastBrandMark
              module={workspaceModule}
              workspaceName={getWorkspaceName(workspaceModule)}
              subtitle="Platform Shell"
              size="sm"
            />

            <nav className="flex max-w-full items-center gap-2 overflow-x-auto pb-1 md:pb-0">
              {primaryNav.map((item) => (
                <ModuleNavItem
                  key={item.href}
                  label={item.label}
                  href={item.href}
                  module={item.module}
                  active={isActiveRoute(item.href)}
                />
              ))}

              {futureModules.map((module) => (
                <ModuleNavItem
                  key={module.label}
                  label={module.label}
                  module={module.module}
                  comingSoon
                />
              ))}
            </nav>
          </div>

          <div className="flex items-center justify-between gap-3 md:justify-end">
            <AdminViewAsControl />
          <div className="hidden text-right text-sm text-[#7f8da3] md:block">
  <div>{today}</div>
  <div><a
  href="/release-notes"
  className="text-xs text-[#7c8798] hover:text-white transition no-underline"
>
  {APP_VERSION_LABEL}
</a></div>
</div>

            <LogoutButton />
          </div>
        </div>
      </header>

      {children}
    </div>
  );
}
