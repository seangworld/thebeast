import LearningWorkspaceView from "../../learning/LearningWorkspaceView";
import { isDormantTeachingWorkspace } from "@/lib/education/generationBoundary";
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

  return <LearningWorkspaceView slug={params.workspace} />;
}
