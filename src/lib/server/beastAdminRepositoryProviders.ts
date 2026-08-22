import { createSign } from "node:crypto";
import {
  beastAdminRepositoryCatalog,
  type BeastAdminDeploymentObservation,
  type BeastAdminProviderStatus,
  type BeastAdminRepositoryObservation,
} from "../beastAdminRepositoryReleaseIntelligence";

type FetchImplementation = typeof fetch;

const githubApi = "https://api.github.com";
const vercelApi = "https://api.vercel.com";

const vercelProjects: Partial<Record<(typeof beastAdminRepositoryCatalog)[number]["id"], string>> = {
  beast: "BEASTADMIN_VERCEL_PROJECT_THEBEAST",
  seangworld: "BEASTADMIN_VERCEL_PROJECT_SEANGWORLD",
  cw: "BEASTADMIN_VERCEL_PROJECT_CHANGE_THE_WORLD",
};

function base64url(value: string | Buffer) {
  return Buffer.from(value)
    .toString("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

function githubAppJwt(appId: string, privateKey: string, now: Date) {
  const issuedAt = Math.floor(now.getTime() / 1000) - 30;
  const header = base64url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const payload = base64url(
    JSON.stringify({ iat: issuedAt, exp: issuedAt + 9 * 60, iss: appId })
  );
  const unsigned = `${header}.${payload}`;
  const signer = createSign("RSA-SHA256");
  signer.update(unsigned);
  signer.end();
  const signature = base64url(
    signer.sign(privateKey.replace(/\\n/g, "\n"))
  );
  return `${unsigned}.${signature}`;
}

function githubHeaders(token: string) {
  return {
    Accept: "application/vnd.github+json",
    Authorization: `Bearer ${token}`,
    "X-GitHub-Api-Version": "2022-11-28",
    "User-Agent": "TheBeast-BA-CMD-001B",
  };
}

function providerFromStates(
  label: string,
  observations: Array<{ state: string; observedAt: string | null }>,
  configured: boolean
): BeastAdminProviderStatus {
  if (!configured) {
    return {
      status: "not_configured",
      detail: `${label} read-only evidence is not configured.`,
      observedAt: null,
    };
  }
  const observedAt = observations
    .map((observation) => observation.observedAt)
    .filter((value): value is string => Boolean(value))
    .sort()
    .at(-1) || null;
  const connected = observations.filter(
    (observation) => observation.state === "connected"
  ).length;
  if (connected === observations.length && observations.length) {
    return {
      status: "connected",
      detail: `${label} returned valid live read-only evidence.`,
      observedAt,
    };
  }
  if (connected) {
    return {
      status: "partial",
      detail: `${label} returned only part of the configured evidence set.`,
      observedAt,
    };
  }
  return {
    status: "error",
    detail: `${label} could not return valid live evidence.`,
    observedAt,
  };
}

function unavailableRepository(
  repository: string,
  state: BeastAdminRepositoryObservation["state"],
  detail: string
): BeastAdminRepositoryObservation {
  return {
    repository,
    state,
    defaultBranch: null,
    headCommit: null,
    headCommittedAt: null,
    observedAt: null,
    detail,
  };
}

export async function readGitHubRepositoryEvidence({
  fetchImpl = fetch,
  now = new Date(),
}: {
  fetchImpl?: FetchImplementation;
  now?: Date;
} = {}): Promise<{
  provider: BeastAdminProviderStatus;
  observations: BeastAdminRepositoryObservation[];
}> {
  const appId = process.env.BEASTADMIN_GITHUB_APP_ID?.trim() || "";
  const installationId =
    process.env.BEASTADMIN_GITHUB_APP_INSTALLATION_ID?.trim() || "";
  const privateKey = process.env.BEASTADMIN_GITHUB_APP_PRIVATE_KEY?.trim() || "";
  const configured = Boolean(appId && installationId && privateKey);
  if (!configured) {
    const observations = beastAdminRepositoryCatalog.map((item) =>
      unavailableRepository(
        item.repository,
        "not_configured",
        "The read-only GitHub App boundary is not configured."
      )
    );
    return {
      provider: providerFromStates("GitHub", observations, false),
      observations,
    };
  }

  try {
    const tokenResponse = await fetchImpl(
      `${githubApi}/app/installations/${encodeURIComponent(installationId)}/access_tokens`,
      {
        method: "POST",
        headers: githubHeaders(githubAppJwt(appId, privateKey, now)),
        body: JSON.stringify({
          repositories: beastAdminRepositoryCatalog.map(
            (item) => item.repository.split("/")[1]
          ),
          permissions: { contents: "read", metadata: "read" },
        }),
        cache: "no-store",
      }
    );
    if (!tokenResponse.ok) throw new Error("token exchange failed");
    const tokenPayload = (await tokenResponse.json()) as Record<string, unknown>;
    const installationToken =
      typeof tokenPayload.token === "string" ? tokenPayload.token : "";
    if (!installationToken) throw new Error("token missing");

    const observedAt = now.toISOString();
    const observations = await Promise.all(
      beastAdminRepositoryCatalog.map(async (item) => {
        try {
          const repositoryResponse = await fetchImpl(
            `${githubApi}/repos/${item.repository}`,
            { headers: githubHeaders(installationToken), cache: "no-store" }
          );
          if (!repositoryResponse.ok) throw new Error("repository unavailable");
          const repository =
            (await repositoryResponse.json()) as Record<string, unknown>;
          const defaultBranch =
            typeof repository.default_branch === "string"
              ? repository.default_branch
              : "";
          if (!defaultBranch) throw new Error("default branch missing");
          const commitResponse = await fetchImpl(
            `${githubApi}/repos/${item.repository}/commits/${encodeURIComponent(defaultBranch)}`,
            { headers: githubHeaders(installationToken), cache: "no-store" }
          );
          if (!commitResponse.ok) throw new Error("commit unavailable");
          const commit = (await commitResponse.json()) as Record<string, unknown>;
          const sha = typeof commit.sha === "string" ? commit.sha : "";
          const nestedCommit =
            commit.commit && typeof commit.commit === "object"
              ? (commit.commit as Record<string, unknown>)
              : {};
          const committer =
            nestedCommit.committer && typeof nestedCommit.committer === "object"
              ? (nestedCommit.committer as Record<string, unknown>)
              : {};
          if (!/^[0-9a-f]{40}$/i.test(sha)) throw new Error("invalid commit");
          return {
            repository: item.repository,
            state: "connected" as const,
            defaultBranch,
            headCommit: sha.toLowerCase(),
            headCommittedAt:
              typeof committer.date === "string" ? committer.date : null,
            observedAt,
            detail: "GitHub returned the default branch and its current head commit.",
          };
        } catch {
          return unavailableRepository(
            item.repository,
            "error",
            "GitHub could not return a valid repository observation."
          );
        }
      })
    );
    return {
      provider: providerFromStates("GitHub", observations, true),
      observations,
    };
  } catch {
    const observations = beastAdminRepositoryCatalog.map((item) =>
      unavailableRepository(
        item.repository,
        "error",
        "The read-only GitHub App authentication boundary failed closed."
      )
    );
    return {
      provider: providerFromStates("GitHub", observations, true),
      observations,
    };
  }
}

function deploymentObservation(
  repository: string,
  environment: "preview" | "production",
  state: BeastAdminDeploymentObservation["state"],
  detail: string
): BeastAdminDeploymentObservation {
  return {
    repository,
    environment,
    state,
    servedCommit: null,
    branch: null,
    deploymentId: null,
    deploymentUrl: null,
    deployedAt: null,
    observedAt: null,
    detail,
  };
}

function stringValue(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

export async function readVercelDeploymentEvidence({
  fetchImpl = fetch,
  now = new Date(),
}: {
  fetchImpl?: FetchImplementation;
  now?: Date;
} = {}): Promise<{
  provider: BeastAdminProviderStatus;
  observations: BeastAdminDeploymentObservation[];
}> {
  const token = process.env.BEASTADMIN_VERCEL_ACCESS_TOKEN?.trim() || "";
  const teamId = process.env.BEASTADMIN_VERCEL_TEAM_ID?.trim() || "";
  const configuredProjects = Object.values(vercelProjects)
    .map((name) => (name ? process.env[name]?.trim() || "" : ""))
    .filter(Boolean);
  const configured = Boolean(token && teamId && configuredProjects.length);
  if (!configured) {
    const observations = beastAdminRepositoryCatalog.flatMap((item) =>
      (["preview", "production"] as const).map((environment) =>
        deploymentObservation(
          item.repository,
          environment,
          item.deployed ? "not_configured" : "not_applicable",
          item.deployed
            ? "The read-only Vercel deployment boundary is not configured."
            : "This repository has no application deployment boundary."
        )
      )
    );
    return {
      provider: providerFromStates(
        "Vercel",
        observations.filter((item) => item.state !== "not_applicable"),
        false
      ),
      observations,
    };
  }

  const observedAt = now.toISOString();
  const observations = await Promise.all(
    beastAdminRepositoryCatalog.flatMap((item) =>
      (["preview", "production"] as const).map(async (environment) => {
        if (!item.deployed) {
          return deploymentObservation(
            item.repository,
            environment,
            "not_applicable",
            "This repository has no application deployment boundary."
          );
        }
        const variableName = vercelProjects[item.id];
        const projectId = variableName
          ? process.env[variableName]?.trim() || ""
          : "";
        if (!projectId) {
          return deploymentObservation(
            item.repository,
            environment,
            "not_configured",
            "This repository's Vercel project allowlist is not configured."
          );
        }
        try {
          const query = new URLSearchParams({
            projectId,
            teamId,
            target: environment,
            state: "READY",
            limit: "1",
          });
          const response = await fetchImpl(
            `${vercelApi}/v6/deployments?${query.toString()}`,
            {
              headers: { Authorization: `Bearer ${token}` },
              cache: "no-store",
            }
          );
          if (!response.ok) throw new Error("deployment unavailable");
          const payload = (await response.json()) as Record<string, unknown>;
          const deployments = Array.isArray(payload.deployments)
            ? payload.deployments
            : [];
          const deployment =
            deployments[0] && typeof deployments[0] === "object"
              ? (deployments[0] as Record<string, unknown>)
              : null;
          if (!deployment) {
            return deploymentObservation(
              item.repository,
              environment,
              "unavailable",
              `No READY ${environment} deployment was returned.`
            );
          }
          const meta =
            deployment.meta && typeof deployment.meta === "object"
              ? (deployment.meta as Record<string, unknown>)
              : {};
          const gitSource =
            deployment.gitSource && typeof deployment.gitSource === "object"
              ? (deployment.gitSource as Record<string, unknown>)
              : {};
          const sha =
            stringValue(meta.githubCommitSha) ||
            stringValue(meta.gitCommitSha) ||
            stringValue(gitSource.sha);
          const created =
            typeof deployment.createdAt === "number"
              ? new Date(deployment.createdAt).toISOString()
              : stringValue(deployment.createdAt);
          return {
            repository: item.repository,
            environment,
            state: "connected" as const,
            servedCommit: /^[0-9a-f]{40}$/i.test(sha || "")
              ? sha!.toLowerCase()
              : null,
            branch:
              stringValue(meta.githubCommitRef) ||
              stringValue(meta.gitCommitRef) ||
              stringValue(gitSource.ref),
            deploymentId: stringValue(deployment.uid),
            deploymentUrl: stringValue(deployment.url),
            deployedAt: created,
            observedAt,
            detail: sha
              ? `Vercel returned a READY ${environment} deployment and served commit.`
              : `Vercel returned a READY ${environment} deployment without a commit claim.`,
          };
        } catch {
          return deploymentObservation(
            item.repository,
            environment,
            "error",
            `Vercel could not return a valid ${environment} deployment observation.`
          );
        }
      })
    )
  );
  return {
    provider: providerFromStates(
      "Vercel",
      observations.filter((item) => item.state !== "not_applicable"),
      true
    ),
    observations,
  };
}
