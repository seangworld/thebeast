import { BeastAdminShell } from "../BeastAdminShell";
import { fetchNewsOperationsStatus } from "@/lib/newsOperations";
import { BeastAdminNewsOperationsWorkspace } from "./BeastAdminNewsOperationsWorkspace";
import { SeangworldIntelligenceWorkspace } from "../intelligence/SeangworldIntelligenceWorkspace";

export const dynamic = "force-dynamic";

export default async function BeastAdminNewsOperationsPage() {
  const status = await fetchNewsOperationsStatus();
  return (
    <BeastAdminShell
      title="News Operations"
      purpose="Owner-only operational visibility for SEANGWORLD News coverage, Source Intelligence, AI newsroom readiness, and Fact Desk runtime gates."
    >
      <div className="space-y-6">
        <BeastAdminNewsOperationsWorkspace status={status} />
        <section aria-label="SEANGWORLDNEWS audience analytics">
          <SeangworldIntelligenceWorkspace product="seangworldnews" />
        </section>
      </div>
    </BeastAdminShell>
  );
}
