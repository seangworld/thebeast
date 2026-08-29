"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  DashboardCard,
  ExpandableDetailPanel,
  GuidedEmptyState,
  ModuleBadge,
  PlatformPageHeader,
  SectionHeader,
} from "@/app/components/design/DashboardPrimitives";
import { createClient } from "@/lib/supabase/client";
import { buildCurrentAuthLoginPath } from "@/lib/auth/experience";

export const beastHomeSections = [
  { label: "Overview", href: "/dashboard/home" },
  { label: "Home Inventory", href: "/dashboard/home/inventory" },
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

    async function verifyMember() {
      try {
        const supabase = createClient();
        const { data: userData } = await supabase.auth.getUser();
        const userId = userData?.user?.id;

        if (!userId) {
          router.replace(buildCurrentAuthLoginPath());
          return;
        }

        if (!active) return;
        setAuthorized(true);
      } finally {
        if (active) setChecking(false);
      }
    }

    verifyMember();

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
              title="Checking member access"
              description="BeastHome records stay inside the signed-in member’s private account."
            />
          </DashboardCard>
        </div>
      </main>
    );
  }

  return (
    <main className="beast-page">
      <div className="beast-container space-y-6">
        <PlatformPageHeader
          module="home"
          badge="Member Private"
          title={title}
          description={description}
        />

        <nav className="flex flex-wrap gap-2" aria-label="BeastHome sections">
          {beastHomeSections.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="beast-module-tab"
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
            description="BeastHome begins with a private, member-owned home inventory. Other home workspaces remain planned and inactive."
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
            title="Private member boundary"
            description="Inventory records are scoped to the signed-in member. Household sharing and home automation are not active."
          />
          <div className="mt-5 space-y-3 text-sm font-semibold leading-6 text-[#dbe3ef]">
            <GuidedEmptyState title="Build the household story progressively" description="The module is not collecting household records yet, but you can organize source documents and shared goals now." guidance="Begin with one verified property, vehicle, or maintenance document instead of filling an empty dashboard." nextAction={{ label: "Add a document", href: "/dashboard/uploads" }} secondaryAction={{ label: "Review goals", href: "/dashboard/goals" }} />
            <ExpandableDetailPanel summary="Automation and privacy boundaries">
            <p className="rounded-xl border border-[#2a3242] bg-[#111827] p-4">
              Photo-to-Home-Inventory is the only active member-facing BeastHome workflow in this release.
            </p>
            <p className="rounded-xl border border-[#2a3242] bg-[#111827] p-4">
              No maintenance scheduling, security automation, vehicle workflow, or household sharing workflow is active.
            </p>
            <p className="rounded-xl border border-[#2a3242] bg-[#111827] p-4">
              Future home data must use BeastOS ownership, permissions, privacy, and audit boundaries.
            </p>
            </ExpandableDetailPanel>
          </div>
        </DashboardCard>
      </section>
    </BeastHomeShell>
  );
}
