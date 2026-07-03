"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { APP_VERSION_LABEL } from "@/lib/appVersion";
import LogoutButton from "@/app/components/LogoutButton";
import AdminViewAsControl from "@/app/components/AdminViewAsControl";

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
  function navClass(href: string) {
    const active = pathname === href;

    return active
      ? "shrink-0 whitespace-nowrap rounded-lg border border-[#38bdf8] bg-[#38bdf8]/10 px-3 py-2 text-sm font-semibold text-[#38bdf8] sm:px-4"
      : "shrink-0 whitespace-nowrap rounded-lg border border-transparent px-3 py-2 text-sm font-semibold text-[#c7cfdb] transition hover:border-[#2a3242] hover:bg-[#1a1f2b] sm:px-4";
  }

  return (
    <div className="min-h-screen bg-[#11151c] text-white">
      <header className="sticky top-0 z-50 border-b border-[#2a3242] bg-[#11151c]/95 backdrop-blur">
        <div className="mx-auto flex w-full max-w-[1600px] flex-col gap-3 px-3 py-3 sm:px-4 md:flex-row md:items-center md:justify-between md:gap-4 md:py-4">
          <div className="flex min-w-0 flex-col gap-3 md:flex-row md:items-center md:gap-6">
          <div className="shrink-0 text-lg font-bold">
  The Beast
</div>

            <nav className="flex max-w-full items-center gap-2 overflow-x-auto pb-1 md:pb-0">
              <Link href="/dashboard" className={navClass("/dashboard")}>
                Dashboard
              </Link>

              <Link
                href="/dashboard/cashflow"
                className={navClass("/dashboard/cashflow")}
              >
                Cash Flow
              </Link>

              <Link
                href="/dashboard/debts"
                className={navClass("/dashboard/debts")}
              >
                Debt Strategy
              </Link>

              <Link
                href="/dashboard/velocity"
                className={navClass("/dashboard/velocity")}
              >
                Velocity Planner
              </Link>

              <Link
                href="/dashboard/settings"
                className={navClass("/dashboard/settings")}
              >
                Settings
              </Link>

              <Link
                href="/dashboard/billing"
                className={navClass("/dashboard/billing")}
              >
                Billing
              </Link>
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
