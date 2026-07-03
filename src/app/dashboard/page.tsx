"use client";

import Link from "next/link";
import { APP_VERSION } from "@/lib/appVersion";

const briefingItems = [
  "Money workspace is online and ready for cashflow review.",
  "Calendar, notifications, and timeline services are staged for platform data.",
  "Beast Advisor remains available inside Pro money workflows.",
];

const recentActivity = [
  "Velocity v2 completion audit archived",
  "Stripe sandbox validation checklist added",
  "Cashflow workspace modularization complete",
];

const upcomingEvents = [
  "Review weekly cash position",
  "Confirm upcoming bills assignment",
  "Check subscription webhook delivery",
];

const notifications = [
  "No critical platform alerts",
  "Money module remains the primary active workspace",
  "Future modules are registered in the BeastOS shell",
];

const recommendations = [
  "Start in Money if you need to make a financial decision today.",
  "Use Timeline once cross-module activity tracking comes online.",
  "Keep Notifications clear before adding new modules.",
];

const modules = [
  { label: "Money", href: "/dashboard/money", status: "Active" },
  { label: "Calendar", href: "/dashboard/calendar", status: "Shell Ready" },
  { label: "Notifications", href: "/dashboard/notifications", status: "Shell Ready" },
  { label: "Timeline", href: "/dashboard/timeline", status: "Shell Ready" },
  { label: "Search", href: "/dashboard/search", status: "Shell Ready" },
  { label: "Health", href: "#", status: "Coming Soon" },
  { label: "Home", href: "#", status: "Coming Soon" },
  { label: "Projects", href: "#", status: "Coming Soon" },
  { label: "Vehicles", href: "#", status: "Coming Soon" },
  { label: "Family", href: "#", status: "Coming Soon" },
  { label: "Goals", href: "#", status: "Coming Soon" },
  { label: "Documents", href: "#", status: "Coming Soon" },
];

function PlaceholderList({ items }: { items: string[] }) {
  return (
    <div className="mt-4 space-y-3">
      {items.map((item) => (
        <div
          key={item}
          className="rounded-lg border border-[#2a3242] bg-[#111827] px-3 py-2 text-sm text-[#c7cfdb]"
        >
          {item}
        </div>
      ))}
    </div>
  );
}

export default function TodayPage() {
  const greeting = new Date().getHours() < 12 ? "Good morning" : "Welcome back";

  return (
    <main className="beast-page">
      <div className="beast-container space-y-8">
        <section className="beast-page-header">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="beast-kicker">BeastOS {APP_VERSION}</p>
              <h1 className="beast-title">Today</h1>
              <p className="beast-subtitle">
                {greeting}. Your operating layer is ready.
              </p>
            </div>
            <Link href="/dashboard/money" className="beast-button w-fit">
              Open Money
            </Link>
          </div>
        </section>

        <section className="grid gap-4 lg:grid-cols-3">
          <div className="beast-card lg:col-span-2">
            <p className="beast-kicker">Greeting</p>
            <h2 className="mt-2 text-2xl font-bold">BeastOS command center</h2>
            <p className="mt-3 text-sm leading-6 text-[#c7cfdb]">
              Today is the new platform landing experience. Money remains fully
              available as Module #1 while the broader operating system comes
              online.
            </p>
          </div>

          <div className="beast-card">
            <p className="beast-kicker">Today Briefing</p>
            <PlaceholderList items={briefingItems} />
          </div>
        </section>

        <section className="grid gap-4 lg:grid-cols-2">
          <div className="beast-card">
            <h2 className="text-xl font-bold">Recent Activity</h2>
            <PlaceholderList items={recentActivity} />
          </div>

          <div className="beast-card">
            <h2 className="text-xl font-bold">Upcoming Events</h2>
            <PlaceholderList items={upcomingEvents} />
          </div>
        </section>

        <section className="grid gap-4 lg:grid-cols-2">
          <div className="beast-card">
            <h2 className="text-xl font-bold">Notifications</h2>
            <PlaceholderList items={notifications} />
          </div>

          <div className="beast-card">
            <h2 className="text-xl font-bold">AI Recommendations</h2>
            <PlaceholderList items={recommendations} />
          </div>
        </section>

        <section className="beast-card">
          <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
            <div>
              <h2 className="text-xl font-bold">Module Overview</h2>
              <p className="mt-1 text-sm text-[#7f8da3]">
                Active workspaces and future BeastOS modules.
              </p>
            </div>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {modules.map((module) =>
              module.href === "#" ? (
                <div
                  key={module.label}
                  className="rounded-lg border border-[#2a3242] bg-[#111827] p-4 opacity-75"
                >
                  <div className="font-semibold">{module.label}</div>
                  <div className="mt-2 text-xs font-semibold text-[#7f8da3]">
                    {module.status}
                  </div>
                </div>
              ) : (
                <Link
                  key={module.label}
                  href={module.href}
                  className="rounded-lg border border-[#2a3242] bg-[#111827] p-4 transition hover:border-[#38bdf8] hover:bg-[#202634]"
                >
                  <div className="font-semibold">{module.label}</div>
                  <div className="mt-2 text-xs font-semibold text-[#38bdf8]">
                    {module.status}
                  </div>
                </Link>
              )
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
