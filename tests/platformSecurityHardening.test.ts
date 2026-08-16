import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const nextConfig = readFileSync("next.config.js", "utf8");
const packageJson = JSON.parse(readFileSync("package.json", "utf8")) as {
  dependencies: Record<string, string>;
  devDependencies: Record<string, string>;
  overrides: Record<string, unknown>;
};

test("SEC-001 defines the required production security headers for every route", () => {
  for (const header of [
    "Content-Security-Policy",
    "X-Content-Type-Options",
    "X-Frame-Options",
    "Referrer-Policy",
    "Permissions-Policy",
    "Strict-Transport-Security",
  ]) {
    assert.match(nextConfig, new RegExp(header));
  }
  assert.match(nextConfig, /source: "\/\(\.\*\)"/);
  assert.match(nextConfig, /nosniff/);
  assert.match(nextConfig, /frame-ancestors 'none'/);
  assert.match(nextConfig, /X-Frame-Options", value: "DENY"/);
  assert.match(nextConfig, /poweredByHeader: false/);
});

test("SEC-001 CSP reflects Beast runtime dependencies without browser-side provider secrets", () => {
  assert.match(nextConfig, /connect-src 'self' https:\/\/\*\.supabase\.co wss:\/\/\*\.supabase\.co/);
  assert.doesNotMatch(nextConfig, /api\.openai\.com|oauth2\.googleapis\.com/);
  assert.match(nextConfig, /frame-src 'none'/);
  assert.doesNotMatch(nextConfig, /default-src 'self' https:|connect-src 'self' https:(?:[";\s])/);
  assert.match(nextConfig, /unsafe-eval[^\n]*development-only|isDevelopment \? " 'unsafe-eval'"/);
});

test("SEC-001 pins patched direct and transitive security dependencies", () => {
  assert.equal(packageJson.dependencies.next, "15.5.21");
  assert.equal(packageJson.devDependencies["eslint-config-next"], "15.5.21");
  assert.equal(packageJson.devDependencies.postcss, "^8.5.23");
  assert.equal(packageJson.overrides.ws, "8.21.0");
  assert.equal(packageJson.overrides.nanoid, "3.3.18");
  assert.equal(packageJson.overrides["js-yaml"], "4.3.1");
});

test("SEC-002 boundaries remain centralized and server-only", () => {
  const provider = readFileSync("src/lib/digitalStaffRuntime/provider.ts", "utf8");
  const security = readFileSync("src/lib/digitalStaffRuntime/security.ts", "utf8");
  const runtimeRoute = readFileSync("src/app/api/digital-staff/runtime/route.ts", "utf8");
  assert.match(provider, /process\.env\.OPENAI_API_KEY/);
  assert.match(provider, /headers\.set\("Authorization"/);
  assert.match(security, /sanitizeSecretText/);
  assert.match(security, /digitalStaffUnavailableMessage/);
  assert.match(runtimeRoute, /safeDigitalStaffFailure/);
  assert.doesNotMatch(nextConfig, /OPENAI_API_KEY/);
});
