/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    outputFileTracingIncludes: {
      "/api/admin/migration-sql-explorer": [
        "./supabase/migrations/*.sql",
      ],
    },
  },
}

module.exports = nextConfig
