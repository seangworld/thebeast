import contract from "../../contracts/beastfusion-command-projection.contract.json";

export const beastFusionProjectionContract = Object.freeze(contract);

export type BeastFusionProjectionEnvironment = "preview" | "production" | "development" | "unknown";

export type BeastFusionProjectionTargetContract = {
  status: "Compatible";
  contract: typeof beastFusionProjectionContract;
  deployment: {
    project: string | null;
    id: string | null;
    commit: string | null;
    environment: BeastFusionProjectionEnvironment;
    url: string | null;
  };
};

const commitPattern = /^[0-9a-f]{40}$/;
const deploymentPattern = /^dpl_[A-Za-z0-9]+$/;
const projectPattern = /^[A-Za-z0-9_-]+$/;
const hostPattern = /^[A-Za-z0-9.-]+\.vercel\.app$/;

export function buildBeastFusionProjectionTargetContract(
  environment: Record<string, string | undefined> = process.env,
): BeastFusionProjectionTargetContract {
  const target = environment.VERCEL_ENV;
  const normalizedEnvironment: BeastFusionProjectionEnvironment =
    target === "preview" || target === "production" || target === "development" ? target : "unknown";
  const commit = environment.VERCEL_GIT_COMMIT_SHA?.trim() || "";
  const deploymentId = environment.VERCEL_DEPLOYMENT_ID?.trim() || "";
  const project = environment.VERCEL_PROJECT_NAME?.trim() || "";
  const url = environment.VERCEL_URL?.trim() || "";
  return {
    status: "Compatible",
    contract: beastFusionProjectionContract,
    deployment: {
      project: projectPattern.test(project) ? project : null,
      id: deploymentPattern.test(deploymentId) ? deploymentId : null,
      commit: commitPattern.test(commit) ? commit : null,
      environment: normalizedEnvironment,
      url: hostPattern.test(url) ? url : null,
    },
  };
}
