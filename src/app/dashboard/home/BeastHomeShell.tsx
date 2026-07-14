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

export const beastHomeSections = [
  { label: "Overview", href: "/dashboard/home" },
  { label: "Home", href: "/dashboard/home/property" },
  { label: "Vehicles", href: "/dashboard/home/vehicles" },
  { label: "Maintenance", href: "/dashboard/home/maintenance" },
  { label: "Security", href: "/dashboard/home/security" },
  { label: "Documents", href: "/dashboard/home/documents" },
  { label: "Settings", href: "/dashboard/home/settings" },
];

export type BeastHomePlaceholder = {
  title: string;
  description: string;
  focus: string[];
};

export function BeastHomeShell({
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
          <DashboardCard accent="home">
            <SectionHeader
              eyebrow="BeastHome"
              title="Checking owner access"
              description="BeastHome foundation routes are protected for admin-only review."
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
            <ModuleBadge module="home" label="Admin Only" />
            <h1 className="beast-title">{title}</h1>
            <p className="beast-subtitle">{description}</p>
          </div>
        </section>

        <nav className="flex flex-wrap gap-2" aria-label="BeastHome sections">
          {beastHomeSections.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-lg border border-cyan-300/30 bg-cyan-300/10 px-3 py-2 text-sm font-bold text-cyan-100 transition hover:border-cyan-200 hover:bg-cyan-200/20"
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

export function BeastHomePlaceholderPage({
  page,
}: {
  page: BeastHomePlaceholder;
}) {
  return (
    <BeastHomeShell title={page.title} description={page.description}>
      <section className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
        <DashboardCard accent="home">
          <SectionHeader
            eyebrow="Foundation"
            title={`${page.title} workspace`}
            description="This admin-only foundation reserves the BeastHome workspace without collecting member household data or automating home decisions."
          />
          <div className="mt-5 grid gap-3">
            {page.focus.map((item) => (
              <div
                key={item}
                className="rounded-xl border border-[#2a3242] bg-[#111827] p-4 text-sm font-semibold leading-6 text-[#dbe3ef]"
              >
                {item}
              </div>
            ))}
          </div>
        </DashboardCard>

        <DashboardCard accent="beastos">
          <SectionHeader
            eyebrow="Boundary"
            title="Protected placeholder"
            description="BeastHome is admin-only until product scope, privacy, permissions, household sharing, and automation policy are explicitly approved."
          />
          <div className="mt-5 space-y-3 text-sm font-semibold leading-6 text-[#dbe3ef]">
            <p className="rounded-xl border border-[#2a3242] bg-[#111827] p-4">
              No member-facing BeastHome experience is exposed by this package.
            </p>
            <p className="rounded-xl border border-[#2a3242] bg-[#111827] p-4">
              No maintenance scheduling, security automation, vehicle workflow, or household sharing workflow is active.
            </p>
            <p className="rounded-xl border border-[#2a3242] bg-[#111827] p-4">
              Future home data must use BeastOS ownership, permissions, privacy, and audit boundaries.
            </p>
          </div>
        </DashboardCard>
      </section>
    </BeastHomeShell>
  );
}
