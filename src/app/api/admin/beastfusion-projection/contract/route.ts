import { NextResponse } from "next/server";
import { buildBeastFusionProjectionTargetContract } from "@/lib/beastFusionProjectionContract";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const headers = { "cache-control": "private, no-cache, no-store, must-revalidate" };

export async function GET() {
  return NextResponse.json(buildBeastFusionProjectionTargetContract(), { headers });
}
