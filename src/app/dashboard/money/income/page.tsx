import { BeastMoneyShell } from "../BeastMoneyShell";
import { IncomeWorkspace } from "./IncomeWorkspace";

export default function IncomePage() {
  return (
    <BeastMoneyShell
      title="Income"
      description="Manage income sources, paycheck timing, assignment pots, and funding rules in one dedicated workspace."
    >
      <IncomeWorkspace />
    </BeastMoneyShell>
  );
}
