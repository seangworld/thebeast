import { Suspense } from "react";
import { MarketingDraftHandoff } from "../MarketingDraftHandoff";
import { SocialWorkspace } from "@/app/dashboard/admin/marketing/SocialWorkspace";
import { OperationsWorkspaceShell } from "../../OperationsWorkspaceShell";
export default function SocialMarketingPage() {
  return <OperationsWorkspaceShell title="BeastMarketing · Social" purpose="Prepare and publish your Facebook, X, and Instagram posts."><Suspense fallback={null}><MarketingDraftHandoff /></Suspense><SocialWorkspace /></OperationsWorkspaceShell>;
}
