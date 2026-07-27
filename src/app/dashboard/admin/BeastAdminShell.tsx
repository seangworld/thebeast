"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
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
  const [authorized, setAuthorized] = useState(false);
  const [checking, setChecking] = useState(true);
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
    setChecking(true);
    setAuthorized(false);

    async function verifyOwner() {
      try {
        const supabase = createClient();
        const { data: userData } = await supabase.auth.getUser();
        const userId = userData?.user?.id;

        if (!userId) {
          router.replace(buildCurrentAuthLoginPath());
          return;
        }

        const { data: profile } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", userId)
          .maybeSingle();

        if (!active) return;

        if (!canAccessBeastAdmin({ role: profile?.role, adminViewMode })) {
          router.replace("/dashboard");
          return;
        }

        setAuthorized(true);
      } finally {
        if (active) setChecking(false);
      }
    }

    verifyOwner();

    return () => {
      active = false;
    };
  }, [adminViewMode, router]);

  if (checking || !authorized) {
    return (
      <main className="beast-page">
        <div className="beast-container">
          <DashboardCard accent="admin">
            <SectionHeader
              eyebrow="BeastAdmin"
              title="Checking owner access"
              description="BeastAdmin is protected for the owner-only operating workspace."
            />
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
          <ModuleBadge module="admin" label="Owner Only" />
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
