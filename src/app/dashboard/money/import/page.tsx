import { BeastMoneyShell } from "../BeastMoneyShell";
import { SmartFinancialImport } from "./SmartFinancialImport";

export default function FinancialImportPage() {
  return (
    <BeastMoneyShell title="Smart Financial Import" description="Choose how you want to begin. Nothing is added until you review and confirm it.">
      <SmartFinancialImport />
    </BeastMoneyShell>
  );
}
