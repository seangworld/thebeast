"use client";

import { useEffect, useState } from "react";
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
  { label: "Health Advisor", href: "/dashboard/health/ai-advisor" },
  { label: "Health Profile", href: "/dashboard/health/profile" },
  { label: "Conditions", href: "/dashboard/health/conditions" },
  { label: "Medications", href: "/dashboard/health/medications" },
  { label: "Procedures", href: "/dashboard/health/procedures" },
  { label: "Family History", href: "/dashboard/health/family-history" },
  { label: "Lifestyle", href: "/dashboard/health/lifestyle" },
  { label: "Vitals", href: "/dashboard/health/vitals" },
  { label: "Health Goals", href: "/dashboard/health/goals" },
  { label: "Health Documents", href: "/dashboard/health/documents" },
  { label: "Provider Directory", href: "/dashboard/health/provider-directory" },
  { label: "Appointments", href: "/dashboard/health/appointments" },
  { label: "Health Timeline", href: "/dashboard/health/timeline" },
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
      <div className="beast-container space-y-4">
        <section className="beast-page-header">
          <div className="space-y-3">
            <ModuleBadge module="health" label="Health Advisor Active" />
            <h1 className="beast-title">{title}</h1>
            <p className="beast-subtitle">{description}</p>
          </div>
        </section>

        {children}
      </div>
    </main>
  );
}
