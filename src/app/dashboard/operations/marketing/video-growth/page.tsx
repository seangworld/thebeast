import { DirectYouTubePanel } from "@/app/dashboard/admin/marketing/DirectYouTubePanel";
import { MarketingAdvancedTools } from "../MarketingAdvancedTools";
import { MarketingWorkflowGuide } from "../MarketingWorkflowGuide";
import { MarketingSectionNav } from "@/app/dashboard/admin/marketing/MarketingSectionNav";
import { VideoGrowthEnginePanel } from "@/app/dashboard/admin/marketing/VideoGrowthEnginePanel";
import { OperationsWorkspaceShell } from "../../OperationsWorkspaceShell";

export default function VideoGrowthPage() {
  return <OperationsWorkspaceShell title="BeastMarketing · Video Growth" purpose="Operate video opportunities, scripts, production, presenters, scheduling, funnels, and analytics under owner control."><MarketingSectionNav /><MarketingWorkflowGuide kind="video" /><MarketingAdvancedTools title="Video production and YouTube controls"><DirectYouTubePanel /><VideoGrowthEnginePanel /></MarketingAdvancedTools></OperationsWorkspaceShell>;
}
