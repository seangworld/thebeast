"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  DashboardCard,
  ModuleBadge,
  SectionHeader,
} from "@/app/components/design/DashboardPrimitives";
import { createClient } from "@/lib/supabase/client";
import { isBeastAdminOwnerRole } from "@/lib/beastAdmin";
import { buildCurrentAuthLoginPath } from "@/lib/auth/experience";

export const beastHealthSections = [
  { label: "Overview", href: "/dashboard/health" },
  { label: "Health Profile", href: "/dashboard/health/profile" },
  { label: "Conditions", href: "/dashboard/health/conditions" },
  { label: "Medications", href: "/dashboard/health/medications" },
  { label: "Procedures", href: "/dashboard/health/procedures" },
  { label: "Family History", href: "/dashboard/health/family-history" },
  { label: "Lifestyle", href: "/dashboard/health/lifestyle" },
  { label: "Vitals", href: "/dashboard/health/vitals" },
  { label: "Documents", href: "/dashboard/health/documents" },
  { label: "Provider Directory", href: "/dashboard/health/provider-directory" },
  { label: "Appointments", href: "/dashboard/health/appointments" },
  { label: "Health Timeline", href: "/dashboard/health/timeline" },
  { label: "Health Advisor", href: "/dashboard/health/ai-advisor" },
];

export function BeastHealthShell({
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
          router.replace(buildCurrentAuthLoginPath());
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
          <DashboardCard accent="health">
            <SectionHeader
              eyebrow="BeastHealth"
              title="Checking owner access"
              description="BeastHealth beta routes are protected for owner-only review."
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
            <ModuleBadge module="health" label="Health Advisor Active" />
            <h1 className="beast-title">{title}</h1>
            <p className="beast-subtitle">{description}</p>
          </div>
        </section>

        <nav className="flex flex-wrap gap-2" aria-label="BeastHealth sections">
          {beastHealthSections.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-lg border border-red-300/30 bg-red-300/10 px-3 py-2 text-sm font-bold text-red-100 transition hover:border-red-200 hover:bg-red-200/20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-300"
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
