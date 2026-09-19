import { BeastHomeShell } from "../BeastHomeShell";
import { HomeStudioWorkspace } from "./HomeStudioWorkspace";

export default function BeastHomeStudioPage() {
  return (
    <BeastHomeShell
      title="Home Studio"
      description="Create a reviewable room plan, shopping targets, and an optional AI visual concept from your photo and preferences."
    >
      <HomeStudioWorkspace />
    </BeastHomeShell>
  );
}
