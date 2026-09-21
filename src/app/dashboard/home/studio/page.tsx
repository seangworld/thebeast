import { parseHomeStudioAffiliates } from "@/lib/homeStudioAffiliates";
export const dynamic = "force-dynamic";
import { BeastHomeShell } from "../BeastHomeShell";
import { HomeStudioWorkspace } from "./HomeStudioWorkspace";

export default function BeastHomeStudioPage() {
  return (
    <BeastHomeShell
      title="Home Studio"
      description="Create a reviewable room plan, shopping targets, and an optional AI visual concept from your photo and preferences."
    >
      <HomeStudioWorkspace affiliates={parseHomeStudioAffiliates(process.env.HOME_STUDIO_AFFILIATE_LINKS_JSON, process.env.HOME_STUDIO_AFFILIATES_ENABLED)} />
    </BeastHomeShell>
  );
}
