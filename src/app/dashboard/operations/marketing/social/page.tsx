import { SocialWorkspace } from "@/app/dashboard/admin/marketing/SocialWorkspace";
import { OperationsWorkspaceShell } from "../../OperationsWorkspaceShell";
export default function SocialMarketingPage() {
  return <OperationsWorkspaceShell title="BeastMarketing · Social" purpose="Prepare and publish your Facebook, X, and Instagram posts."><SocialWorkspace /></OperationsWorkspaceShell>;
}
