import { DirectYouTubePanel } from "@/app/dashboard/admin/marketing/DirectYouTubePanel";
import { MarketingSectionNav } from "@/app/dashboard/admin/marketing/MarketingSectionNav";
import { VideoGrowthEnginePanel } from "@/app/dashboard/admin/marketing/VideoGrowthEnginePanel";
import { OperationsWorkspaceShell } from "../../OperationsWorkspaceShell";

export default function VideoGrowthPage() {
  return <OperationsWorkspaceShell title="BeastMarketing · Video Growth" purpose="Operate video opportunities, scripts, production, presenters, scheduling, funnels, and analytics under owner control."><MarketingSectionNav /><DirectYouTubePanel /><VideoGrowthEnginePanel /></OperationsWorkspaceShell>;
}
