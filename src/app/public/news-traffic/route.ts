import { unstable_cache } from "next/cache";
import { NextResponse } from "next/server";
import { loadPublicNewsTraffic } from "@/lib/server/publicNewsTraffic";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
const readTraffic = unstable_cache(() => loadPublicNewsTraffic(), ["public-news-traffic-v2"], { revalidate: 300 });

export async function GET() {
  const data = await readTraffic();
  return NextResponse.json(data, { headers: { "Cache-Control": "public, s-maxage=60, max-age=0", "X-Robots-Tag": "noindex, nofollow" } });
}
