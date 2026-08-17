import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  getBeastAuthOrigin,
  isGoogleSignInEnabled,
  validateBeastPassword,
} from "../src/lib/auth/experience";

test("AUTH-UX keeps localhost Preview and Production callback origins environment-safe", () => {
  assert.equal(
    getBeastAuthOrigin("http://localhost:3000", undefined),
    "http://localhost:3000"
  );
  assert.equal(
    getBeastAuthOrigin("https://preview.thebeast.seangworld.com", ""),
    "https://preview.thebeast.seangworld.com"
  );
  assert.equal(
    getBeastAuthOrigin(
      "https://thebeast-random.vercel.app",
      "https://thebeast.seangworld.com"
    ),
    "https://thebeast.seangworld.com"
  );
});

test("AUTH-UX exposes Google only through an explicit verified-provider flag", () => {
  assert.equal(isGoogleSignInEnabled(undefined), false);
  assert.equal(isGoogleSignInEnabled("false"), false);
  assert.equal(isGoogleSignInEnabled("TRUE"), true);
});

test("AUTH-UX public header supports signed-out and signed-in member controls", () => {
  const home = readFileSync("src/app/HomeRedirect.tsx", "utf8");

  assert.match(home, /aria-label="Member authentication"/);
  assert.match(home, />\s*Sign Up\s*</);
  assert.match(home, />\s*Log In\s*</);
  assert.match(home, />\s*Account\s*</);
  assert.match(home, /Log Out/);
  assert.match(home, /getUser\(\)/);
  assert.match(home, /onAuthStateChange/);
  assert.match(home, /auth\.signOut\(\)/);
  assert.doesNotMatch(home, /router\.replace\("\/login"\)/);
});

test("AUTH-UX public authentication surface is accessible and password-manager compatible", () => {
  const home = readFileSync("src/app/HomeRedirect.tsx", "utf8");

  assert.match(home, /<dialog/);
  assert.match(home, /showModal\(\)/);
  assert.match(home, /onCancel/);
  assert.match(home, /aria-labelledby="member-auth-title"/);
  assert.match(home, /aria-describedby="member-auth-description"/);
  assert.match(home, /autoComplete="email"/);
  assert.match(home, /"new-password"/);
  assert.match(home, /"current-password"/);
  assert.match(home, /role="alert"/);
  assert.match(home, /disabled=\{submitting\}/);
});

test("AUTH-UX supports credential signup login magic links recovery and guarded social auth", () => {
  const home = readFileSync("src/app/HomeRedirect.tsx", "utf8");
  const login = readFileSync("src/app/login/page.tsx", "utf8");

  for (const source of [home, login]) {
    assert.match(source, /auth\.signUp\(/);
    assert.match(source, /auth\.signInWithPassword\(/);
    assert.match(source, /auth\.signInWithOtp\(/);
    assert.match(source, /buildAuthCallbackUrl/);
    assert.match(source, /NEXT_PUBLIC_BEAST_GOOGLE_AUTH_ENABLED/);
    assert.match(source, /signInWithOAuth/);
    assert.match(source, /provider: "google"/);
  }

  assert.match(home, /buildForgotPasswordPath/);
  assert.match(home, /shouldCreateUser: intent === "create-account"/);
  assert.match(login, /shouldCreateUser: intent === "create-account"/);
});

test("AUTH-UX credential signup enforces the hosted Beast password contract", () => {
  assert.equal(validateBeastPassword("short1").valid, false);
  assert.equal(validateBeastPassword("onlyletterslong").valid, false);
  assert.equal(validateBeastPassword("123456789012").valid, false);
  assert.equal(validateBeastPassword("valid-password-123").valid, true);
});

test("AUTH-UX keeps dedicated auth routes as fallback surfaces", () => {
  const home = readFileSync("src/app/HomeRedirect.tsx", "utf8");
  const login = readFileSync("src/app/login/page.tsx", "utf8");
  const recovery = readFileSync("src/app/forgot-password/page.tsx", "utf8");

  assert.match(home, /Open full-screen authentication/);
  assert.match(home, /\/login\?intent=create-account/);
  assert.match(login, /searchParams\.get\("intent"\)/);
  assert.match(recovery, /ForgotPasswordForm/);
});
