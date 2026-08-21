import { BeastAdminShell } from "../../BeastAdminShell";
import { BeastHunterWorkspace } from "./BeastHunterWorkspace";

export default function BeastHunterPage() {
  return (
    <BeastAdminShell
      title="BeastHunter"
      purpose="Define the opportunity you want, filter the market first, then rank evidence-backed opportunities by urgency, commercial value, risk, and SEANGWORLD fit."
    >
      <BeastHunterWorkspace />
    </BeastAdminShell>
  );
}
