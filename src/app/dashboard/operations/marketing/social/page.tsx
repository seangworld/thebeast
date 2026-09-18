import { MarketingFoundationPage } from "@/app/dashboard/admin/marketing/MarketingFoundationPage";
import { OperationsWorkspaceShell } from "../../OperationsWorkspaceShell";

export default function SocialMarketingPage() {
  return <OperationsWorkspaceShell title="BeastMarketing · Social" purpose="Keep future owned-social planning distinct from paid advertising and video production."><MarketingFoundationPage title="Social" description="A dedicated owner-only home for future social-channel planning, repurposing, scheduling, attribution, and performance learning." bullets={["Channel-specific content planning and repurposing", "Scheduling and approval controls", "Campaign attribution and destination tracking", "Cross-channel performance and learning"]} /></OperationsWorkspaceShell>;
}
