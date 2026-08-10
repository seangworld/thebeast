import GoalsOverviewPage from "../../goals/page";

export default function HealthGoalsPage() {
  return <GoalsOverviewPage searchParams={Promise.resolve({ module: "health" })} />;
}
