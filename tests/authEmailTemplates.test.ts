import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  BEAST_AUTH_EMAIL_SENDER,
  beastAuthEmailTemplates,
  renderBeastAuthEmailTemplate,
  type BeastAuthEmailKind,
} from "../src/lib/auth/emailTemplates";

const templateFiles: Record<BeastAuthEmailKind, string> = {
  welcome: "supabase/auth/templates/welcome.html",
  magic_link: "supabase/auth/templates/magic-link.html",
  verify_email: "supabase/auth/templates/verify-email.html",
  password_reset: "supabase/auth/templates/password-reset.html",
};

test("SW-AUTH-004 registers required Beast authentication email templates", () => {
  assert.equal(BEAST_AUTH_EMAIL_SENDER, "seang@seangworld.com");
  assert.deepEqual(
    beastAuthEmailTemplates.map((template) => template.kind),
    ["welcome", "magic_link", "verify_email", "password_reset"]
  );

  for (const template of beastAuthEmailTemplates) {
    assert.match(template.subject, /Beast|Open/);
    assert.ok(template.actionLabel.length > 0);
    assert.ok(template.details.length >= 2);
  }
});

test("SW-AUTH-004 renderer produces branded responsive trust-safe email HTML", () => {
  const html = renderBeastAuthEmailTemplate("magic_link", {
    actionUrl: "{{ .ConfirmationURL }}",
    email: "learner@example.com",
    siteUrl: "{{ .SiteURL }}",
  });

  assert.match(html, /SEANGWORLD/);
  assert.match(html, /Beast logo/);
  assert.match(html, /beast-logo-square\.png/);
  assert.match(html, /Open Beast/);
  assert.match(html, /one time/i);
  assert.match(html, /expires soon/i);
  assert.match(html, /Security reminder/i);
  assert.match(html, /Privacy/);
  assert.match(html, /Terms/);
  assert.match(html, /Security/);
  assert.match(html, /Contact/);
  assert.match(html, /prefers-color-scheme/);
  assert.match(html, /max-width: 520px/);
  assert.match(html, /seang@seangworld\.com/);
  assert.doesNotMatch(html, /password, one-time code, or private sign-in link\.<\/p>\s*<p>learner/);
});

test("SW-AUTH-004 Supabase template files keep required placeholders and trust links", () => {
  for (const [kind, filePath] of Object.entries(templateFiles) as [
    BeastAuthEmailKind,
    string
  ][]) {
    const source = readFileSync(filePath, "utf8");

    assert.match(source, /SEANGWORLD/);
    assert.match(source, /Beast logo/);
    assert.match(source, /beast-logo-square\.png/);
    assert.match(source, /seang@seangworld\.com/);
    assert.match(source, /https:\/\/seangworld\.com\/privacy\.html/);
    assert.match(source, /https:\/\/seangworld\.com\/terms\.html/);
    assert.match(source, /https:\/\/seangworld\.com\/security\.html/);
    assert.match(source, /mailto:seang@seangworld\.com/);
    assert.match(source, /prefers-color-scheme/);
    assert.match(source, /max-width: 520px/);

    if (kind === "welcome") {
      assert.match(source, /\{\{ \.SiteURL \}\}/);
    } else {
      assert.match(source, /\{\{ \.ConfirmationURL \}\}/);
      assert.match(source, /one time/i);
      assert.match(source, /expires soon/i);
    }
  }
});
