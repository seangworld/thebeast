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
      {
        source: "/dashboard/operations/atlas",
        headers: [{ key: "Permissions-Policy", value: "camera=(), microphone=(self), geolocation=(), payment=(), usb=()" }],
      },
    ];
  },
  async redirects() {
    return [
      // Temporary redirects preserve bookmarks and allow revert-based rollback.
      { source: "/dashboard/admin/marketing/video-growth", destination: "/dashboard/operations/marketing/video-growth", permanent: false },
      { source: "/dashboard/admin/marketing/advertising", destination: "/dashboard/operations/marketing/advertising", permanent: false },
      { source: "/dashboard/admin/marketing/publishing", destination: "/dashboard/operations/publishing", permanent: false },
      { source: "/dashboard/admin/intelligence/hunter", destination: "/dashboard/operations/opportunities", permanent: false },
      { source: "/dashboard/admin/marketing/analytics", destination: "/dashboard/operations/marketing/analytics", permanent: false },
      { source: "/dashboard/admin/change-the-world", destination: "/dashboard/operations/change-the-world", permanent: false },
      { source: "/dashboard/admin/marketing/social", destination: "/dashboard/operations/marketing/social", permanent: false },
      { source: "/dashboard/admin/marketing/email", destination: "/dashboard/operations/marketing/email", permanent: false },
      { source: "/dashboard/admin/intelligence", destination: "/dashboard/operations/analytics", permanent: false },
      { source: "/dashboard/admin/marketing", destination: "/dashboard/operations/marketing", permanent: false },
      { source: "/dashboard/admin/company", destination: "/dashboard/operations/company", permanent: false },
      { source: "/dashboard/admin/empire", destination: "/dashboard/operations/finances", permanent: false },
      { source: "/dashboard/admin/news", destination: "/dashboard/operations/news", permanent: false },
      { source: "/dashboard/admin/ads", destination: "/dashboard/operations/revenue", permanent: false },
      { source: "/dashboard/admin/fusion", destination: "/dashboard/operations/fusion", permanent: false },

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
    "/api/admin/beast-marketing/publishing/package": ["./node_modules/@fontsource/source-serif-4/files/source-serif-4-latin-*.woff"],
    "/api/admin/production/code-audit": [
      "./node_modules/@fontsource/source-serif-4/files/source-serif-4-latin-400-normal.woff",
      "./node_modules/@fontsource/source-serif-4/files/source-serif-4-latin-400-italic.woff",
      "./node_modules/@fontsource/source-serif-4/files/source-serif-4-latin-700-normal.woff",
    ],
  },
};

module.exports = nextConfig;
