import LearningWorkspaceView from "../../learning/LearningWorkspaceView";

export const dynamic = "force-dynamic";

export default function EducationWorkspacePage({
  params,
}: {
  params: { workspace: string };
}) {
  return <LearningWorkspaceView slug={params.workspace} />;
}
