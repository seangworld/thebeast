"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  DashboardCard,
  ExpandableDetailPanel,
  GuidedEmptyState,
  PlatformPageHeader,
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
import { getModuleRegistryEntry } from "@/lib/moduleRegistry";
import { resolveMemberModuleEntitlement } from "@/lib/memberAgeEntitlements";

export const beastHomeSections = [
  { label: "Overview", href: "/dashboard/home" },
  { label: "Home Inventory", href: "/dashboard/home/inventory" },
  { label: "Home Studio", href: "/dashboard/home/studio" },
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
  const [accessError, setAccessError] = useState("");
  const [retryKey, setRetryKey] = useState(0);
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

    async function verifyMember() {
      setChecking(true); setAuthorized(false); setAccessError("");
      try {
        const supabase = createClient();
        const { data: userData, error: authError } = await supabase.auth.getUser();
        if (authError) throw authError;
        const userId = userData?.user?.id;

        if (!userId) {
          router.replace(buildCurrentAuthLoginPath());
          return;
        }

        const [{ data: profile, error: profileError }, { data: access, error: accessQueryError }] = await Promise.all([
          supabase.from("profiles").select("role,birthday").eq("id", userId).maybeSingle(),
          supabase.from("beast_admin_member_module_access").select("enabled").eq("member_id", userId).eq("module_id", "home").maybeSingle(),
        ]);

        if (!active) return;
        if (profileError || accessQueryError) throw profileError || accessQueryError;
        const isAdmin = profile?.role === "admin" && adminViewMode === "admin";
        const decision = profile
          ? resolveMemberModuleEntitlement({
              module: "home",
              birthday: profile.birthday,
              isAdmin,
              simulatingMember: profile.role === "admin" && adminViewMode !== "admin",
              entry: getModuleRegistryEntry("home"),
              override: typeof access?.enabled === "boolean" ? access.enabled : undefined,
            })
          : null;
        if (profileError || !decision?.allowed) {
          router.replace(decision?.needsBirthday ? "/dashboard/settings/profile" : "/dashboard/education");
          return;
        }

        setAuthorized(true);
      } catch {
        if (active) setAccessError("We couldn’t check access to BeastHome. Please try again.");
      } finally {
        if (active) setChecking(false);
      }
    }

    verifyMember();

    return () => {
      active = false;
    };
  }, [adminViewMode, router, retryKey]);

  if (checking || !authorized) {
    return (
      <main className="beast-page">
        <div className="beast-container">
          <DashboardCard accent="home">
            <SectionHeader
              eyebrow="BeastHome"
              title={accessError ? "BeastHome could not be loaded" : "Checking member access"}
              description="BeastHome records stay inside the signed-in member’s private account."
            />
            {accessError ? <div role="alert"><p className="mt-3">{accessError}</p><button className="beast-button-secondary mt-3" onClick={() => setRetryKey(value => value + 1)}>Try again</button></div> : null}
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
            eyebrow="Planned"
            title={`${page.title} workspace`}
            description="Home Inventory and Home Studio are available now. This separate home workspace remains planned and inactive."
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
            eyebrow="Available now"
            title="Use the released BeastHome workspaces"
            description="Build a private inventory or create a review-first room concept in Home Studio. Household sharing and home automation are not active."
          />
          <div className="mt-5 space-y-3 text-sm font-semibold leading-6 text-[#dbe3ef]">
            <GuidedEmptyState title="Build the household story progressively" description="This workspace is planned. You can already save a home inventory, design one room in Home Studio, and organize documents and goals." guidance="Begin with one verified record or one room project instead of filling an empty dashboard." nextAction={{ label: "Open Home Studio", href: "/dashboard/home/studio" }} secondaryAction={{ label: "Open Home Inventory", href: "/dashboard/home/inventory" }} />
            <ExpandableDetailPanel summary="What’s available today">
            <p className="rounded-xl border border-[#2a3242] bg-[#111827] p-4">
              Home Inventory and Home Studio are the active member-facing BeastHome workflows in this release.
            </p>
            <p className="rounded-xl border border-[#2a3242] bg-[#111827] p-4">
              No maintenance scheduling, security automation, vehicle workflow, or household sharing workflow is active.
            </p>
            <p className="rounded-xl border border-[#2a3242] bg-[#111827] p-4">
              Your inventory and linked documents belong to your private account.
            </p>
            </ExpandableDetailPanel>
          </div>
        </DashboardCard>
      </section>
    </BeastHomeShell>
  );
}
