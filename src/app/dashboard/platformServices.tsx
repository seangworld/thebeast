import Link from "next/link";
import {
  AlertCard,
  DashboardCard,
  ModuleBadge,
  SectionHeader,
  moduleAccents,
  type DashboardAlertSeverity,
  type ModuleKey,
} from "@/app/components/design/DashboardPrimitives";

export type ServiceEvent = {
  id: string;
  title: string;
  detail: string;
  dateLabel: string;
  timeLabel?: string;
  module: ModuleKey;
  group: "Today" | "Tomorrow" | "This Week" | "Upcoming";
  href?: string;
};

export type ServiceNotification = {
  id: string;
  title: string;
  message: string;
  severity: DashboardAlertSeverity;
  module: ModuleKey;
  href?: string;
};

export const serviceModules: {
  label: string;
  module: ModuleKey;
  enabled: boolean;
}[] = [
  { label: "Money", module: "money", enabled: true },
  { label: "Learning", module: "beastos", enabled: false },
  { label: "Health", module: "health", enabled: false },
  { label: "Home", module: "home", enabled: false },
  { label: "Projects", module: "projects", enabled: false },
  { label: "Vehicles", module: "vehicles", enabled: false },
  { label: "Family", module: "family", enabled: false },
  { label: "Goals", module: "goals", enabled: false },
  { label: "Documents", module: "documents", enabled: false },
];

export const serviceEvents: ServiceEvent[] = [
  {
    id: "money-bills-today",
    title: "Review bills due soon",
    detail: "Money events will contribute upcoming bills, payments, and income timing.",
    dateLabel: "Today",
    timeLabel: "Morning",
    module: "money",
    group: "Today",
    href: "/dashboard/money/cashflow",
  },
  {
    id: "money-cashflow-tomorrow",
    title: "Cashflow check",
    detail: "Confirm known inflows, outflows, and buffer posture before the next cycle.",
    dateLabel: "Tomorrow",
    timeLabel: "9:00 AM",
    module: "money",
    group: "Tomorrow",
    href: "/dashboard/money",
  },
  {
    id: "money-debt-this-week",
    title: "Debt strategy scan",
    detail: "Money can surface debt payments, Velocity opportunities, and payoff reviews.",
    dateLabel: "This Week",
    timeLabel: "Friday",
    module: "money",
    group: "This Week",
    href: "/dashboard/money/debts",
  },
  {
    id: "learning-placeholder",
    title: "Learning block",
    detail: "Courses, reading, and study sessions will join the shared timeline.",
    dateLabel: "Upcoming",
    module: "beastos",
    group: "Upcoming",
  },
  {
    id: "health-placeholder",
    title: "Health check-in",
    detail: "Habits, routines, appointments, and recovery signals will appear here.",
    dateLabel: "Upcoming",
    module: "health",
    group: "Upcoming",
  },
  {
    id: "project-placeholder",
    title: "Project milestone",
    detail: "Future project deadlines, blockers, and decisions will share this stream.",
    dateLabel: "Upcoming",
    module: "projects",
    group: "Upcoming",
  },
  {
    id: "home-placeholder",
    title: "Home maintenance",
    detail: "Home tasks, service dates, and recurring household work will be scheduled.",
    dateLabel: "Upcoming",
    module: "home",
    group: "Upcoming",
  },
  {
    id: "documents-placeholder",
    title: "Document activity",
    detail: "Uploads, records, and document lifecycle events will be visible here.",
    dateLabel: "Upcoming",
    module: "documents",
    group: "Upcoming",
  },
];

export const serviceNotifications: ServiceNotification[] = [
  {
    id: "money-buffer",
    title: "Money alerts are active",
    message:
      "Cashflow warnings, bills due soon, and debt review reminders will appear in this platform inbox.",
    severity: "warning",
    module: "money",
    href: "/dashboard/money",
  },
  {
    id: "platform-ready",
    title: "Shared services are online",
    message:
      "Calendar, Timeline, Search, Notifications, and Upload Center are ready for future module signals.",
    severity: "info",
    module: "beastos",
  },
  {
    id: "future-health",
    title: "Health notifications reserved",
    message:
      "Health reminders, check-ins, and appointment signals will flow into this same inbox.",
    severity: "info",
    module: "health",
  },
  {
    id: "future-projects",
    title: "Project notifications reserved",
    message:
      "Milestones, blockers, and overdue project items will use the shared severity system.",
    severity: "info",
    module: "projects",
  },
];

export const privacyPrinciples = [
  "Your data belongs to you.",
  "BeastOS does not sell your personal information.",
  "Uploads remain associated with your account.",
  "You can export or delete your data at any time.",
];

export function PlatformServiceHero({
  module,
  eyebrow,
  title,
  description,
  action,
}: {
  module: ModuleKey;
  eyebrow: string;
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <section className="beast-page-header">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div className="space-y-4">
          <ModuleBadge module={module} label={eyebrow} />
          <h1 className="beast-title">{title}</h1>
          <p className="beast-subtitle">{description}</p>
        </div>
        {action ? <div className="shrink-0">{action}</div> : null}
      </div>
    </section>
  );
}

export function ModuleFilterRail({
  modules = serviceModules,
}: {
  modules?: typeof serviceModules;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      <span className="rounded-full border border-[#38bdf8]/40 bg-[#38bdf8]/15 px-3 py-1.5 text-xs font-bold text-[#bae6fd]">
        All Modules
      </span>
      {modules.map((item) => (
        <span
          key={`${item.label}-${item.module}`}
          className={`rounded-full border px-3 py-1.5 text-xs font-bold ${
            item.enabled
              ? `${moduleAccents[item.module].border} ${moduleAccents[item.module].bg} ${moduleAccents[item.module].text}`
              : "border-[#2a3242] bg-[#111827] text-[#7f8da3]"
          }`}
        >
          {item.label}
          {!item.enabled ? <span className="ml-2 uppercase">Soon</span> : null}
        </span>
      ))}
    </div>
  );
}

export function ServiceEventCard({ event }: { event: ServiceEvent }) {
  const accent = moduleAccents[event.module];
  const content = (
    <div className="flex min-h-[132px] gap-3 rounded-xl border border-[#2a3242] bg-[#111827] p-4 transition duration-200 hover:border-[#38bdf8]/50 hover:bg-[#202634]">
      <div className="w-24 shrink-0 rounded-lg border border-[#2a3242] bg-[#0f1419] px-3 py-3 text-center">
        <div className="text-xs font-bold uppercase text-[#7f8da3]">
          {event.dateLabel}
        </div>
        {event.timeLabel ? (
          <div className="mt-2 text-sm font-black text-white">{event.timeLabel}</div>
        ) : (
          <div className="mt-2 text-sm font-black text-[#9aa7b8]">Queued</div>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span
            className="h-2 w-2 rounded-full"
            style={{ background: accent.color }}
          />
          <ModuleBadge module={event.module} />
        </div>
        <h3 className="mt-3 font-black text-white">{event.title}</h3>
        <p className="mt-1 text-sm leading-5 text-[#c7cfdb]">{event.detail}</p>
      </div>
    </div>
  );

  if (event.href) {
    return (
      <Link href={event.href} className="block">
        {content}
      </Link>
    );
  }

  return content;
}

export function ServiceNotificationRow({
  notification,
}: {
  notification: ServiceNotification;
}) {
  return (
    <div className="space-y-2">
      <ModuleBadge module={notification.module} />
      <AlertCard
        severity={notification.severity}
        title={notification.title}
        message={notification.message}
        href={notification.href}
      />
    </div>
  );
}

export function PrivacyMessageCard() {
  return (
    <DashboardCard accent="documents">
      <SectionHeader
        eyebrow="Privacy"
        title="Your data belongs to you"
        description="The shared Upload Center is designed around account ownership, portability, and deletion from day one."
      />
      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        {privacyPrinciples.map((principle) => (
          <div
            key={principle}
            className="rounded-xl border border-[#2a3242] bg-[#111827] p-4 text-sm font-semibold leading-5 text-[#dbe3ef]"
          >
            {principle}
          </div>
        ))}
      </div>
    </DashboardCard>
  );
}
