import { BeastAdminNewsOperationsWorkspace } from "@/app/dashboard/admin/news/BeastAdminNewsOperationsWorkspace";
import { SeangworldIntelligenceWorkspace } from "@/app/dashboard/admin/intelligence/SeangworldIntelligenceWorkspace";
import { fetchNewsOperationsStatus } from "@/lib/newsOperations";
import { OperationsWorkspaceShell } from "../OperationsWorkspaceShell";

export const dynamic = "force-dynamic";

export default async function NewsOperationsPage() {
  const status = await fetchNewsOperationsStatus();
  return <OperationsWorkspaceShell title="News Operations" purpose="Owner-only operational visibility for SEANGWORLD News coverage, source intelligence, newsroom readiness, and runtime gates."><div className="space-y-6"><BeastAdminNewsOperationsWorkspace status={status} /><section aria-label="SEANGWORLD News audience analytics"><SeangworldIntelligenceWorkspace product="seangworldnews" /></section></div></OperationsWorkspaceShell>;
}
