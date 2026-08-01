import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
  timingSafeEqual,
} from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";

export const GOOGLE_OAUTH_STATE_COOKIE = "beast_google_oauth_state";
export const GOOGLE_OAUTH_VERIFIER_COOKIE = "beast_google_oauth_verifier";
export const GOOGLE_ADSENSE_SCOPE =
  "https://www.googleapis.com/auth/adsense.readonly";

export type GoogleIntegrationProvider =
  | "adsense"
  | "analytics"
  | "search_console"
  | "drive"
  | "calendar"
  | "gmail";

export type GoogleOAuthConnectionRow = {
  id: string;
  owner_id: string;
  provider: GoogleIntegrationProvider;
  scopes: string[];
  refresh_token_ciphertext: string;
  refresh_token_iv: string;
  refresh_token_tag: string;
  provider_account_id: string | null;
  account_display_name: string | null;
  publisher_id: string | null;
  connected_at: string;
  last_sync_at: string | null;
  updated_at: string;
};

type GoogleTokenResponse = {
  access_token?: string;
  refresh_token?: string;
  expires_in?: number;
  scope?: string;
  token_type?: string;
  error?: string;
};

type AdSenseAccount = {
  name?: string;
  displayName?: string;
  timeZone?: { id?: string };
};

function required(value: string | undefined, name: string) {
  if (!value) throw new Error(`${name} is not configured.`);
  return value;
}

export function getGoogleOAuthConfig(env: NodeJS.ProcessEnv) {
  return {
    clientId: required(env.GOOGLE_CLIENT_ID, "GOOGLE_CLIENT_ID"),
    clientSecret: required(env.GOOGLE_CLIENT_SECRET, "GOOGLE_CLIENT_SECRET"),
    redirectUri: required(env.GOOGLE_REDIRECT_URI, "GOOGLE_REDIRECT_URI"),
  };
}

function encryptionKey(env: NodeJS.ProcessEnv) {
  const configured = required(
    env.GOOGLE_OAUTH_TOKEN_ENCRYPTION_KEY,
    "GOOGLE_OAUTH_TOKEN_ENCRYPTION_KEY"
  );
  const key = /^[a-f0-9]{64}$/i.test(configured)
    ? Buffer.from(configured, "hex")
    : Buffer.from(configured, "base64");
  if (key.length !== 32) {
    throw new Error(
      "GOOGLE_OAUTH_TOKEN_ENCRYPTION_KEY must be 32 bytes encoded as base64 or 64 hexadecimal characters."
    );
  }
  return key;
}

export function encryptGoogleRefreshToken(
  refreshToken: string,
  env: NodeJS.ProcessEnv
) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", encryptionKey(env), iv);
  const ciphertext = Buffer.concat([
    cipher.update(refreshToken, "utf8"),
    cipher.final(),
  ]);
  return {
    refresh_token_ciphertext: ciphertext.toString("base64"),
    refresh_token_iv: iv.toString("base64"),
    refresh_token_tag: cipher.getAuthTag().toString("base64"),
  };
}

export function decryptGoogleRefreshToken(
  row: Pick<
    GoogleOAuthConnectionRow,
    "refresh_token_ciphertext" | "refresh_token_iv" | "refresh_token_tag"
  >,
  env: NodeJS.ProcessEnv
) {
  const decipher = createDecipheriv(
    "aes-256-gcm",
    encryptionKey(env),
    Buffer.from(row.refresh_token_iv, "base64")
  );
  decipher.setAuthTag(Buffer.from(row.refresh_token_tag, "base64"));
  return Buffer.concat([
    decipher.update(Buffer.from(row.refresh_token_ciphertext, "base64")),
    decipher.final(),
  ]).toString("utf8");
}

export function createGoogleOAuthRequest(env: NodeJS.ProcessEnv) {
  const config = getGoogleOAuthConfig(env);
  const state = randomBytes(32).toString("base64url");
  const codeVerifier = randomBytes(48).toString("base64url");
  const codeChallenge = createHash("sha256")
    .update(codeVerifier)
    .digest("base64url");
  const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  url.search = new URLSearchParams({
    client_id: config.clientId,
    redirect_uri: config.redirectUri,
    response_type: "code",
    scope: GOOGLE_ADSENSE_SCOPE,
    access_type: "offline",
    prompt: "consent",
    include_granted_scopes: "true",
    state,
    code_challenge: codeChallenge,
    code_challenge_method: "S256",
  }).toString();
  return { url: url.toString(), state, codeVerifier };
}

export function validOAuthState(expected: string, received: string) {
  const left = Buffer.from(expected);
  const right = Buffer.from(received);
  return left.length === right.length && timingSafeEqual(left, right);
}

async function tokenRequest(
  body: URLSearchParams,
  fetchImpl: typeof fetch
): Promise<GoogleTokenResponse> {
  const response = await fetchImpl("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body,
    cache: "no-store",
  });
  const payload = (await response.json()) as GoogleTokenResponse;
  if (!response.ok || !payload.access_token) {
    throw new Error("Google authorization could not be completed.");
  }
  return payload;
}

export async function exchangeGoogleAuthorizationCode({
  code,
  codeVerifier,
  env,
  fetchImpl = fetch,
}: {
  code: string;
  codeVerifier: string;
  env: NodeJS.ProcessEnv;
  fetchImpl?: typeof fetch;
}) {
  const config = getGoogleOAuthConfig(env);
  return tokenRequest(
    new URLSearchParams({
      code,
      client_id: config.clientId,
      client_secret: config.clientSecret,
      redirect_uri: config.redirectUri,
      grant_type: "authorization_code",
      code_verifier: codeVerifier,
    }),
    fetchImpl
  );
}

export async function refreshGoogleAccessToken({
  refreshToken,
  env,
  fetchImpl = fetch,
}: {
  refreshToken: string;
  env: NodeJS.ProcessEnv;
  fetchImpl?: typeof fetch;
}) {
  const config = getGoogleOAuthConfig(env);
  return tokenRequest(
    new URLSearchParams({
      refresh_token: refreshToken,
      client_id: config.clientId,
      client_secret: config.clientSecret,
      grant_type: "refresh_token",
    }),
    fetchImpl
  );
}

export async function discoverAdSenseAccount(
  accessToken: string,
  fetchImpl: typeof fetch = fetch
) {
  const response = await fetchImpl(
    "https://adsense.googleapis.com/v2/accounts?pageSize=1",
    {
      headers: { authorization: `Bearer ${accessToken}` },
      cache: "no-store",
    }
  );
  if (!response.ok) throw new Error("Google AdSense account discovery failed.");
  const payload = (await response.json()) as { accounts?: AdSenseAccount[] };
  const account = payload.accounts?.[0];
  if (!account?.name) throw new Error("No AdSense account is available for this Google account.");
  return {
    accountId: account.name,
    publisherId: account.name.replace(/^accounts\//, ""),
    displayName: account.displayName || account.name,
  };
}

export async function getGoogleOAuthConnection(
  client: SupabaseClient,
  ownerId: string,
  provider: GoogleIntegrationProvider = "adsense"
) {
  const { data, error } = await client
    .from("google_oauth_connections")
    .select("*")
    .eq("owner_id", ownerId)
    .eq("provider", provider)
    .maybeSingle();
  if (error) throw error;
  return (data as GoogleOAuthConnectionRow | null) || null;
}

export async function saveGoogleOAuthConnection({
  client,
  ownerId,
  provider = "adsense",
  refreshToken,
  scopes,
  account,
  env,
}: {
  client: SupabaseClient;
  ownerId: string;
  provider?: GoogleIntegrationProvider;
  refreshToken: string;
  scopes: string[];
  account: { accountId: string; publisherId: string; displayName: string };
  env: NodeJS.ProcessEnv;
}) {
  const encrypted = encryptGoogleRefreshToken(refreshToken, env);
  const { error } = await client.from("google_oauth_connections").upsert(
    {
      owner_id: ownerId,
      provider,
      scopes,
      ...encrypted,
      provider_account_id: account.accountId,
      publisher_id: account.publisherId,
      account_display_name: account.displayName,
      connected_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    { onConflict: "owner_id,provider" }
  );
  if (error) throw error;
}

export async function getGoogleConnectionSecrets(
  client: SupabaseClient,
  ownerId: string,
  env: NodeJS.ProcessEnv
) {
  const connection = await getGoogleOAuthConnection(client, ownerId);
  if (!connection) return null;
  return {
    connection,
    refreshToken: decryptGoogleRefreshToken(connection, env),
  };
}
