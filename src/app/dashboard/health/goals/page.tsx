import GoalsOverviewPage from "../../goals/page";
import { OwnerOnlyModuleGuard } from "../../OwnerOnlyModuleGuard";

export default function HealthGoalsPage() {
  return (
    <OwnerOnlyModuleGuard module="health" applicationName="BeastHealth">
      <GoalsOverviewPage searchParams={Promise.resolve({ module: "health" })} />
    </OwnerOnlyModuleGuard>
  );
}
