import GoalsOverviewPage from "../../goals/page";
import { OwnerOnlyModuleGuard } from "../../OwnerOnlyModuleGuard";

export default function HomeGoalsPage() {
  return (
    <OwnerOnlyModuleGuard module="home" applicationName="BeastHome">
      <GoalsOverviewPage searchParams={Promise.resolve({ module: "home" })} />
    </OwnerOnlyModuleGuard>
  );
}
