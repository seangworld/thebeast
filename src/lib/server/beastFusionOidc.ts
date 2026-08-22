import { createHash, createPublicKey, verify as verifySignature } from "node:crypto";

const issuer = "https://token.actions.githubusercontent.com";
const configurationUrl = `${issuer}/.well-known/openid-configuration`;
const expectedRepository = "seangworld/beastfusion";
const expectedRef = "refs/heads/main";
const expectedSubject = "repo:seangworld@271630738/beastfusion@129741450:ref:refs/heads/main";
const jwtPattern = /^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/;

type JsonRecord = Record<string, unknown>;
type Jwk = JsonRecord & { kid?: string; kty?: string };

export type BeastFusionWorkflowIdentity = {
  issuer: string;
  subject: string;
  audience: string;
  repository: string;
  workflowRef: string;
  ref: string;
  sourceCommit: string;
  runNumber: number;
  runAttempt: number;
  tokenDigest: string;
};

export type BeastFusionOidcResult =
  | { ok: true; identity: BeastFusionWorkflowIdentity }
  | { ok: false; reason: string };

let cachedKeys: { expiresAt: number; keys: Jwk[] } | null = null;

function record(value: unknown): JsonRecord | null {
  return value && typeof value === "object" && !Array.isArray(value) ? value as JsonRecord : null;
}

function decodePart(value: string): JsonRecord | null {
  try {
    return record(JSON.parse(Buffer.from(value, "base64url").toString("utf8")));
  } catch {
    return null;
  }
}

function exactString(value: unknown) {
  return typeof value === "string" && value.length > 0 ? value : null;
}

function positiveInteger(value: unknown) {
  const parsed = typeof value === "number" ? value : typeof value === "string" && /^\d+$/.test(value) ? Number(value) : NaN;
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : null;
}

function audienceMatches(value: unknown, expected: string) {
  return value === expected || (Array.isArray(value) && value.length === 1 && value[0] === expected);
}

async function trustedKeys(now: number): Promise<Jwk[]> {
  if (cachedKeys && cachedKeys.expiresAt > now) return cachedKeys.keys;
  const configurationResponse = await fetch(configurationUrl, { cache: "no-store", signal: AbortSignal.timeout(5_000) });
  if (!configurationResponse.ok) throw new Error("OIDC configuration unavailable");
  const configuration = record(await configurationResponse.json());
  const jwksUri = configuration?.jwks_uri;
  if (configuration?.issuer !== issuer || typeof jwksUri !== "string") throw new Error("OIDC configuration is not trusted");
  const jwksUrl = new URL(jwksUri);
  if (jwksUrl.protocol !== "https:" || jwksUrl.hostname !== "token.actions.githubusercontent.com") throw new Error("OIDC key endpoint is not trusted");
  const keysResponse = await fetch(jwksUrl, { cache: "no-store", signal: AbortSignal.timeout(5_000) });
  if (!keysResponse.ok) throw new Error("OIDC keys unavailable");
  const jwks = record(await keysResponse.json());
  const keys = Array.isArray(jwks?.keys) ? jwks.keys.map(record).filter((key): key is Jwk => Boolean(key)) : [];
  if (!keys.length) throw new Error("OIDC keys unavailable");
  cachedKeys = { expiresAt: now + 5 * 60 * 1000, keys };
  return keys;
}

export async function verifyBeastFusionWorkflowOidc(input: {
  authorization: string | null;
  expectedAudience: string;
  expectedWorkflowRef: string;
  now?: number;
  keys?: Jwk[];
}): Promise<BeastFusionOidcResult> {
  const token = input.authorization?.match(/^Bearer\s+(.+)$/i)?.[1] ?? "";
  if (!jwtPattern.test(token)) return { ok: false, reason: "Machine identity is missing or malformed." };
  if (!input.expectedAudience || !input.expectedWorkflowRef) return { ok: false, reason: "Machine identity allowlist is not configured." };
  const [encodedHeader, encodedPayload, encodedSignature] = token.split(".");
  const header = decodePart(encodedHeader);
  const claims = decodePart(encodedPayload);
  if (!header || !claims || header.alg !== "RS256" || header.typ !== "JWT" || typeof header.kid !== "string") return { ok: false, reason: "Machine identity header is invalid." };

  const now = input.now ?? Date.now();
  let keys: Jwk[];
  try {
    keys = input.keys ?? await trustedKeys(now);
  } catch {
    return { ok: false, reason: "Machine identity verification is unavailable." };
  }
  const key = keys.find((candidate) => candidate.kid === header.kid && candidate.kty === "RSA");
  if (!key) return { ok: false, reason: "Machine identity signing key is not trusted." };
  try {
    const signedContent = encodedHeader.concat(".", encodedPayload);
    const valid = verifySignature("RSA-SHA256", Buffer.from(signedContent), createPublicKey({ key, format: "jwk" }), Buffer.from(encodedSignature, "base64url"));
    if (!valid) return { ok: false, reason: "Machine identity signature is invalid." };
  } catch {
    return { ok: false, reason: "Machine identity signature is invalid." };
  }

  const nowSeconds = Math.floor(now / 1000);
  const issuedAt = positiveInteger(claims.iat);
  const notBefore = positiveInteger(claims.nbf);
  const expiresAt = positiveInteger(claims.exp);
  if (claims.iss !== issuer || !audienceMatches(claims.aud, input.expectedAudience)) return { ok: false, reason: "Machine identity issuer or audience is not allowed." };
  if (!issuedAt || !notBefore || !expiresAt || issuedAt > nowSeconds + 60 || notBefore > nowSeconds + 60 || expiresAt <= nowSeconds || expiresAt - issuedAt > 15 * 60) return { ok: false, reason: "Machine identity is expired or outside its allowed lifetime." };
  if (claims.repository !== expectedRepository || claims.ref !== expectedRef || claims.workflow_ref !== input.expectedWorkflowRef) return { ok: false, reason: "Machine identity repository, workflow, or ref is not allowed." };
  const subject = exactString(claims.sub);
  const sourceCommit = exactString(claims.sha);
  const runNumber = positiveInteger(claims.run_number);
  const runAttempt = positiveInteger(claims.run_attempt);
  if (subject !== expectedSubject) return { ok: false, reason: "Machine identity subject is not allowed." };
  if (!sourceCommit?.match(/^[0-9a-f]{40}$/)) return { ok: false, reason: "Machine identity source commit is malformed." };
  if (!runNumber || !runAttempt) return { ok: false, reason: "Machine identity workflow run metadata is invalid." };

  return {
    ok: true,
    identity: {
      issuer,
      subject,
      audience: input.expectedAudience,
      repository: expectedRepository,
      workflowRef: input.expectedWorkflowRef,
      ref: expectedRef,
      sourceCommit,
      runNumber,
      runAttempt,
      tokenDigest: `sha256:${createHash("sha256").update(token).digest("hex")}`,
    },
  };
}

export function resetBeastFusionOidcCacheForTests() {
  cachedKeys = null;
}
