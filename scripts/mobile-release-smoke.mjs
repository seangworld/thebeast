const baseUrl = (process.env.MOBILE_SMOKE_BASE_URL || process.argv[2] || "").replace(/\/$/, "");

const routes = [
  "/dashboard",
  "/dashboard/today",
  "/dashboard/notifications",
  "/dashboard/calendar",
  "/dashboard/search",
  "/dashboard/uploads",
  "/dashboard/goals",
  "/dashboard/money",
  "/dashboard/education",
  "/dashboard/health",
  "/dashboard/home",
];

if (!baseUrl) {
  console.error("Set MOBILE_SMOKE_BASE_URL or pass a base URL.");
  process.exit(1);
}

const failures = [];

for (const route of routes) {
  const startedAt = Date.now();
  const response = await fetch(`${baseUrl}${route}`, { redirect: "manual" });
  const elapsedMs = Date.now() - startedAt;

  if (response.status >= 400) {
    failures.push(`${route} returned ${response.status}`);
  }

  console.log(`${route} ${response.status} ${elapsedMs}ms`);
}

if (failures.length > 0) {
  console.error(`Mobile release smoke failed: ${failures.join("; ")}`);
  process.exit(1);
}

console.log("Mobile release smoke passed.");
