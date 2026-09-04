import Link from "next/link";
import { BeastAdminShell } from "../BeastAdminShell";
import { SeangworldIntelligenceWorkspace } from "./SeangworldIntelligenceWorkspace";

export default function SeangworldIntelligencePage() {
  return (
    <BeastAdminShell
      title="SEANGWORLD Intelligence"
      purpose="Aggregate verified public-site analytics, search visibility, and ecosystem telemetry without inventing provider data."
      actions={
        <Link
          href="/dashboard/admin/intelligence/newsroom"
          className="inline-flex min-h-11 items-center rounded-lg border border-amber-300/30 bg-amber-300/10 px-4 py-2 text-sm font-black text-amber-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-200"
        >
          Newsroom Status
        </Link>
      }
    >
      <SeangworldIntelligenceWorkspace />
    </BeastAdminShell>
  );
}
