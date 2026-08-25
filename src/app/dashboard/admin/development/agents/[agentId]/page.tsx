import { notFound } from "next/navigation";
import { BeastAdminShell } from "../../../BeastAdminShell";
import { getDevelopmentAgentProfile, developmentAgentProfiles } from "@/lib/developmentAgentProfiles";
import { DevelopmentAgentProfileWorkspace } from "../DevelopmentAgentProfileWorkspace";

export function generateStaticParams() {
  return developmentAgentProfiles.map(({ id }) => ({ agentId: id }));
}

export default async function DevelopmentAgentProfilePage({ params }: { params: Promise<{ agentId: string }> }) {
  const { agentId } = await params;
  const profile = getDevelopmentAgentProfile(agentId);
  if (!profile) notFound();
  return <BeastAdminShell title={profile.name} purpose="Owner-only role, authority, assignment, activity, verdict, and evidence visibility from canonical BeastFusion governance."><DevelopmentAgentProfileWorkspace profile={profile} /></BeastAdminShell>;
}
