"use client";
import { useEffect, useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";

type GuideHost = { version: 1; supabase: SupabaseClient; apiBase: "/api/beastguide"; accountHref: "/dashboard/settings/profile"; legacyPublishableKey?: string; preview: boolean };
declare global { interface Window { __BEASTGUIDE_HOST__?: GuideHost } }

export default function BeastGuideWorkspace({acceptancePreview=false}:{acceptancePreview?:boolean}) {
  const [ready, setReady] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    setReady(false);
    const client = createClient();
    let mounted = true;
    const host: GuideHost = {version:1,preview:acceptancePreview,supabase:client,apiBase:"/api/beastguide",accountHref:"/dashboard/settings/profile",legacyPublishableKey:process.env.NEXT_PUBLIC_BEASTGUIDE_LEGACY_PUBLISHABLE_KEY};
    void client.auth.getUser().then(({data,error}) => {
      if (!mounted) return;
      if (error || !data.user) { setError("Your Beast account could not be verified. Sign in again or retry."); return; }
      window.__BEASTGUIDE_HOST__ = host;
      setReady(true);
    }).catch(() => { if(mounted) setError("Your Beast account is temporarily unavailable. Please retry."); });
    const {data:{subscription}} = client.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_OUT" && mounted) { setReady(false); setError("Your BeastOS session has ended. Sign in again to reopen BeastGuide."); }
    });
    return () => { mounted=false; subscription.unsubscribe(); if(window.__BEASTGUIDE_HOST__===host) delete window.__BEASTGUIDE_HOST__; };
  }, [acceptancePreview]);
  return <section aria-label="BeastGuide entertainment workspace" className="min-w-0">
    {error ? <p role="alert">{error} <a href="/login?next=%2Fdashboard%2Fbeastguide">Sign in</a></p> : !ready ? <p role="status">Opening BeastGuide with your Beast account…</p> :
      <iframe title="BeastGuide" src="/beastguide-app/index.html" className="w-full rounded-2xl border border-cyan-400/20 bg-[#07101f]" style={{height:"calc(100dvh - 10rem)",minHeight:480}} allow="camera 'none'; microphone 'none'; geolocation 'none'; payment 'none'" />}
  </section>;
}
