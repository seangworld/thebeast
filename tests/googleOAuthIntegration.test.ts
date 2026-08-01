import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  createGoogleOAuthRequest,
  decryptGoogleRefreshToken,
  encryptGoogleRefreshToken,
  GOOGLE_ADSENSE_SCOPE,
  validOAuthState,
} from "../src/lib/server/googleOAuth";

const env: NodeJS.ProcessEnv = {
  NODE_ENV: "test",
  GOOGLE_CLIENT_ID: "google-client",
  GOOGLE_CLIENT_SECRET: "google-secret",
  GOOGLE_REDIRECT_URI: "https://thebeast.example/api/admin/revenue/google/callback",
  GOOGLE_OAUTH_TOKEN_ENCRYPTION_KEY: Buffer.alloc(32, 7).toString("base64"),
};

test("BA-ADS-202 encrypts refresh tokens with authenticated encryption", () => {
  const encrypted = encryptGoogleRefreshToken("refresh-secret", env);
  assert.notEqual(encrypted.refresh_token_ciphertext, "refresh-secret");
  assert.equal(decryptGoogleRefreshToken(encrypted as never, env), "refresh-secret");
  assert.throws(() => decryptGoogleRefreshToken({ ...encrypted, refresh_token_tag: Buffer.alloc(16).toString("base64") } as never, env));
});

test("BA-ADS-202 creates an offline read-only PKCE authorization request", () => {
  const request = createGoogleOAuthRequest(env);
  const url = new URL(request.url);
  assert.equal(url.origin, "https://accounts.google.com");
  assert.equal(url.searchParams.get("scope"), GOOGLE_ADSENSE_SCOPE);
  assert.equal(url.searchParams.get("access_type"), "offline");
  assert.equal(url.searchParams.get("code_challenge_method"), "S256");
  assert.equal(url.searchParams.get("state"), request.state);
  assert.equal(validOAuthState(request.state, request.state), true);
  assert.equal(validOAuthState(request.state, `${request.state}x`), false);
});

test("BA-ADS-202 routes are owner-only and never expose token values", () => {
  const paths = ["connect", "callback", "status", "disconnect"];
  const sources = paths.map((name) => readFileSync(`src/app/api/admin/revenue/google/${name}/route.ts`, "utf8"));
  for (const source of sources) assert.match(source, /requireGoogleOAuthOwner/);
  assert.match(sources[0], /GOOGLE_OAUTH_STATE_COOKIE/);
  assert.match(sources[1], /validOAuthState/);
  assert.match(sources[1], /exchangeGoogleAuthorizationCode/);
  assert.doesNotMatch(sources[2], /refresh_token_ciphertext|refresh_token_tag|refreshToken/);
  assert.match(sources[3], /headers\.get\("origin"\) !== request\.nextUrl\.origin/);
  const owner = readFileSync("src/app/api/admin/revenue/google/owner.ts", "utf8");
  assert.match(owner, /profile\?\.role !== "admin"/);
});

test("BA-ADS-202 migration keeps reusable Google connections owner scoped", () => {
  const migration = readFileSync("supabase/migrations/20260801000200_add_google_oauth_connections.sql", "utf8");
  assert.match(migration, /enable row level security/);
  assert.match(migration, /auth\.uid\(\) = owner_id/g);
  assert.match(migration, /role = 'admin'/g);
  for (const provider of ["adsense", "analytics", "search_console", "drive", "calendar", "gmail"]) assert.match(migration, new RegExp(`'${provider}'`));
});
