import { parseHomeStudioAffiliates } from "@/lib/homeStudioAffiliates";
export const dynamic = "force-dynamic";
import { BeastHomeShell } from "../BeastHomeShell";
import { HomeStudioWorkspace } from "./HomeStudioWorkspace";

export default function BeastHomeStudioPage() {
  return (
    <BeastHomeShell
      title="Home Studio"
      description="Upload photos, tell us what you want to change, and see your redesigned room."
    >
      <HomeStudioWorkspace affiliates={parseHomeStudioAffiliates(process.env.HOME_STUDIO_AFFILIATE_LINKS_JSON, process.env.HOME_STUDIO_AFFILIATES_ENABLED)} />
    </BeastHomeShell>
  );
}
