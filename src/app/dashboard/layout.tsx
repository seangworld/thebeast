"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { APP_VERSION_LABEL } from "@/lib/appVersion";
import LogoutButton from "@/app/components/LogoutButton";

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
      ? "rounded-lg border border-[#38bdf8] bg-[#38bdf8]/10 px-4 py-2 text-sm font-semibold text-[#38bdf8]"
      : "rounded-lg border border-transparent px-4 py-2 text-sm font-semibold text-[#c7cfdb] transition hover:border-[#2a3242] hover:bg-[#1a1f2b]";
  }

  return (
    <div className="min-h-screen bg-[#11151c] text-white">
      <header className="sticky top-0 z-50 border-b border-[#2a3242] bg-[#11151c]/95 backdrop-blur">
        <div className="mx-auto flex w-full max-w-[1600px] items-center justify-between gap-4 px-4 py-4">
          <div className="flex items-center gap-6">
          <div className="text-lg font-bold">
  The Beast
</div>

            <nav className="flex items-center gap-2">
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
                href="/dashboard/settings"
                className={navClass("/dashboard/settings")}
              >
                Settings
              </Link>
            </nav>
          </div>

          <div className="flex items-center gap-3">
          <div className="hidden text-right text-sm text-[#7f8da3] md:block">
  <div>{today}</div>
  <div>{APP_VERSION_LABEL}</div>
</div>

            <LogoutButton />
          </div>
        </div>
      </header>
      <div className="mx-auto w-full max-w-[1600px] px-4 pt-6">
  <img
    src="/beast-logo-banner.png"
    alt="The Beast banner"
    className="h-44 w-full rounded-2xl border border-[#2a3242] object-cover object-center"
  />
</div>

      {children}
    </div>
  );
}