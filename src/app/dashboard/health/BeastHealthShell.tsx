"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  DashboardCard,
  ModuleBadge,
  SectionHeader,
} from "@/app/components/design/DashboardPrimitives";
import { createClient } from "@/lib/supabase/client";
import { buildCurrentAuthLoginPath } from "@/lib/auth/experience";
import {
  ADMIN_VIEW_MODE_EVENT,
  ADMIN_VIEW_MODE_STORAGE_KEY,
  normalizeAdminViewMode,
  type AdminViewMode,
} from "@/lib/entitlements";
import {
  getModuleRegistryEntry,
  type BeastModuleIdentifier,
} from "@/lib/moduleRegistry";
import { resolveMemberModuleEntitlement } from "@/lib/memberAgeEntitlements";
import { HealthPageIntroduction } from "./HealthPageIntroduction";

export const beastHealthSections = [
  { label: "Overview", href: "/dashboard/health" },
  { label: "Health Advisor", href: "/dashboard/health/ai-advisor" },
  { label: "Health Profile", href: "/dashboard/health/profile" },
  { label: "Conditions", href: "/dashboard/health/conditions" },
  { label: "Medications", href: "/dashboard/health/medications" },
  { label: "Procedures", href: "/dashboard/health/procedures" },
  { label: "Family History", href: "/dashboard/health/family-history" },
  { label: "Lifestyle", href: "/dashboard/health/lifestyle" },
  { label: "Health Measurements", href: "/dashboard/health/vitals" },
  { label: "Health Goals", href: "/dashboard/health/goals" },
  { label: "Health Documents", href: "/dashboard/health/documents" },
  { label: "Providers", href: "/dashboard/health/provider-directory" },
  { label: "Appointments", href: "/dashboard/health/appointments" },
  { label: "Timeline", href: "/dashboard/health/timeline" },
];

export function BeastHealthShell({
  title,
  description,
  why,
  how,
  next,
  action,
  children,
}: {
  title: string;
  description: string;
  why?: string;
  how?: string;
  next?: string;
  action?: { label: string; href: string };
  children: React.ReactNode;
}) {
  const [authorized, setAuthorized] = useState(false);
  const [checking, setChecking] = useState(true);
  const [adminViewMode, setAdminViewMode] = useState<AdminViewMode>(() =>
    typeof window === "undefined"
      ? "admin"
      : normalizeAdminViewMode(window.localStorage.getItem(ADMIN_VIEW_MODE_STORAGE_KEY))
  );
  const router = useRouter();

  useEffect(() => {
    const syncViewMode = () =>
      setAdminViewMode(
        normalizeAdminViewMode(window.localStorage.getItem(ADMIN_VIEW_MODE_STORAGE_KEY))
      );
    window.addEventListener("storage", syncViewMode);
    window.addEventListener(ADMIN_VIEW_MODE_EVENT, syncViewMode);
    return () => {
      window.removeEventListener("storage", syncViewMode);
      window.removeEventListener(ADMIN_VIEW_MODE_EVENT, syncViewMode);
    };
  }, []);

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

        const { data: profile, error: profileError } = await supabase
          .from("profiles")
          .select("role,birthday")
          .eq("id", userId)
          .maybeSingle();

        if (!active) return;

        const isAdmin = profile?.role === "admin" && adminViewMode === "admin";
        const decision = profile
          ? resolveMemberModuleEntitlement({
              module: "health" as BeastModuleIdentifier,
              birthday: profile.birthday,
              isAdmin,
              simulatingMember: profile.role === "admin" && adminViewMode !== "admin",
              entry: getModuleRegistryEntry("health"),
            })
          : null;
        if (profileError || !decision?.allowed) {
          router.replace(decision?.needsBirthday ? "/dashboard/settings/profile" : "/dashboard/education");
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
          <DashboardCard accent="health">
            <SectionHeader
              eyebrow="BeastHealth"
              title="Checking owner access"
              description="Checking your BeastHealth access and age-based eligibility."
            />
          </DashboardCard>
        </div>
      </main>
    );
  }

  return (
    <main className="beast-page">
      <div className="beast-container space-y-4">
        {why && how && next ? (
          <HealthPageIntroduction
            title={title}
            introduction={description}
            why={why}
            how={how}
            next={next}
            action={action}
          />
        ) : (
          <section className="beast-page-header">
            <div className="space-y-3">
              <ModuleBadge module="health" label="Health Advisor Active" />
              <h1 className="beast-title">{title}</h1>
              <p className="beast-subtitle">{description}</p>
            </div>
          </section>
        )}

        {children}
      </div>
    </main>
  );
}
