import GoalsOverviewPage from "../../goals/page";

export default function EducationGoalsPage() {
  return <GoalsOverviewPage searchParams={Promise.resolve({ module: "education" })} />;
}
