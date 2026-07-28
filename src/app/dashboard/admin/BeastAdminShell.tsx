"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  DashboardCard,
  MetricTile,
  ModuleBadge,
  SectionHeader,
} from "@/app/components/design/DashboardPrimitives";
import { createClient } from "@/lib/supabase/client";
import { canAccessBeastAdmin } from "@/lib/beastAdmin";
import { buildCurrentAuthLoginPath } from "@/lib/auth/experience";
import {
  ADMIN_VIEW_MODE_EVENT,
  ADMIN_VIEW_MODE_STORAGE_KEY,
  normalizeAdminViewMode,
  type AdminViewMode,
} from "@/lib/entitlements";

function loadAdminViewMode() {
  if (typeof window === "undefined") return "admin" as AdminViewMode;

  return normalizeAdminViewMode(
    window.localStorage.getItem(ADMIN_VIEW_MODE_STORAGE_KEY)
  );
}

export function BeastAdminShell({
  title,
  purpose,
  actions,
  children,
}: {
  title: string;
  purpose: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
}) {
  const [accessState, setAccessState] = useState<
    "checking" | "authorized" | "denied" | "error"
  >("checking");
  const [adminViewMode, setAdminViewMode] = useState<AdminViewMode>(
    loadAdminViewMode
  );
  const router = useRouter();

  useEffect(() => {
    function syncAdminViewMode() {
      setAdminViewMode(loadAdminViewMode());
    }

    window.addEventListener("storage", syncAdminViewMode);
    window.addEventListener(ADMIN_VIEW_MODE_EVENT, syncAdminViewMode);

    return () => {
      window.removeEventListener("storage", syncAdminViewMode);
      window.removeEventListener(ADMIN_VIEW_MODE_EVENT, syncAdminViewMode);
    };
  }, []);

  useEffect(() => {
    let active = true;
    setAccessState("checking");

    async function verifyOwner() {
      try {
        const supabase = createClient();
        const { data: userData } = await supabase.auth.getUser();
        const userId = userData?.user?.id;

        if (!userId) {
          router.replace(buildCurrentAuthLoginPath());
          return;
        }

        const { data: profile, error: profileError } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", userId)
          .maybeSingle();

        if (!active) return;

        if (profileError) {
          setAccessState("error");
          return;
        }

        if (!canAccessBeastAdmin({ role: profile?.role, adminViewMode })) {
          setAccessState("denied");
          return;
        }

        setAccessState("authorized");
      } catch {
        if (active) setAccessState("error");
      }
    }

    verifyOwner();

    return () => {
      active = false;
    };
  }, [adminViewMode, router]);

  if (accessState !== "authorized") {
    const denied = accessState === "denied";
    const failed = accessState === "error";
    return (
      <main className="beast-page">
        <div className="beast-container">
          <DashboardCard accent="admin" className="max-w-3xl">
            <SectionHeader
              eyebrow="BeastAdmin"
              title={
                denied
                  ? "Owner access required"
                  : failed
                    ? "Owner access could not be verified"
                    : "Checking owner access"
              }
              description={
                denied
                  ? adminViewMode !== "admin"
                    ? "BeastAdmin is hidden while the owner is using Member view. Switch back to Admin view from the dashboard navigation before returning."
                    : "This account does not have the owner role required for BeastAdmin."
                  : failed
                    ? "The authorization source is temporarily unavailable. No owner workspace data was loaded."
                    : "BeastAdmin is verifying the signed-in account and owner view before loading protected workspace data."
              }
            />
            {accessState === "checking" ? (
              <div className="mt-5 h-2 max-w-sm animate-pulse rounded-full bg-amber-300/20" role="status" aria-label="Verifying owner access" />
            ) : (
              <div className="mt-5 flex flex-wrap gap-3">
                <Link href="/dashboard" className="inline-flex min-h-11 items-center rounded-lg border border-amber-300/30 bg-amber-300/10 px-4 py-2 text-sm font-black text-amber-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-200">
                  Return to dashboard
                </Link>
                {failed ? (
                  <button type="button" onClick={() => window.location.reload()} className="min-h-11 rounded-lg border border-white/15 px-4 py-2 text-sm font-black text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-200">
                    Retry verification
                  </button>
                ) : null}
              </div>
            )}
          </DashboardCard>
        </div>
      </main>
    );
  }

  return (
    <main className="beast-page">
      <div className="beast-container space-y-6">
        <BeastAdminWorkspaceHeader
          title={title}
          purpose={purpose}
          actions={actions}
        />

        <details className="rounded-xl border border-amber-300/20 bg-amber-300/[0.06] px-4 py-3 text-sm text-slate-300">
          <summary className="cursor-pointer font-black text-amber-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-amber-200">
            Owner guidance
          </summary>
          <div className="mt-3 space-y-2 leading-6">
            <p>{purpose}</p>
            <p>
              Review source, timestamp, limitations, and unavailable states before acting. A missing or stale source is not a confirmed zero.
            </p>
          </div>
        </details>

        {children}
      </div>
    </main>
  );
}

export function BeastAdminWorkspaceHeader({
  title,
  purpose,
  actions,
}: {
  title: string;
  purpose: string;
  actions?: React.ReactNode;
}) {
  return (
    <header className="beast-page-header" aria-label={`${title} workspace`}>
      <div className="flex min-w-0 flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0 max-w-4xl space-y-4">
          <span title="Visible only after the signed-in account and Admin view are verified.">
            <ModuleBadge module="admin" label="Owner Only" />
          </span>
          <div className="min-w-0 space-y-2">
            <h1 className="beast-title">{title}</h1>
            <p className="beast-subtitle">{purpose}</p>
          </div>
        </div>

        {actions ? (
          <div
            className="flex min-w-0 flex-wrap items-center gap-3 lg:shrink-0 lg:justify-end"
            aria-label={`${title} actions`}
          >
            {actions}
          </div>
        ) : null}
      </div>
    </header>
  );
}

export function BeastAdminDataFreshness({
  generatedAt,
  staleAfterHours = 24,
}: {
  generatedAt: string | null | undefined;
  staleAfterHours?: number;
}) {
  const parsed = generatedAt ? Date.parse(generatedAt) : Number.NaN;
  const ageHours = Number.isFinite(parsed)
    ? Math.max(0, Date.now() - parsed) / 3_600_000
    : null;
  const stale = ageHours !== null && ageHours > staleAfterHours;
  return (
    <div
      role="status"
      className={`rounded-xl border px-4 py-3 text-sm ${
        stale
          ? "border-amber-300/30 bg-amber-300/10 text-amber-100"
          : "border-white/10 bg-white/[0.03] text-slate-300"
      }`}
    >
      <span className="font-black">
        {ageHours === null
          ? "Freshness unavailable"
          : stale
            ? "Data may be stale"
            : "Data freshness verified"}
      </span>
      <span className="ml-2">
        {ageHours === null
          ? "No valid generation timestamp was returned; verify the source before acting."
          : `Snapshot generated ${new Date(parsed).toLocaleString()}.`}
      </span>
    </div>
  );
}

export function AdminMetricGrid({
  metrics,
}: {
  metrics: { label: string; value: string; detail: string; icon: string }[];
}) {
  return (
    <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {metrics.map((metric) => (
        <MetricTile key={metric.label} {...metric} tone="yellow" />
      ))}
    </section>
  );
}
