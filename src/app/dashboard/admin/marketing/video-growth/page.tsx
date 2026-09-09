import { BeastAdminShell } from "../../BeastAdminShell";
import { MarketingSectionNav } from "../MarketingSectionNav";
import { VideoGrowthEnginePanel } from "../VideoGrowthEnginePanel";
import { DirectYouTubePanel } from "../DirectYouTubePanel";

export default function VideoGrowthPage() {
  return (
    <BeastAdminShell
      title="BeastMarketing · Video Growth"
      purpose="Operate the owner-only AI Video & YouTube Growth Engine: opportunities, scripts, production, presenters, scheduling, funnels, analytics, and future AI Sean support."
    >
      <MarketingSectionNav />
      <DirectYouTubePanel />
      <VideoGrowthEnginePanel />
    </BeastAdminShell>
  );
}
