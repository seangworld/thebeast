"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { canAccessBeastAdmin } from "@/lib/beastAdmin";
import {
  developmentAgentProfiles,
  deriveDevelopmentAgentCanonicalState,
} from "@/lib/developmentAgentProfiles";
import {
  ADMIN_VIEW_MODE_EVENT,
  ADMIN_VIEW_MODE_STORAGE_KEY,
  normalizeAdminViewMode,
} from "@/lib/entitlements";
import { createClient } from "@/lib/supabase/client";
import { useBeastAdminCommandCenter } from "@/lib/useBeastAdminCommandCenter";
import { AgentAvatar } from "@/app/components/agents/AgentExperience";

function loadAdminViewMode() {
  return normalizeAdminViewMode(
    typeof window === "undefined"
      ? "admin"
      : window.localStorage.getItem(ADMIN_VIEW_MODE_STORAGE_KEY)
  );
}

function AuthorizedDevelopmentStaffDirectory() {
  const { canonical, loading } = useBeastAdminCommandCenter();

  return (
    <section
      aria-labelledby="development-staff-heading"
      className="rounded-2xl border border-amber-300/20 bg-amber-300/[0.04] p-5 sm:p-6"
      data-development-staff-directory="owner-only"
    >
      <p className="text-xs font-black uppercase tracking-[0.18em] text-amber-200">
        Development &amp; Operations · Owner only
      </p>
      <h2 id="development-staff-heading" className="mt-2 text-2xl font-black text-white">
        Development staff
      </h2>
      <p className="mt-2 max-w-4xl text-sm leading-6 text-slate-300">
        Observer detects → Proposal Agent researches and recommends → Owner authorizes → Orchestrator coordinates → Developer builds → Reviewer checks → Outcome measures.
      </p>
      <p className="mt-2 text-xs leading-5 text-slate-400">
        These are governed AI roles, not human employees. Detailed package, evidence, execution, and governance records remain inside owner-only BeastAdmin profiles.
      </p>
      <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {developmentAgentProfiles.map((profile) => {
          const state = deriveDevelopmentAgentCanonicalState(profile, canonical);
          return (
            <Link
              key={profile.id}
              href={`/dashboard/admin/development/agents/${profile.id}`}
              className="min-w-0 rounded-2xl border border-white/10 bg-[#111827] p-5 transition hover:border-amber-300/40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-amber-200"
              aria-label={`View owner-only profile for ${profile.name}`}
            >
              <div className="flex items-start justify-between gap-3">
                <AgentAvatar name={profile.name} accessibleLabel={profile.portraitAlt} imageUrl={profile.portraitUrl} size="lg" />
                <span
                  className={`h-2.5 w-2.5 shrink-0 rounded-full ${
                    !loading && state.status === "available" ? "bg-emerald-300" : "bg-slate-500"
                  }`}
                  aria-hidden="true"
                />
              </div>
              <p className="mt-4 text-[11px] font-black uppercase tracking-wide text-amber-100">Development &amp; Operations</p>
              <h3 className="mt-2 text-xl font-black text-white">{profile.name}</h3>
              <p className="mt-1 text-sm font-bold text-amber-200">{profile.title}</p>
              <p className="mt-3 text-sm leading-6 text-slate-300">{profile.role}</p>
              <dl className="mt-4 grid gap-2 border-t border-white/10 pt-4 text-xs">
                <div className="flex items-start justify-between gap-3">
                  <dt className="text-slate-500">Status</dt>
                  <dd className="max-w-[65%] text-right font-bold text-slate-200">
                    {loading ? "Checking canonical state" : state.statusLabel}
                  </dd>
                </div>
                <div className="flex items-start justify-between gap-3">
                  <dt className="text-slate-500">Works with</dt>
                  <dd className="text-right font-bold text-slate-200">
                    {profile.relationships.map(({ label }) => label).join(", ")}
                  </dd>
                </div>
              </dl>
            </Link>
          );
        })}
      </div>
    </section>
  );
}

export function OwnerDevelopmentStaffDirectory() {
  const [authorized, setAuthorized] = useState(false);
  const [adminViewMode, setAdminViewMode] = useState(loadAdminViewMode);

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
    setAuthorized(false);
    async function verifyOwner() {
      try {
        const supabase = createClient();
        const { data: userData } = await supabase.auth.getUser();
        const userId = userData?.user?.id;
        if (!userId) return;
        const { data: profile, error } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", userId)
          .maybeSingle();
        if (active && !error) {
          setAuthorized(canAccessBeastAdmin({ role: profile?.role, adminViewMode }));
        }
      } catch {
        if (active) setAuthorized(false);
      }
    }
    void verifyOwner();
    return () => {
      active = false;
    };
  }, [adminViewMode]);

  return authorized ? <AuthorizedDevelopmentStaffDirectory /> : null;
}
