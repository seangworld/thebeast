import Link from "next/link";
import Image from "next/image";

export type ModuleKey =
  | "beastos"
  | "money"
  | "learning"
  | "health"
  | "home"
  | "projects"
  | "vehicles"
  | "family"
  | "goals"
  | "documents"
  | "calendar"
  | "notifications"
  | "timeline"
  | "search"
  | "admin";

export const moduleAccents: Record<
  ModuleKey,
  { label: string; color: string; border: string; bg: string; text: string; soft: string }
> = {
  beastos: {
    label: "BeastOS",
    color: "#38bdf8",
    border: "border-[#38bdf8]/50",
    bg: "bg-[#38bdf8]/15",
    text: "text-[#bae6fd]",
    soft: "before:bg-[#38bdf8]",
  },
  money: {
    label: "BeastMoney",
    color: "#22c55e",
    border: "border-green-400/50",
    bg: "bg-green-400/15",
    text: "text-green-100",
    soft: "before:bg-[#22c55e]",
  },
  learning: {
    label: "BeastEducation",
    color: "#818cf8",
    border: "border-indigo-300/50",
    bg: "bg-indigo-300/15",
    text: "text-indigo-100",
    soft: "before:bg-[#818cf8]",
  },
  health: {
    label: "BeastHealth",
    color: "#dc2626",
    border: "border-red-400/50",
    bg: "bg-red-400/15",
    text: "text-red-100",
    soft: "before:bg-[#dc2626]",
  },
  home: {
    label: "BeastHome",
    color: "#fb923c",
    border: "border-orange-400/50",
    bg: "bg-orange-400/15",
    text: "text-orange-100",
    soft: "before:bg-[#fb923c]",
  },
  projects: {
    label: "BeastProjects",
    color: "#a78bfa",
    border: "border-purple-300/50",
    bg: "bg-purple-300/15",
    text: "text-purple-100",
    soft: "before:bg-[#a78bfa]",
  },
  vehicles: {
    label: "BeastVehicles",
    color: "#22d3ee",
    border: "border-cyan-300/50",
    bg: "bg-cyan-300/15",
    text: "text-cyan-100",
    soft: "before:bg-[#22d3ee]",
  },
  family: {
    label: "BeastFamily",
    color: "#f472b6",
    border: "border-pink-300/50",
    bg: "bg-pink-300/15",
    text: "text-pink-100",
    soft: "before:bg-[#f472b6]",
  },
  goals: {
    label: "BeastGoals",
    color: "#facc15",
    border: "border-yellow-300/50",
    bg: "bg-yellow-300/15",
    text: "text-yellow-100",
    soft: "before:bg-[#facc15]",
  },
  documents: {
    label: "BeastDocuments",
    color: "#94a3b8",
    border: "border-slate-300/50",
    bg: "bg-slate-300/15",
    text: "text-slate-100",
    soft: "before:bg-[#94a3b8]",
  },
  calendar: {
    label: "Calendar",
    color: "#38bdf8",
    border: "border-[#38bdf8]/50",
    bg: "bg-[#38bdf8]/15",
    text: "text-[#bae6fd]",
    soft: "before:bg-[#38bdf8]",
  },
  notifications: {
    label: "Notifications",
    color: "#38bdf8",
    border: "border-[#38bdf8]/50",
    bg: "bg-[#38bdf8]/15",
    text: "text-[#bae6fd]",
    soft: "before:bg-[#38bdf8]",
  },
  timeline: {
    label: "Timeline",
    color: "#38bdf8",
    border: "border-[#38bdf8]/50",
    bg: "bg-[#38bdf8]/15",
    text: "text-[#bae6fd]",
    soft: "before:bg-[#38bdf8]",
  },
  search: {
    label: "Search",
    color: "#38bdf8",
    border: "border-[#38bdf8]/50",
    bg: "bg-[#38bdf8]/15",
    text: "text-[#bae6fd]",
    soft: "before:bg-[#38bdf8]",
  },
  admin: {
    label: "BeastAdmin",
    color: "#f59e0b",
    border: "border-amber-300/50",
    bg: "bg-amber-300/15",
    text: "text-amber-100",
    soft: "before:bg-[#f59e0b]",
  },
};

export function getModuleAccent(module: ModuleKey) {
  return moduleAccents[module];
}

type DashboardCardProps = {
  children: React.ReactNode;
  className?: string;
  accent?: "blue" | "green" | "yellow" | "red" | "purple" | ModuleKey;
};

type SectionHeaderProps = {
  eyebrow?: string;
  title: string;
  description?: string;
  action?: React.ReactNode;
};

type MetricTileProps = {
  label: string;
  value: string;
  detail: string;
  icon: string;
  tone?: "blue" | "green" | "yellow" | "red" | "purple";
};

export type DashboardAlertSeverity = "critical" | "warning" | "info";

type AlertCardProps = {
  severity: DashboardAlertSeverity;
  title: string;
  message: string;
  href?: string;
};

type HealthGaugeProps = {
  score: number;
};

type BeastBrandMarkProps = {
  module: ModuleKey;
  workspaceName?: string;
  subtitle?: string;
  size?: "sm" | "md";
  iconOnly?: boolean;
};

type ModuleTitleProps = {
  module: ModuleKey;
  title?: string;
};

type ModuleBadgeProps = {
  module: ModuleKey;
  label?: string;
  comingSoon?: boolean;
};

type ModuleNavItemProps = {
  label: string;
  href?: string;
  module: ModuleKey;
  active?: boolean;
  comingSoon?: boolean;
  compact?: boolean;
};

type QuickActionButtonProps = {
  label: string;
  href: string;
  icon: string;
  primary?: boolean;
};

type GuidedEmptyStateProps = {
  title: string;
  description: string;
  nextAction: { label: string; href: string };
  secondaryAction?: { label: string; href: string };
  guidance?: string;
};

type ProgressiveSaveStatusProps = {
  status: "idle" | "dirty" | "saving" | "saved" | "error";
  savedAt?: string;
  errorMessage?: string;
};

type ExpandableDetailPanelProps = {
  summary: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
};

export type AdaptiveTableColumn<Row> = {
  key: string;
  label: string;
  render: (row: Row) => React.ReactNode;
  priority?: "primary" | "secondary";
};

type AdaptiveTableProps<Row> = {
  caption: string;
  rows: readonly Row[];
  columns: readonly AdaptiveTableColumn<Row>[];
  rowKey: (row: Row) => string;
  emptyState: React.ReactNode;
};

const accentClasses = {
  blue: "before:bg-[#38bdf8]",
  green: "before:bg-[#22c55e]",
  yellow: "before:bg-[#f59e0b]",
  red: "before:bg-[#ef4444]",
  purple: "before:bg-[#a78bfa]",
};

const beastBrandColor = "#38bdf8";

function getAccentClass(accent: DashboardCardProps["accent"]) {
  if (!accent) return accentClasses.blue;

  return accent in accentClasses
    ? accentClasses[accent as keyof typeof accentClasses]
    : moduleAccents[accent as ModuleKey].soft;
}

const metricToneClasses = {
  blue: "border-[#38bdf8]/30 bg-[#38bdf8]/10 text-[#bae6fd]",
  green: "border-green-400/30 bg-green-400/10 text-green-100",
  yellow: "border-yellow-300/30 bg-yellow-300/10 text-yellow-100",
  red: "border-red-400/30 bg-red-400/10 text-red-100",
  purple: "border-purple-300/30 bg-purple-300/10 text-purple-100",
};

const alertStyles: Record<
  DashboardAlertSeverity,
  { label: string; badge: string; card: string; icon: string }
> = {
  critical: {
    label: "Critical",
    badge: "border-red-400/40 bg-red-400/15 text-red-100",
    card: "border-red-400/35 bg-red-400/10",
    icon: "!",
  },
  warning: {
    label: "Warning",
    badge: "border-yellow-300/40 bg-yellow-300/15 text-yellow-100",
    card: "border-yellow-300/35 bg-yellow-300/10",
    icon: "?",
  },
  info: {
    label: "Information",
    badge: "border-[#38bdf8]/40 bg-[#38bdf8]/15 text-[#bae6fd]",
    card: "border-[#38bdf8]/35 bg-[#38bdf8]/10",
    icon: "i",
  },
};

export function DashboardCard({
  children,
  className = "",
  accent = "blue",
}: DashboardCardProps) {
  return (
    <section
      className={`relative overflow-hidden rounded-2xl border border-[#2a3242] bg-[#1a1f2b] p-5 shadow-[0_18px_60px_rgba(0,0,0,0.22)] transition duration-200 before:absolute before:left-0 before:top-0 before:h-1 before:w-full hover:-translate-y-0.5 hover:border-[#38bdf8]/60 ${getAccentClass(accent)} ${className}`}
    >
      {children}
    </section>
  );
}

export function BeastBrandMark({
  module,
  workspaceName,
  subtitle,
  size = "md",
  iconOnly = false,
}: BeastBrandMarkProps) {
  const accent = moduleAccents[module];
  const imageSize = size === "sm" ? 40 : 48;

  return (
    <div className="flex min-w-0 items-center gap-3">
      <div
        className={`relative shrink-0 overflow-hidden rounded-xl border bg-[#0f1419] ${accent.border}`}
        style={{ width: imageSize, height: imageSize }}
      >
        <Image
          src="/beast-head-icon.png"
          alt="Beast icon"
          fill
          sizes={`${imageSize}px`}
          className="object-cover object-center"
          priority
        />
      </div>
      {!iconOnly ? (
        <div className="min-w-0">
          <ModuleTitle module={module} title={workspaceName} />
          {subtitle ? (
            <div className="truncate text-xs font-semibold text-[#7f8da3]">
              {subtitle}
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

export function ModuleTitle({ module, title }: ModuleTitleProps) {
  const accent = moduleAccents[module];
  const displayTitle = title || accent.label;
  const moduleName = displayTitle.startsWith("Beast")
    ? displayTitle.slice("Beast".length)
    : displayTitle;

  return (
    <div
      className="truncate text-lg font-black leading-tight"
      aria-label={`Beast${moduleName}`}
    >
      <span style={{ color: beastBrandColor }}>Beast</span>
      <span style={{ color: accent.color }}>{moduleName}</span>
    </div>
  );
}

export function ModuleBadge({
  module,
  label,
  comingSoon = false,
}: ModuleBadgeProps) {
  const accent = moduleAccents[module];

  return (
    <span
      className={`inline-flex w-fit items-center rounded-full border px-2.5 py-1 text-xs font-bold ${accent.border} ${accent.bg} ${accent.text}`}
    >
      {label || accent.label}
      {comingSoon ? <span className="ml-2 text-[10px] uppercase">Soon</span> : null}
    </span>
  );
}

export function ModuleNavItem({
  label,
  href,
  module,
  active = false,
  comingSoon = false,
  compact = false,
}: ModuleNavItemProps) {
  const accent = moduleAccents[module];
  const baseClass =
    "group flex w-full min-w-0 items-center gap-2 rounded-xl border px-3 py-2 text-sm font-bold transition duration-200 sm:px-4";
  const activeClass = `${accent.border} ${accent.bg} ${accent.text}`;
  const inactiveClass = comingSoon
    ? "border-[#2a3242] bg-[#0f1419] text-[#7f8da3] opacity-75"
    : "border-transparent text-[#c7cfdb] hover:border-[#2a3242] hover:bg-[#1a1f2b]";
  const content = (
    <>
      <span
        className="h-2 w-2 rounded-full"
        style={{ background: active || comingSoon ? accent.color : "#596579" }}
      />
      <span className={`${compact ? "sr-only lg:not-sr-only" : ""} min-w-0 break-words`}>{label}</span>
      {comingSoon && !compact ? (
        <span className="rounded border border-[#2a3242] px-1.5 py-0.5 text-[10px] uppercase text-[#7f8da3]">
          Soon
        </span>
      ) : null}
    </>
  );

  if (!href || comingSoon) {
    return (
      <span className={`${baseClass} ${active ? activeClass : inactiveClass}`}>
        {content}
      </span>
    );
  }

  return (
    <Link href={href} className={`${baseClass} ${active ? activeClass : inactiveClass}`}>
      {content}
    </Link>
  );
}

export function SectionHeader({
  eyebrow,
  title,
  description,
  action,
}: SectionHeaderProps) {
  return (
    <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
      <div>
        {eyebrow ? <p className="beast-kicker">{eyebrow}</p> : null}
        <h2 className="mt-1 text-2xl font-bold tracking-normal">{title}</h2>
        {description ? (
          <p className="mt-2 max-w-3xl text-sm leading-6 text-[#9aa7b8]">
            {description}
          </p>
        ) : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}

export function MetricTile({
  label,
  value,
  detail,
  icon,
  tone = "blue",
}: MetricTileProps) {
  return (
    <DashboardCard accent={tone} className="min-h-[172px]">
      <div className="flex h-full flex-col justify-between gap-5">
        <div className="flex items-start justify-between gap-3">
          <div className="text-sm font-semibold text-[#9aa7b8]">{label}</div>
          <div
            className={`flex h-9 w-9 items-center justify-center rounded-lg border text-sm font-black ${metricToneClasses[tone]}`}
            aria-hidden="true"
          >
            {icon}
          </div>
        </div>
        <div>
          <div className="text-3xl font-black leading-none text-white">
            {value}
          </div>
          <p className="mt-3 text-sm leading-5 text-[#c7cfdb]">{detail}</p>
        </div>
      </div>
    </DashboardCard>
  );
}

export function AlertCard({ severity, title, message, href }: AlertCardProps) {
  const styles = alertStyles[severity];
  const className = `rounded-xl border p-4 transition duration-200 hover:translate-x-0.5 ${styles.card}`;
  const content = (
    <div className="flex items-start gap-3">
      <div
        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border text-sm font-black ${styles.badge}`}
        aria-hidden="true"
      >
        {styles.icon}
      </div>
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <div className="font-bold text-white">{title}</div>
          <div
            className={`rounded border px-2 py-0.5 text-[11px] font-bold uppercase ${styles.badge}`}
          >
            {styles.label}
          </div>
        </div>
        <p className="mt-1 text-sm leading-5 text-[#dbe3ef]">{message}</p>
        {href ? (
          <p className="mt-2 text-xs font-bold uppercase text-white/70">
            Open related workspace
          </p>
        ) : null}
      </div>
    </div>
  );

  if (href) {
    return (
      <Link href={href} className={`block ${className}`}>
        {content}
      </Link>
    );
  }

  return (
    <div className={className}>{content}</div>
  );
}

export function HealthGauge({ score }: HealthGaugeProps) {
  const scoreLabel =
    score >= 80 ? "Strong" : score >= 60 ? "Stable" : score >= 40 ? "Watch" : "Needs Focus";
  const color = score >= 80 ? "#22c55e" : score >= 60 ? "#38bdf8" : score >= 40 ? "#f59e0b" : "#ef4444";

  return (
    <DashboardCard accent="blue" className="min-h-[270px]">
      <div className="flex h-full flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
        <div className="max-w-2xl">
          <p className="beast-kicker">Financial Health Score</p>
          <h2 className="mt-2 text-3xl font-black">{score}/100</h2>
          <p className="mt-3 text-sm leading-6 text-[#c7cfdb]">
            A dashboard readiness signal based on current cash buffer, debt
            load, tracked obligations, and utilization data.
          </p>
          <div className="mt-5 inline-flex rounded-full border border-[#2a3242] bg-[#111827] px-3 py-1 text-sm font-bold text-[#c7cfdb]">
            {scoreLabel}
          </div>
        </div>
        <div className="relative mx-auto h-44 w-44 shrink-0 rounded-full bg-[#0f1419] p-4 shadow-inner shadow-black/30 lg:mx-0">
          <div
            className="h-full w-full rounded-full transition-[background] duration-700 ease-out"
            style={{
              background: `conic-gradient(${color} ${score * 3.6}deg, #2a3242 0deg)`,
            }}
          />
          <div className="absolute inset-9 flex flex-col items-center justify-center rounded-full border border-[#2a3242] bg-[#1a1f2b]">
            <div className="text-3xl font-black">{score}</div>
            <div className="text-xs font-bold uppercase text-[#7f8da3]">
              Score
            </div>
          </div>
        </div>
      </div>
    </DashboardCard>
  );
}

export function QuickActionButton({
  label,
  href,
  icon,
  primary = false,
}: QuickActionButtonProps) {
  return (
    <Link
      href={href}
      className={`group flex min-h-[88px] items-center gap-3 rounded-xl border p-4 text-left transition duration-200 hover:-translate-y-0.5 ${
        primary
          ? "border-[#38bdf8]/50 bg-[#38bdf8]/15 text-[#e0f2fe]"
          : "border-[#2a3242] bg-[#111827] text-[#dbe3ef] hover:border-[#38bdf8]/50 hover:bg-[#202634]"
      }`}
    >
      <span
        className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border text-sm font-black ${
          primary
            ? "border-[#38bdf8]/50 bg-[#38bdf8]/20"
            : "border-[#2a3242] bg-[#0f1419] group-hover:border-[#38bdf8]/50"
        }`}
        aria-hidden="true"
      >
        {icon}
      </span>
      <span className="text-sm font-bold leading-5">{label}</span>
    </Link>
  );
}

export function GuidedEmptyState({ title, description, nextAction, secondaryAction, guidance }: GuidedEmptyStateProps) {
  return (
    <div className="rounded-xl border border-dashed border-[#43506a] bg-[#111827] p-5" data-generation-two-guided-state="true">
      <p className="beast-kicker">Your next step</p>
      <h3 className="mt-2 text-lg font-black text-white">{title}</h3>
      <p className="mt-2 max-w-2xl text-sm leading-6 text-[#c7cfdb]">{description}</p>
      {guidance ? <p className="mt-3 rounded-lg border border-[#38bdf8]/25 bg-[#38bdf8]/10 p-3 text-sm font-semibold text-[#d8f2ff]">AI guidance: {guidance}</p> : null}
      <div className="mt-4 flex flex-col gap-2 sm:flex-row">
        <Link href={nextAction.href} className="beast-button w-fit">{nextAction.label}</Link>
        {secondaryAction ? <Link href={secondaryAction.href} className="beast-button-secondary w-fit">{secondaryAction.label}</Link> : null}
      </div>
    </div>
  );
}

export function ProgressiveSaveStatus({ status, savedAt, errorMessage }: ProgressiveSaveStatusProps) {
  const message = status === "dirty" ? "Unsaved changes" : status === "saving" ? "Saving…" : status === "saved" ? `Saved${savedAt ? ` ${savedAt}` : ""}` : status === "error" ? errorMessage || "Save failed — retry." : "Changes save as you go.";
  return <p role="status" aria-live="polite" className={`text-xs font-bold ${status === "error" ? "text-red-200" : status === "saved" ? "text-green-200" : "text-[#9aa7b8]"}`} data-progressive-save-status={status}>{message}</p>;
}

export function ExpandableDetailPanel({ summary, children, defaultOpen = false }: ExpandableDetailPanelProps) {
  return <details open={defaultOpen} className="rounded-xl border border-[#2a3242] bg-[#111827] p-4"><summary className="min-h-11 cursor-pointer list-none font-bold text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#38bdf8]">{summary}<span aria-hidden="true" className="float-right text-[#7f8da3]">+</span></summary><div className="mt-3 min-w-0 border-t border-[#2a3242] pt-3 text-sm leading-6 text-[#c7cfdb]">{children}</div></details>;
}

export function AdaptiveTable<Row>({ caption, rows, columns, rowKey, emptyState }: AdaptiveTableProps<Row>) {
  if (!rows.length) return <>{emptyState}</>;
  return (
    <div className="min-w-0" data-adaptive-table="true">
      <div className="hidden md:block"><table className="w-full table-fixed text-left text-sm"><caption className="sr-only">{caption}</caption><thead><tr>{columns.map((column) => <th key={column.key} scope="col" className="break-words p-3">{column.label}</th>)}</tr></thead><tbody>{rows.map((row) => <tr key={rowKey(row)}>{columns.map((column) => <td key={column.key} data-label={column.label} className="break-words p-3 align-top">{column.render(row)}</td>)}</tr>)}</tbody></table></div>
      <div className="grid gap-3 md:hidden" role="list" aria-label={caption}>{rows.map((row) => <article key={rowKey(row)} role="listitem" className="min-w-0 rounded-xl border border-[#2a3242] bg-[#111827] p-4">{columns.map((column) => <div key={column.key} className={column.priority === "primary" ? "mb-3" : "grid grid-cols-[minmax(0,0.42fr)_minmax(0,0.58fr)] gap-3 border-t border-[#2a3242] py-2"}><span className="text-xs font-bold uppercase text-[#7f8da3]">{column.label}</span><div className="min-w-0 break-words text-right text-sm text-white">{column.render(row)}</div></div>)}</article>)}</div>
    </div>
  );
}
