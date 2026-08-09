import LearningWorkspaceView from "../../learning/LearningWorkspaceView";
import {
  isDormantTeachingWorkspace,
  retiredPlanningAliases,
} from "@/lib/education/generationBoundary";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function EducationWorkspacePage({
  params,
}: {
  params: Promise<{ workspace: string }>;
}) {
  const { workspace } = await params;
  if (isDormantTeachingWorkspace(workspace)) {
    redirect("/dashboard/education");
  }

  const planningDestination = retiredPlanningAliases[workspace];
  if (planningDestination) redirect(planningDestination);

  if (["profile", "paths", "roadmap", "documents", "outcomes", "research"].includes(workspace)) {
    redirect(`/dashboard/education#${workspace}`);
  }

  return <LearningWorkspaceView slug={workspace} />;
}
