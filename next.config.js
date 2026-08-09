const isDevelopment = process.env.NODE_ENV === "development";

// Next's statically generated App Router pages emit inline bootstrap scripts,
// and React components use inline style attributes for calculated UI values.
// Those two framework behaviors require unsafe-inline until the application can
// move fully to nonce-bearing dynamic responses. unsafe-eval is development-only.
const contentSecurityPolicy = [
  "default-src 'self'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  "object-src 'none'",
  `script-src 'self' 'unsafe-inline'${isDevelopment ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data:",
  "connect-src 'self' https://*.supabase.co wss://*.supabase.co",
  "media-src 'self' blob: https:",
  "worker-src 'self' blob:",
  "frame-src 'none'",
  "manifest-src 'self'",
  "upgrade-insecure-requests",
].join("; ");

const productionSecurityHeaders = [
  { key: "Content-Security-Policy", value: contentSecurityPolicy },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), payment=(), usb=()",
  },
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
];

/** @type {import('next').NextConfig} */
const nextConfig = {
  poweredByHeader: false,
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: productionSecurityHeaders,
      },
    ];
  },
  async redirects() {
    return [
      {
        source: "/privacy.html",
        destination: "https://www.seangworld.com/privacy",
        permanent: true,
      },
      {
        source: "/privacy.php",
        destination: "https://www.seangworld.com/privacy",
        permanent: true,
      },
      {
        source: "/about.php",
        destination: "https://www.seangworld.com/about",
        permanent: true,
      },
      {
        source: "/dashboard/admin/health",
        destination: "/dashboard/admin/platform-health",
        permanent: true,
      },
      {
        source: "/dashboard/admin/prompts",
        destination: "/dashboard/admin/prompt-library",
        permanent: true,
      },
    ];
  },
  outputFileTracingIncludes: {
    "/api/admin/migration-sql-explorer": ["./supabase/migrations/*.sql"],
    "/api/admin/migration-status": ["./supabase/migrations/*.sql"],
  },
};

module.exports = nextConfig;
