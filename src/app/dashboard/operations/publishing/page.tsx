import { KdpPublishingFactoryPanel } from "@/app/dashboard/admin/marketing/publishing/KdpPublishingFactoryPanel";
import { OperationsWorkspaceShell } from "../OperationsWorkspaceShell";

export default function PublishingPage() {
  return <OperationsWorkspaceShell title="KDP / Publishing" purpose="Find evidence-backed book opportunities, create complete preparation packages, and keep Amazon submission under owner control."><KdpPublishingFactoryPanel /></OperationsWorkspaceShell>;
}
