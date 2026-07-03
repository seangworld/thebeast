"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { APP_VERSION_LABEL } from "@/lib/appVersion";
import LogoutButton from "@/app/components/LogoutButton";
import AdminViewAsControl from "@/app/components/AdminViewAsControl";

const primaryNav = [
  { label: "Today", href: "/dashboard" },
  { label: "Money", href: "/dashboard/money" },
  { label: "Calendar", href: "/dashboard/calendar" },
  { label: "Notifications", href: "/dashboard/notifications" },
  { label: "Timeline", href: "/dashboard/timeline" },
  { label: "Search", href: "/dashboard/search" },
];

const futureModules = [
  "Health",
  "Home",
  "Projects",
  "Vehicles",
  "Family",
  "Goals",
  "Documents",
];

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
  function isActiveRoute(href: string) {
    if (href === "/dashboard") {
      return pathname === "/dashboard" || pathname === "/dashboard/today";
    }

    return pathname === href || pathname.startsWith(`${href}/`);
  }

  function navClass(href: string) {
    const active = isActiveRoute(href);

    return active
      ? "shrink-0 whitespace-nowrap rounded-lg border border-[#38bdf8] bg-[#38bdf8]/10 px-3 py-2 text-sm font-semibold text-[#38bdf8] sm:px-4"
      : "shrink-0 whitespace-nowrap rounded-lg border border-transparent px-3 py-2 text-sm font-semibold text-[#c7cfdb] transition hover:border-[#2a3242] hover:bg-[#1a1f2b] sm:px-4";
  }

  return (
    <div className="min-h-screen bg-[#11151c] text-white">
      <header className="sticky top-0 z-50 border-b border-[#2a3242] bg-[#11151c]/95 backdrop-blur">
        <div className="mx-auto flex w-full max-w-[1600px] flex-col gap-3 px-3 py-3 sm:px-4 md:flex-row md:items-center md:justify-between md:gap-4 md:py-4">
          <div className="flex min-w-0 flex-col gap-3">
          <div className="flex items-center gap-3">
            <div className="shrink-0 text-lg font-bold">BeastOS</div>
            <div className="hidden rounded border border-[#2a3242] bg-[#0f1419] px-2 py-1 text-xs font-semibold text-[#7f8da3] sm:block">
              Platform Shell
            </div>
          </div>

            <nav className="flex max-w-full items-center gap-2 overflow-x-auto pb-1 md:pb-0">
              {primaryNav.map((item) => (
                <Link key={item.href} href={item.href} className={navClass(item.href)}>
                  {item.label}
                </Link>
              ))}

              {futureModules.map((module) => (
                <span
                  key={module}
                  className="shrink-0 whitespace-nowrap rounded-lg border border-[#2a3242] bg-[#0f1419] px-3 py-2 text-sm font-semibold text-[#7f8da3] opacity-70 sm:px-4"
                  title={`${module} Coming Soon`}
                >
                  {module}
                  <span className="ml-2 text-[10px] uppercase tracking-wide text-[#596579]">
                    Soon
                  </span>
                </span>
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
      <div className="mx-auto w-full max-w-[1600px] px-3 pt-4 sm:px-4 sm:pt-6">
        <Image
          src="/beast-logo-banner.png"
          alt="The Beast banner"
          width={1600}
          height={176}
          className="h-24 w-full rounded-xl border border-[#2a3242] object-cover object-center sm:h-36 sm:rounded-2xl lg:h-44"
        />
      </div>

      {children}
    </div>
  );
}
