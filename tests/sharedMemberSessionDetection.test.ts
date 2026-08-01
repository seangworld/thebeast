import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  isSharedSessionOriginAllowed,
  sharedSessionCorsHeaders,
  sharedSessionResponse,
  SHARED_SESSION_ALLOWED_ORIGINS,
} from "../src/lib/auth/sharedSession";

test("BO-405 allows only approved SEANGWORLD credentialed origins", () => {
  assert.deepEqual(SHARED_SESSION_ALLOWED_ORIGINS, [
    "https://www.seangworld.com",
    "https://seangworld.com",
  ]);
  assert.equal(
    isSharedSessionOriginAllowed("https://www.seangworld.com"),
    true
  );
  assert.equal(isSharedSessionOriginAllowed("https://seangworld.com"), true);
  assert.equal(
    isSharedSessionOriginAllowed("https://thebeast.seangworld.com"),
    false
  );
  assert.equal(isSharedSessionOriginAllowed("https://attacker.example"), false);
  assert.equal(isSharedSessionOriginAllowed(null), false);

  assert.deepEqual(sharedSessionCorsHeaders("https://www.seangworld.com"), {
    "access-control-allow-origin": "https://www.seangworld.com",
    "access-control-allow-credentials": "true",
    "access-control-allow-methods": "GET, OPTIONS",
    "access-control-allow-headers": "Accept",
    "access-control-max-age": "300",
    vary: "Origin",
  });
});

test("BO-405 response contract contains authentication state only", () => {
  assert.deepEqual(sharedSessionResponse(true), { authenticated: true });
  assert.deepEqual(sharedSessionResponse(false), { authenticated: false });
  assert.deepEqual(Object.keys(sharedSessionResponse(true)), ["authenticated"]);
});

test("BO-405 route validates the live session and fails closed", () => {
  const route = readFileSync("src/app/api/session/status/route.ts", "utf8");
  const middleware = readFileSync("src/middleware.ts", "utf8");

  assert.match(route, /request\.headers\.get\("origin"\)/);
  assert.match(route, /isSharedSessionOriginAllowed/);
  assert.match(route, /createRouteClient/);
  assert.match(route, /supabase\.auth\.getUser\(\)/);
  assert.match(route, /is_current_beast_session_allowed/);
  assert.match(route, /isDisabledBeastUser/);
  assert.match(route, /sharedSessionResponse\(authenticated\)/);
  assert.match(route, /private, no-cache, no-store/);
  assert.match(middleware, /"\/api\/session\/status"/);

  for (const forbidden of [
    "access_token",
    "refresh_token",
    "permissions",
    "profile data",
  ]) {
    assert.doesNotMatch(route, new RegExp(forbidden));
  }
});
