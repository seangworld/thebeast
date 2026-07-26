import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  BEAST_OS_LANDING_PATH,
  buildAuthCallbackUrl,
  buildAuthLoginPath,
  getAuthErrorMessage,
  getAuthErrorState,
  getSafeAuthDestination,
  isDisabledBeastUser,
  isPasswordSignInEnabled,
  isPublicRegistrationEnabled,
  normalizeAuthViewState,
} from "../src/lib/auth/experience";

test("BA-105 only preserves safe BeastOS destinations through authentication", () => {
  assert.equal(
    getSafeAuthDestination("/dashboard/education?course=1#conversation"),
    "/dashboard/education?course=1#conversation"
  );
  assert.equal(getSafeAuthDestination("/dashboard"), "/dashboard");
  assert.equal(getSafeAuthDestination("/login"), BEAST_OS_LANDING_PATH);
  assert.equal(getSafeAuthDestination("/auth/callback"), BEAST_OS_LANDING_PATH);
  assert.equal(
    getSafeAuthDestination("https://attacker.example/dashboard"),
    BEAST_OS_LANDING_PATH
  );
  assert.equal(
    getSafeAuthDestination("//attacker.example/dashboard"),
    BEAST_OS_LANDING_PATH
  );
  assert.equal(
    getSafeAuthDestination("/dashboard\\@attacker.example"),
    BEAST_OS_LANDING_PATH
  );

  assert.equal(
    buildAuthLoginPath("/dashboard/education?tab=roadmap", "session_expired"),
    "/login?next=%2Fdashboard%2Feducation%3Ftab%3Droadmap&state=session_expired"
  );
  assert.equal(buildAuthLoginPath("/login"), "/login");
  assert.equal(
    buildAuthCallbackUrl(
      "https://beast.example",
      "/dashboard/money/debts#plan"
    ),
    "https://beast.example/auth/callback?flow=auth&next=%2Fdashboard%2Fmoney%2Fdebts%23plan"
  );
});

test("BA-105 translates provider failures into stable human-readable states", () => {
  assert.equal(getAuthErrorState({ code: "otp_expired" }), "invalid_or_expired_link");
  assert.equal(getAuthErrorState({ code: "email_not_confirmed" }), "email_not_verified");
  assert.equal(getAuthErrorState({ code: "user_banned" }), "account_suspended");
  assert.equal(getAuthErrorState({ code: "user_disabled" }), "account_disabled");
  assert.equal(getAuthErrorState({ code: "session_not_found" }), "session_expired");
  assert.equal(getAuthErrorState({ code: "unexpected_failure" }), "authentication_error");
  assert.equal(
    getAuthErrorMessage({ code: "invalid_credentials" }),
    "The email or password you entered is not correct."
  );
  assert.doesNotMatch(
    getAuthErrorMessage({ code: "unexpected_failure", message: "internal stack" }),
    /internal stack/
  );

  assert.equal(normalizeAuthViewState("account_disabled"), "account_disabled");
  assert.equal(
    normalizeAuthViewState("password_reset_success"),
    "password_reset_success"
  );
  assert.equal(normalizeAuthViewState("made_up_state"), "sign_in");
});

test("BA-105 keeps account creation and password sign-in explicitly configurable", () => {
  assert.equal(isPublicRegistrationEnabled(undefined), true);
  assert.equal(isPublicRegistrationEnabled("false"), false);
  assert.equal(isPublicRegistrationEnabled("TRUE"), true);
  assert.equal(isPasswordSignInEnabled(undefined), false);
  assert.equal(isPasswordSignInEnabled("false"), false);
  assert.equal(isPasswordSignInEnabled("TRUE"), true);
});

test("BA-105 recognizes disabled account metadata without inventing profile state", () => {
  assert.equal(isDisabledBeastUser(null), false);
  assert.equal(
    isDisabledBeastUser({ app_metadata: { account_status: "disabled" } }),
    true
  );
  assert.equal(
    isDisabledBeastUser({ app_metadata: { is_disabled: true } }),
    true
  );
  assert.equal(
    isDisabledBeastUser({ app_metadata: { account_status: "active" } }),
    false
  );
});

test("BA-105 provides every unified BeastOS authentication screen and action", () => {
  const login = readFileSync("src/app/login/page.tsx", "utf8");
  const callback = readFileSync("src/app/auth/callback/route.ts", "utf8");
  const middleware = readFileSync("src/middleware.ts", "utf8");
  const logout = readFileSync("src/app/components/LogoutButton.tsx", "utf8");

  assert.match(login, /Sign in to BeastOS/);
  assert.match(login, /Create Account/);
  assert.match(login, /Magic link requested/);
  assert.match(login, /That link no longer works/);
  assert.match(login, /Verify your email/);
  assert.match(login, /Account suspended/);
  assert.match(login, /Account disabled/);
  assert.match(login, /Your session expired/);
  assert.match(login, /We could not sign you in/);
  assert.match(login, /signInWithOtp/);
  assert.match(login, /signInWithPassword/);
  assert.match(login, /NEXT_PUBLIC_BEAST_PUBLIC_REGISTRATION_ENABLED/);
  assert.match(login, /NEXT_PUBLIC_BEAST_PASSWORD_SIGN_IN_ENABLED/);
  assert.match(login, /buildAuthCallbackUrl/);
  assert.doesNotMatch(login, /BeastEducation|BeastMoney|Guidance Counselor|Money Coach/);

  assert.match(callback, /exchangeCodeForSession/);
  assert.match(callback, /getSafeAuthDestination/);
  assert.match(callback, /isDisabledBeastUser/);
  assert.match(callback, /no-cache, no-store/);

  assert.match(
    middleware,
    /matcher: \["\/dashboard\/:path\*", "\/login", "\/api\/:path\*"\]/
  );
  assert.match(middleware, /buildAuthLoginPath\(destination, state\)/);
  assert.match(middleware, /getSafeAuthDestination/);

  assert.match(logout, /Sign out of Beast\?/);
  assert.match(logout, /role="dialog"/);
  assert.match(logout, /Stay signed in/);
  assert.match(logout, /router\.replace\("\/login\?state=signed_out"\)/);
  assert.match(logout, /BeastOS could not sign you out/);
});

test("BA-105 protected client guards preserve the active destination", () => {
  const guardedFiles = [
    "src/app/dashboard/layout.tsx",
    "src/app/dashboard/onboarding/page.tsx",
    "src/app/dashboard/learning/activities/[activityId]/page.tsx",
    "src/app/dashboard/home/BeastHomeShell.tsx",
    "src/app/dashboard/admin/BeastAdminShell.tsx",
    "src/app/dashboard/health/BeastHealthShell.tsx",
    "src/app/dashboard/today/page.tsx",
  ];

  guardedFiles.forEach((file) => {
    const source = readFileSync(file, "utf8");
    assert.doesNotMatch(source, /router\.(?:replace|push)\("\/login"\)/, file);
    assert.match(source, /build(?:Current)?AuthLoginPath/, file);
  });
});
