export const BEAST_AUTH_EMAIL_SENDER = "seang@seangworld.com";

export const BEAST_AUTH_EMAIL_LINKS = {
  beastUrl: "https://thebeast.seangworld.com",
  logoUrl: "https://thebeast.seangworld.com/beast-logo-square.png",
  privacyUrl: "https://seangworld.com/privacy.html",
  termsUrl: "https://seangworld.com/terms.html",
  securityUrl: "https://seangworld.com/security.html",
  contactUrl: "mailto:seang@seangworld.com",
};

export type BeastAuthEmailKind =
  | "welcome"
  | "magic_link"
  | "verify_email"
  | "password_reset";

export type BeastAuthEmailTemplate = {
  kind: BeastAuthEmailKind;
  name: string;
  subject: string;
  actionLabel: string;
  preheader: string;
  title: string;
  intro: string;
  details: string[];
};

export type BeastAuthEmailRenderOptions = {
  actionUrl: string;
  email?: string;
  siteUrl?: string;
};

export const beastAuthEmailTemplates: BeastAuthEmailTemplate[] = [
  {
    kind: "welcome",
    name: "Welcome",
    subject: "Welcome to Beast",
    actionLabel: "Open Beast",
    preheader: "Your Beast account is ready.",
    title: "Welcome to Beast",
    intro:
      "Your Beast account is ready. Open BeastOS to continue setting up your private workspace.",
    details: [
      "Beast gives you one private place for your profile, goals, documents, learning, money, and daily work.",
      "If you did not create this account, contact us so we can help secure it.",
    ],
  },
  {
    kind: "magic_link",
    name: "Magic Link",
    subject: "Open Beast",
    actionLabel: "Open Beast",
    preheader: "Use your private one-time link to open Beast.",
    title: "Open Beast",
    intro:
      "Use this private link to open Beast and continue your work. The link is meant only for you.",
    details: [
      "This link can be used one time.",
      "For your security, this link expires soon.",
      "If you did not request this email, you can ignore it. Do not forward this link to anyone.",
    ],
  },
  {
    kind: "verify_email",
    name: "Verify Email",
    subject: "Verify your Beast email",
    actionLabel: "Verify Email",
    preheader: "Confirm your email address for Beast.",
    title: "Verify your email",
    intro:
      "Confirm this email address so Beast can keep your account and recovery path up to date.",
    details: [
      "This verification link can be used one time.",
      "For your security, this link expires soon.",
      "If you did not request this email, you can ignore it.",
    ],
  },
  {
    kind: "password_reset",
    name: "Password Reset",
    subject: "Reset your Beast password",
    actionLabel: "Reset Password",
    preheader: "Use this secure link to reset your Beast password.",
    title: "Reset your password",
    intro:
      "Use this secure link to reset your Beast password and return to your account.",
    details: [
      "This reset link can be used one time.",
      "For your security, this link expires soon.",
      "If you did not request a password reset, you can ignore this email and your password will not change.",
    ],
  },
];

export function getBeastAuthEmailTemplate(kind: BeastAuthEmailKind) {
  const template = beastAuthEmailTemplates.find((item) => item.kind === kind);

  if (!template) {
    throw new Error(`Unknown Beast auth email template: ${kind}`);
  }

  return template;
}

export function renderBeastAuthEmailTemplate(
  kind: BeastAuthEmailKind,
  options: BeastAuthEmailRenderOptions
) {
  const template = getBeastAuthEmailTemplate(kind);
  const actionUrl = options.actionUrl || BEAST_AUTH_EMAIL_LINKS.beastUrl;
  const siteUrl = options.siteUrl || BEAST_AUTH_EMAIL_LINKS.beastUrl;
  const accountLine = options.email
    ? `<p class="muted">Requested for ${escapeHtml(options.email)}.</p>`
    : "";

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="color-scheme" content="light dark">
    <meta name="supported-color-schemes" content="light dark">
    <title>${escapeHtml(template.subject)}</title>
    <style>
      body {
        margin: 0;
        background: #0f172a;
        color: #f8fafc;
        font-family: Arial, Helvetica, sans-serif;
      }
      .preheader {
        display: none;
        max-height: 0;
        overflow: hidden;
        opacity: 0;
      }
      .shell {
        width: 100%;
        background: #0f172a;
        padding: 32px 12px;
      }
      .card {
        width: 100%;
        max-width: 620px;
        margin: 0 auto;
        background: #111827;
        border: 1px solid #263244;
        border-radius: 18px;
        overflow: hidden;
      }
      .header {
        padding: 28px 28px 18px;
        text-align: left;
      }
      .logo {
        display: block;
        width: 64px;
        height: 64px;
        border-radius: 16px;
        margin-bottom: 18px;
      }
      .eyebrow {
        color: #34d399;
        font-size: 12px;
        font-weight: 800;
        letter-spacing: 0.08em;
        margin: 0 0 10px;
        text-transform: uppercase;
      }
      h1 {
        color: #ffffff;
        font-size: 30px;
        line-height: 1.15;
        margin: 0;
      }
      .content {
        padding: 0 28px 28px;
      }
      p, li {
        color: #cbd5e1;
        font-size: 16px;
        line-height: 1.6;
      }
      ul {
        margin: 18px 0 0;
        padding-left: 22px;
      }
      .button {
        display: inline-block;
        margin: 24px 0 18px;
        padding: 14px 20px;
        background: #22c55e;
        border-radius: 12px;
        color: #052e16 !important;
        font-weight: 800;
        text-decoration: none;
      }
      .notice {
        margin: 18px 0 0;
        padding: 14px;
        background: #0b1220;
        border: 1px solid #263244;
        border-radius: 12px;
      }
      .muted {
        color: #94a3b8;
        font-size: 13px;
      }
      .footer {
        border-top: 1px solid #263244;
        padding: 18px 28px 26px;
      }
      .footer a {
        color: #93c5fd;
        font-size: 13px;
        margin-right: 14px;
        text-decoration: underline;
      }
      @media (prefers-color-scheme: light) {
        body, .shell {
          background: #f8fafc;
        }
        .card {
          background: #ffffff;
          border-color: #dbe4ef;
        }
        h1 {
          color: #0f172a;
        }
        p, li {
          color: #334155;
        }
        .notice {
          background: #f8fafc;
          border-color: #dbe4ef;
        }
        .muted {
          color: #64748b;
        }
      }
      @media only screen and (max-width: 520px) {
        .shell {
          padding: 12px;
        }
        .header, .content, .footer {
          padding-left: 18px;
          padding-right: 18px;
        }
        h1 {
          font-size: 26px;
        }
        .button {
          display: block;
          text-align: center;
        }
      }
    </style>
  </head>
  <body>
    <span class="preheader">${escapeHtml(template.preheader)}</span>
    <div class="shell">
      <div class="card">
        <div class="header">
          <img class="logo" src="${escapeHtml(BEAST_AUTH_EMAIL_LINKS.logoUrl)}" alt="Beast logo">
          <p class="eyebrow">SEANGWORLD</p>
          <h1>${escapeHtml(template.title)}</h1>
        </div>
        <div class="content">
          <p>${escapeHtml(template.intro)}</p>
          ${accountLine}
          <a class="button" href="${escapeHtml(actionUrl)}">${escapeHtml(template.actionLabel)}</a>
          <div class="notice">
            <p class="muted">Security reminder: Beast will never ask you to reply with your password, one-time code, or private sign-in link.</p>
          </div>
          <ul>
            ${template.details.map((detail) => `<li>${escapeHtml(detail)}</li>`).join("\n            ")}
          </ul>
          <p class="muted">If the button does not work, copy and paste this link into your browser: ${escapeHtml(actionUrl)}</p>
        </div>
        <div class="footer">
          <p class="muted">SEANGWORLD sends Beast account emails from ${escapeHtml(BEAST_AUTH_EMAIL_SENDER)}.</p>
          <a href="${escapeHtml(BEAST_AUTH_EMAIL_LINKS.privacyUrl)}">Privacy</a>
          <a href="${escapeHtml(BEAST_AUTH_EMAIL_LINKS.termsUrl)}">Terms</a>
          <a href="${escapeHtml(BEAST_AUTH_EMAIL_LINKS.securityUrl)}">Security</a>
          <a href="${escapeHtml(BEAST_AUTH_EMAIL_LINKS.contactUrl)}">Contact</a>
          <p class="muted">Open Beast directly at ${escapeHtml(siteUrl)}.</p>
        </div>
      </div>
    </div>
  </body>
</html>`;
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
