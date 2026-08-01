import LearningWorkspaceView from "../../learning/LearningWorkspaceView";
import {
  isDormantTeachingWorkspace,
  retiredPlanningAliases,
} from "@/lib/education/generationBoundary";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default function EducationWorkspacePage({
  params,
}: {
  params: { workspace: string };
}) {
  if (isDormantTeachingWorkspace(params.workspace)) {
    redirect("/dashboard/education");
  }

  const planningDestination = retiredPlanningAliases[params.workspace];
  if (planningDestination) redirect(planningDestination);

  if (["profile", "paths", "roadmap", "documents", "outcomes", "research"].includes(params.workspace)) {
    redirect(`/dashboard/education#${params.workspace}`);
  }

  return <LearningWorkspaceView slug={params.workspace} />;
}
