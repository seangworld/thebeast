"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { AgentAvatar } from "@/app/components/agents/AgentExperience";
import { canAccessBeastAdmin } from "@/lib/beastAdmin";
import { developmentAgentProfiles } from "@/lib/developmentAgentProfiles";
import { ADMIN_VIEW_MODE_EVENT, ADMIN_VIEW_MODE_STORAGE_KEY, normalizeAdminViewMode } from "@/lib/entitlements";
import { createClient } from "@/lib/supabase/client";

const orchestrator = developmentAgentProfiles.find(({ id }) => id === "orchestrator-3")!;
const coordinatedStaff = developmentAgentProfiles.filter(({ id }) => id !== "orchestrator-3");

function currentAdminViewMode() {
  return normalizeAdminViewMode(typeof window === "undefined" ? "admin" : window.localStorage.getItem(ADMIN_VIEW_MODE_STORAGE_KEY));
}

function ChainCard({ profile }: { profile: (typeof developmentAgentProfiles)[number] }) {
  return (
    <Link href={`/dashboard/admin/development/agents/${profile.id}`} className="min-w-0 rounded-2xl border border-white/10 bg-[#111827] p-4 transition hover:border-amber-300/40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-amber-200" aria-label={`Open owner-only profile for ${profile.name}`}>
      <AgentAvatar name={profile.name} accessibleLabel={profile.portraitAlt} imageUrl={profile.portraitUrl} size="lg" />
      <h3 className="mt-3 text-lg font-black text-white">{profile.name}</h3>
      <p className="mt-1 text-xs font-bold text-amber-200">{profile.title}</p>
      <p className="mt-3 text-xs leading-5 text-slate-400">{profile.authorityBoundary}</p>
    </Link>
  );
}

function AuthorizedChainOfCommand() {
  return (
    <section aria-labelledby="development-chain-heading" className="rounded-2xl border border-amber-300/20 bg-amber-300/[0.04] p-5 sm:p-6" data-development-chain="owner-only">
      <p className="text-xs font-black uppercase tracking-[0.18em] text-amber-200">Development &amp; Operations · Owner only</p>
      <h2 id="development-chain-heading" className="mt-2 text-2xl font-black text-white">AI development staff chain of command</h2>
      <p className="mt-2 max-w-4xl text-sm leading-6 text-slate-300">Who works for whom, who coordinates whom, who checks whom, and who has final authority.</p>
      <div className="mx-auto mt-6 max-w-xl rounded-2xl border border-cyan-300/30 bg-cyan-300/[0.07] p-5 text-center">
        <p className="text-xs font-black uppercase tracking-[0.16em] text-cyan-200">Final authority</p>
        <h3 className="mt-2 text-2xl font-black text-white">Owner / Sean</h3>
        <p className="mt-2 text-sm text-slate-300">Authorizes scope, execution, acceptance, release, remediation, rollback, and successor work.</p>
      </div>
      <div className="mx-auto h-8 w-px bg-amber-300/40" aria-hidden="true" />
      <div className="mx-auto max-w-xl"><ChainCard profile={orchestrator} /></div>
      <div className="mx-auto h-8 w-px bg-amber-300/40" aria-hidden="true" />
      <div className="mx-auto h-px max-w-5xl bg-amber-300/30" aria-hidden="true" />
      <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">{coordinatedStaff.map((profile) => <ChainCard key={profile.id} profile={profile} />)}</div>
      <div className="mt-6 rounded-xl border border-white/10 bg-black/20 p-4">
        <p className="text-xs font-black uppercase tracking-[0.16em] text-amber-200">Functional lifecycle</p>
        <p className="mt-2 text-sm font-bold leading-6 text-white">Observer detects → Proposal Agent researches/recommends → Owner authorizes → Orchestrator coordinates → Developer builds → Reviewer independently checks → Outcome measures</p>
        <p className="mt-2 text-xs leading-5 text-slate-400">Findings, recommendations, review PASS, and outcome reports never replace owner authorization. Reviewer remains independent from Developer.</p>
      </div>
    </section>
  );
}

export function OwnerDevelopmentStaffRelationships() {
  const [authorized, setAuthorized] = useState(false);
  const [adminViewMode, setAdminViewMode] = useState(currentAdminViewMode);
  useEffect(() => {
    const sync = () => setAdminViewMode(currentAdminViewMode());
    window.addEventListener("storage", sync);
    window.addEventListener(ADMIN_VIEW_MODE_EVENT, sync);
    return () => { window.removeEventListener("storage", sync); window.removeEventListener(ADMIN_VIEW_MODE_EVENT, sync); };
  }, []);
  useEffect(() => {
    let active = true;
    setAuthorized(false);
    void (async () => {
      try {
        const client = createClient();
        const { data: userData } = await client.auth.getUser();
        if (!userData.user) return;
        const { data, error } = await client.from("profiles").select("role").eq("id", userData.user.id).maybeSingle();
        if (active && !error) setAuthorized(canAccessBeastAdmin({ role: data?.role, adminViewMode }));
      } catch { if (active) setAuthorized(false); }
    })();
    return () => { active = false; };
  }, [adminViewMode]);
  return authorized ? <AuthorizedChainOfCommand /> : null;
}
