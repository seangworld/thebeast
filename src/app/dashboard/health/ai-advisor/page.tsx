import { HealthAdvisorWorkspace } from "../HealthAdvisorWorkspace";

export default async function HealthAiAdvisorPage({ searchParams }: { searchParams: Promise<{ veterans?: string }> }) {
  const params = await searchParams;
  return <HealthAdvisorWorkspace initialVeteransMode={params.veterans === "1"} />;
}
