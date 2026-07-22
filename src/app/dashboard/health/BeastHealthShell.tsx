"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  DashboardCard,
  ExpandableDetailPanel,
  GuidedEmptyState,
  ModuleBadge,
  SectionHeader,
} from "@/app/components/design/DashboardPrimitives";
import { createClient } from "@/lib/supabase/client";
import { isBeastAdminOwnerRole } from "@/lib/beastAdmin";

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
  { label: "AI Advisor", href: "/dashboard/health/ai-advisor" },
];

export type BeastHealthPlaceholder = {
  title: string;
  description: string;
  focus: string[];
};

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
          <DashboardCard accent="health">
            <SectionHeader
              eyebrow="BeastHealth"
              title="Checking owner access"
              description="BeastHealth foundation routes are protected for admin-only review."
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
            <ModuleBadge module="health" label="Admin Only" />
            <h1 className="beast-title">{title}</h1>
            <p className="beast-subtitle">{description}</p>
          </div>
        </section>

        <nav className="flex flex-wrap gap-2" aria-label="BeastHealth sections">
          {beastHealthSections.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-lg border border-emerald-300/30 bg-emerald-300/10 px-3 py-2 text-sm font-bold text-emerald-100 transition hover:border-emerald-200 hover:bg-emerald-200/20"
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

export function BeastHealthPlaceholderPage({
  page,
}: {
  page: BeastHealthPlaceholder;
}) {
  return (
    <BeastHealthShell
      title={page.title}
      description={page.description}
    >
      <section className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
        <DashboardCard accent="health">
          <SectionHeader
            eyebrow="Foundation"
            title={`${page.title} workspace`}
            description="This admin-only foundation reserves the BeastHealth workspace without collecting member health data or providing medical advice."
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
            description="BeastHealth is admin-only until product scope, safety, privacy, permissions, and health AI policy are explicitly approved."
          />
          <div className="mt-5 space-y-3 text-sm font-semibold leading-6 text-[#dbe3ef]">
            <GuidedEmptyState title="Define the safe health experience first" description="No health data is collected yet. Review the shared platform and documentation boundaries before enabling a member workflow." guidance="Start with permissions, provenance, and a qualified-care escalation path." nextAction={{ label: "Review settings", href: "/dashboard/settings" }} secondaryAction={{ label: "Open documents", href: "/dashboard/uploads" }} />
            <ExpandableDetailPanel summary="Safety and data boundaries">
            <p className="rounded-xl border border-[#2a3242] bg-[#111827] p-4">
              No member-facing BeastHealth experience is exposed by this package.
            </p>
            <p className="rounded-xl border border-[#2a3242] bg-[#111827] p-4">
              No diagnosis, treatment, medication guidance, or clinical advice is provided.
            </p>
            <p className="rounded-xl border border-[#2a3242] bg-[#111827] p-4">
              Future health data must use BeastOS ownership, permissions, privacy, and audit boundaries.
            </p>
            </ExpandableDetailPanel>
          </div>
        </DashboardCard>
      </section>
    </BeastHealthShell>
  );
}
