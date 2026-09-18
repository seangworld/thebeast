import { SeangworldIntelligenceWorkspace } from "@/app/dashboard/admin/intelligence/SeangworldIntelligenceWorkspace";
import { OperationsWorkspaceShell } from "../OperationsWorkspaceShell";

export default function OperationsAnalyticsPage() {
  return <OperationsWorkspaceShell title="Company Analytics" purpose="Aggregate verified public-site analytics, search visibility, and ecosystem telemetry without inventing provider data."><SeangworldIntelligenceWorkspace /></OperationsWorkspaceShell>;
}
