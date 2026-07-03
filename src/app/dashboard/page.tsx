"use client";

import Link from "next/link";
import { APP_VERSION } from "@/lib/appVersion";
import {
  DashboardCard,
  ModuleBadge,
  SectionHeader,
  moduleAccents,
  type ModuleKey,
} from "@/app/components/design/DashboardPrimitives";

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
  { label: "Money", href: "/dashboard/money", status: "Active", module: "money" as ModuleKey },
  { label: "Calendar", href: "/dashboard/calendar", status: "Shell Ready", module: "calendar" as ModuleKey },
  { label: "Notifications", href: "/dashboard/notifications", status: "Shell Ready", module: "notifications" as ModuleKey },
  { label: "Timeline", href: "/dashboard/timeline", status: "Shell Ready", module: "timeline" as ModuleKey },
  { label: "Search", href: "/dashboard/search", status: "Shell Ready", module: "search" as ModuleKey },
  { label: "Health", href: "#", status: "Coming Soon", module: "health" as ModuleKey },
  { label: "Home", href: "#", status: "Coming Soon", module: "home" as ModuleKey },
  { label: "Projects", href: "#", status: "Coming Soon", module: "projects" as ModuleKey },
  { label: "Vehicles", href: "#", status: "Coming Soon", module: "vehicles" as ModuleKey },
  { label: "Family", href: "#", status: "Coming Soon", module: "family" as ModuleKey },
  { label: "Goals", href: "#", status: "Coming Soon", module: "goals" as ModuleKey },
  { label: "Documents", href: "#", status: "Coming Soon", module: "documents" as ModuleKey },
];

function PlaceholderList({ items }: { items: string[] }) {
  return (
    <div className="mt-4 space-y-3">
      {items.map((item) => (
        <div
          key={item}
          className="rounded-xl border border-[#2a3242] bg-[#111827] px-3 py-2 text-sm text-[#c7cfdb]"
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
            <div className="space-y-4">
              <p className="beast-kicker">BeastOS {APP_VERSION}</p>
              <h1 className="beast-title">Today</h1>
              <p className="beast-subtitle">
                {greeting}. Your operating layer is ready.
              </p>
            </div>
          </div>
        </section>

        <section className="grid gap-4 lg:grid-cols-3">
          <DashboardCard accent="beastos" className="lg:col-span-2">
            <p className="beast-kicker">Greeting</p>
            <h2 className="mt-2 text-2xl font-bold">BeastOS command center</h2>
            <p className="mt-3 text-sm leading-6 text-[#c7cfdb]">
              Today is the new platform landing experience. Money remains fully
              available as Module #1 while the broader operating system comes
              online.
            </p>
          </DashboardCard>

          <DashboardCard accent="beastos">
            <p className="beast-kicker">Today Briefing</p>
            <PlaceholderList items={briefingItems} />
          </DashboardCard>
        </section>

        <section className="grid gap-4 lg:grid-cols-2">
          <DashboardCard accent="beastos">
            <h2 className="text-xl font-bold">Recent Activity</h2>
            <PlaceholderList items={recentActivity} />
          </DashboardCard>

          <DashboardCard accent="beastos">
            <h2 className="text-xl font-bold">Upcoming Events</h2>
            <PlaceholderList items={upcomingEvents} />
          </DashboardCard>
        </section>

        <section className="grid gap-4 lg:grid-cols-2">
          <DashboardCard accent="beastos">
            <h2 className="text-xl font-bold">Notifications</h2>
            <PlaceholderList items={notifications} />
          </DashboardCard>

          <DashboardCard accent="beastos">
            <h2 className="text-xl font-bold">AI Recommendations</h2>
            <PlaceholderList items={recommendations} />
          </DashboardCard>
        </section>

        <DashboardCard accent="beastos">
          <SectionHeader
            title="Module Overview"
            description="Active workspaces and future BeastOS modules."
          />

          <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {modules.map((module) =>
              module.href === "#" ? (
                <div
                  key={module.label}
                  className="rounded-xl border border-[#2a3242] bg-[#111827] p-4 opacity-85"
                >
                  <div className="font-semibold">{module.label}</div>
                  <div className="mt-3">
                    <ModuleBadge module={module.module} label={module.status} comingSoon />
                  </div>
                </div>
              ) : (
                <Link
                  key={module.label}
                  href={module.href}
                  className="rounded-xl border border-[#2a3242] bg-[#111827] p-4 transition hover:-translate-y-0.5 hover:bg-[#202634]"
                  style={{ borderColor: `${moduleAccents[module.module].color}44` }}
                >
                  <div className="font-semibold">{module.label}</div>
                  <div className="mt-3">
                    <ModuleBadge module={module.module} label={module.status} />
                  </div>
                </Link>
              )
            )}
          </div>
        </DashboardCard>
      </div>
    </main>
  );
}
