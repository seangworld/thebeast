import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  BEAST_PASSWORD_MAX_LENGTH,
  BEAST_PASSWORD_MIN_LENGTH,
  buildForgotPasswordPath,
  buildPasswordRecoveryCallbackUrl,
  buildResetPasswordPath,
  getBeastAuthOrigin,
  validateBeastPassword,
} from "../src/lib/auth/experience";

test("BA-106 enforces the Beast password policy before calling Supabase", () => {
  assert.equal(BEAST_PASSWORD_MIN_LENGTH, 12);
  assert.equal(BEAST_PASSWORD_MAX_LENGTH, 72);
  assert.equal(validateBeastPassword("").valid, false);
  assert.equal(validateBeastPassword("short1").valid, false);
  assert.equal(validateBeastPassword("letterswithoutnumber").valid, false);
  assert.equal(validateBeastPassword("123456789012").valid, false);
  assert.equal(validateBeastPassword("long-password-2026").valid, true);
  assert.equal(validateBeastPassword(`${"a".repeat(72)}1`).valid, false);

  const result = validateBeastPassword("secure-beast-2026");
  assert.deepEqual(
    result.requirements.map(({ id, met }) => ({ id, met })),
    [
      { id: "length", met: true },
      { id: "letter", met: true },
      { id: "number", met: true },
    ]
  );
});

test("BA-106 recovery paths preserve only safe BeastOS destinations", () => {
  assert.equal(
    buildForgotPasswordPath("/dashboard/education?tab=roadmap"),
    "/forgot-password?next=%2Fdashboard%2Feducation%3Ftab%3Droadmap"
  );
  assert.equal(
    buildForgotPasswordPath("https://attacker.example/dashboard"),
    "/forgot-password"
  );
  assert.equal(
    buildResetPasswordPath(
      "/dashboard/money",
      "invalid_or_expired_link"
    ),
    "/reset-password?next=%2Fdashboard%2Fmoney&state=invalid_or_expired_link"
  );
  assert.equal(
    buildPasswordRecoveryCallbackUrl(
      "https://thebeast.seangworld.com",
      "//attacker.example/dashboard"
    ),
    "https://thebeast.seangworld.com/auth/recovery"
  );
  assert.equal(
    getBeastAuthOrigin(
      "https://preview.vercel.app",
      "https://thebeast.seangworld.com/path"
    ),
    "https://thebeast.seangworld.com"
  );
  assert.equal(
    getBeastAuthOrigin("https://preview.vercel.app", "javascript:alert(1)"),
    "https://preview.vercel.app"
  );
});

test("BA-106 exposes forgot password only when password authentication is enabled", () => {
  const login = readFileSync("src/app/login/page.tsx", "utf8");
  const page = readFileSync("src/app/forgot-password/page.tsx", "utf8");
  const form = readFileSync(
    "src/app/forgot-password/ForgotPasswordForm.tsx",
    "utf8"
  );

  assert.match(login, /passwordSignInEnabled && intent === "login"/);
  assert.match(login, /method === "password"/);
  assert.match(login, /Forgot password\?/);
  assert.match(login, /buildForgotPasswordPath\(destination\)/);
  assert.match(page, /isPasswordSignInEnabled/);
  assert.match(page, /redirect\(buildAuthLoginPath\(destination\)\)/);

  assert.match(form, /resetPasswordForEmail/);
  assert.match(form, /buildPasswordRecoveryCallbackUrl/);
  assert.match(form, /REQUEST_COOLDOWN_SECONDS = 60/);
  assert.match(form, /over_email_send_rate_limit/);
  assert.match(
    form,
    /If a Beast account uses that email, reset instructions are on the/
  );
  assert.doesNotMatch(form, /account (?:exists|does not exist|was not found)/i);
});

test("BA-106 recovery callback accepts only a verified PKCE recovery event", () => {
  const callback = readFileSync("src/app/auth/recovery/route.ts", "utf8");

  assert.match(callback, /exchangeCodeForSession\(code\)/);
  assert.match(callback, /redirectType !== "recovery"/);
  assert.match(callback, /signOut\(\{ scope: "local" \}\)/);
  assert.match(callback, /BEAST_PASSWORD_RECOVERY_COOKIE/);
  assert.match(callback, /httpOnly: true/);
  assert.match(callback, /sameSite: "lax"/);
  assert.match(callback, /maxAge: 10 \* 60/);
  assert.match(callback, /getSafeAuthDestination/);
  assert.match(callback, /invalid_or_expired_link/);
  assert.match(callback, /isDisabledBeastUser/);
});

test("BA-106 reset page handles policy, visibility, malformed links, and session revocation", () => {
  const page = readFileSync("src/app/reset-password/page.tsx", "utf8");
  const form = readFileSync(
    "src/app/reset-password/ResetPasswordForm.tsx",
    "utf8"
  );
  const completion = readFileSync(
    "src/app/api/auth/password-recovery/complete/route.ts",
    "utf8"
  );

  assert.match(page, /BEAST_PASSWORD_RECOVERY_COOKIE/);
  assert.match(page, /isPasswordSignInEnabled/);
  assert.match(form, /getUser\(\)/);
  assert.match(form, /validateBeastPassword\(password\)/);
  assert.match(form, /The passwords do not match/);
  assert.match(form, /Show new password/);
  assert.match(form, /Hide new password/);
  assert.match(form, /Show password confirmation/);
  assert.match(form, /updateUser\(\{ password \}\)/);
  assert.match(form, /signOut\(\{ scope: "global" \}\)/);
  assert.match(form, /password_reset_success/);
  assert.match(form, /expired, already used, or malformed/);
  assert.match(form, /Finish Account Security/);

  assert.match(completion, /maxAge: 0/);
  assert.match(completion, /private, no-store/);
});

test("BA-106 local Supabase configuration matches the recovery contract", () => {
  const config = readFileSync("supabase/config.toml", "utf8");
  const template = readFileSync(
    "supabase/auth/templates/password-reset.html",
    "utf8"
  );
  const deployment = readFileSync(
    "docs/BA-106-PASSWORD-RECOVERY-DEPLOYMENT.md",
    "utf8"
  );

  assert.match(config, /site_url = "http:\/\/localhost:3000"/);
  assert.match(config, /http:\/\/localhost:3000\/auth\/callback/);
  assert.match(config, /http:\/\/localhost:3000\/auth\/recovery/);
  assert.match(config, /http:\/\/127\.0\.0\.1:3000\/auth\/callback/);
  assert.match(config, /http:\/\/127\.0\.0\.1:3000\/auth\/recovery/);
  assert.match(config, /minimum_password_length = 12/);
  assert.match(config, /password_requirements = "letters_digits"/);
  assert.match(config, /max_frequency = "60s"/);
  assert.match(config, /\[auth\.email\.template\.recovery\]/);
  assert.match(config, /password-reset\.html/);

  assert.match(template, /\{\{ \.ConfirmationURL \}\}/);
  assert.match(template, /Reset your Beast password/);
  assert.match(template, /one time/i);
  assert.match(template, /expires soon/i);

  assert.match(deployment, /Verified environment inventory/);
  assert.match(deployment, /zvzcojwjgnedrouilovc/);
  assert.match(deployment, /grpyzwvgqiwtxadfdtni/);
  assert.match(deployment, /Confirmed mismatches and release blockers/);
  assert.match(deployment, /No database migration is required/);
});
