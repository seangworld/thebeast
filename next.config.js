/** @type {import('next').NextConfig} */
const nextConfig = {
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
    ];
  },
  experimental: {
    outputFileTracingIncludes: {
      "/api/admin/migration-sql-explorer": [
        "./supabase/migrations/*.sql",
      ],
      "/api/admin/migration-status": ["./supabase/migrations/*.sql"],
    },
  },
}

module.exports = nextConfig
