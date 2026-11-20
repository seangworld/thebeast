import { isBeastAdminOwnerRole } from "@/lib/beastAdmin";
import { createRouteClient } from "@/lib/supabase/server";
import { BeastAdminShell } from "../BeastAdminShell";
import { fetchNewsOperationsStatus } from "@/lib/newsOperations";
import { BeastAdminNewsOperationsWorkspace } from "./BeastAdminNewsOperationsWorkspace";
import { SeangworldIntelligenceWorkspace } from "../intelligence/SeangworldIntelligenceWorkspace";

export const dynamic = "force-dynamic";

async function ownerEditorialLink() {
  const configured = process.env.NEWS_EDITORIAL_LAUNCH_URL?.trim();
  if (!configured) return null;
  try {
    const url = new URL(configured);
    const trustedHost = url.hostname === "news.seangworld.com"
      || (process.env.VERCEL_ENV === "preview" && /^seangworld-[a-z0-9-]+-seangworld-3898s-projects\.vercel\.app$/.test(url.hostname));
    if (!trustedHost || url.protocol !== "https:" || url.port || url.username || url.password
      || url.pathname !== "/news/editorial" || url.search || url.hash) return null;

    const client = createRouteClient();
    const { data: { user }, error } = await client.auth.getUser();
    if (error || !user) return null;
    const { data: profile, error: profileError } = await client.from("profiles").select("role").eq("id", user.id).maybeSingle();
    if (profileError || !isBeastAdminOwnerRole(profile?.role)) return null;
    const { data: allowed, error: sessionError } = await client.rpc("is_current_beast_session_allowed");
    return !sessionError && allowed === true ? url.href : null;
  } catch {
    return null;
  }
}

export default async function BeastAdminNewsOperationsPage() {
  const [status, editorialLink] = await Promise.all([fetchNewsOperationsStatus(), ownerEditorialLink()]);
  return (
    <BeastAdminShell
      title="News Operations"
      purpose="Owner-only operational visibility for SEANGWORLD News coverage, Source Intelligence, AI newsroom readiness, and Fact Desk runtime gates."
    >
      <div className="space-y-6">
        {editorialLink && (
          <a href={editorialLink} rel="noreferrer" className="inline-flex min-h-11 items-center rounded-lg border border-cyan-300/30 px-4 py-2 font-semibold text-cyan-200 hover:bg-cyan-300/10">
            Open News Editor
          </a>
        )}
        <BeastAdminNewsOperationsWorkspace status={status} />
        <section aria-label="SEANGWORLDNEWS audience analytics">
          <SeangworldIntelligenceWorkspace product="seangworldnews" />
        </section>
      </div>
    </BeastAdminShell>
  );
}
