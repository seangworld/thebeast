/** @type {import('next').NextConfig} */
const nextConfig = {
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
