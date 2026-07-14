"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  DashboardCard,
  MetricTile,
  ModuleBadge,
  SectionHeader,
} from "@/app/components/design/DashboardPrimitives";
import { createClient } from "@/lib/supabase/client";
import { isBeastAdminOwnerRole } from "@/lib/beastAdmin";

const adminNavItems = [
  { label: "Dashboard", href: "/dashboard/admin" },
  { label: "Members", href: "/dashboard/admin/members" },
  { label: "Modules", href: "/dashboard/admin/modules" },
  { label: "Analytics", href: "/dashboard/admin/analytics" },
  { label: "Feedback", href: "/dashboard/admin/feedback" },
  { label: "Ads", href: "/dashboard/admin/ads" },
  { label: "Settings", href: "/dashboard/admin/settings" },
];

export function BeastAdminShell({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  const [authorized, setAuthorized] = useState(false);
  const [checking, setChecking] = useState(true);
  const router = useRouter();

  useEffect(() => {
    let active = true;

    async function verifyOwner() {
      try {
        const supabase = createClient();
        const { data: userData } = await supabase.auth.getUser();
        const userId = userData?.user?.id;

        if (!userId) {
          router.replace("/login");
          return;
        }

        const { data: profile } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", userId)
          .maybeSingle();

        if (!active) return;

        if (!isBeastAdminOwnerRole(profile?.role)) {
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
  }, [router]);

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
        <section className="beast-page-header">
          <div className="space-y-4">
            <ModuleBadge module="admin" label="Owner Only" />
            <h1 className="beast-title">{title}</h1>
            <p className="beast-subtitle">{description}</p>
          </div>
        </section>

        <nav className="flex flex-wrap gap-2" aria-label="BeastAdmin sections">
          {adminNavItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-lg border border-amber-300/30 bg-amber-300/10 px-3 py-2 text-sm font-bold text-amber-100 transition hover:border-amber-200 hover:bg-amber-200/20"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        {children}
      </div>
    </main>
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
