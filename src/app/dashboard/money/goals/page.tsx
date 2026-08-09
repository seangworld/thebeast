import GoalsOverviewPage from "../../goals/page";

export default function MoneyGoalsPage() {
  return <GoalsOverviewPage searchParams={Promise.resolve({ module: "money" })} />;
}
