import { MarketingFoundationPage } from "@/app/dashboard/admin/marketing/MarketingFoundationPage";
import { OperationsWorkspaceShell } from "../../OperationsWorkspaceShell";

export default function EmailMarketingPage() {
  return <OperationsWorkspaceShell title="BeastMarketing · Email" purpose="Reserve a governed workspace for future email marketing without activating outbound authority."><MarketingFoundationPage title="Email" description="A dedicated home for future email audience, campaign, lifecycle, and conversion work when a provider and publishing authority are separately approved." bullets={["Audience and lifecycle planning", "Campaign drafts and approval workflow", "Destination and conversion attribution", "Delivery, engagement, and outcome measurement"]} /></OperationsWorkspaceShell>;
}
