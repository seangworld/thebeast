import { LocalWorkspaceNavigation } from "@/app/components/navigation/LocalWorkspaceNavigation";
import { moneyManagementWorkspaces } from "@/lib/moneyNavigation";

export function MoneyManagementNavigation() {
  return (
    <LocalWorkspaceNavigation
      label="Financial management workspaces"
      items={moneyManagementWorkspaces}
    />
  );
}
