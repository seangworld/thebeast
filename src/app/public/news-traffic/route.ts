import { unstable_cache } from "next/cache";
import { NextResponse } from "next/server";
import { loadPublicNewsTraffic } from "@/lib/server/publicNewsTraffic";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export async function GET() {
  // A new period must await its own report instead of serving an expired report
  // while revalidating it. The server clock is the only source of cache keys.
  const period = Math.floor(Date.now() / 300_000);
  const data = await unstable_cache(() => loadPublicNewsTraffic(), ["public-news-traffic-v3", String(period)], { revalidate: 300 })();
  return NextResponse.json(data, { headers: { "Cache-Control": "no-store", "X-Robots-Tag": "noindex, nofollow" } });
}
