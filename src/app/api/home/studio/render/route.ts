import { NextResponse } from "next/server";
import { createOpenAIRequestHeaders } from "@/lib/digitalStaffRuntime/provider";
import { acquireDigitalStaffRequestLease } from "@/lib/digitalStaffRuntime/requestBudget";
import { requireMemberModuleEntitlement } from "@/lib/memberAgeServer";
import { decodeHomeStudioImage } from "@/lib/server/homeStudioImage";
import { createRouteClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

const responseHeaders = {
  "Cache-Control": "private, no-store, max-age=0",
  Pragma: "no-cache",
};

function reply(body: unknown, status = 200, extraHeaders: Record<string, string> = {}) {
  return NextResponse.json(body, { status, headers: { ...responseHeaders, ...extraHeaders } });
}

export async function POST(request: Request) {
  const supabase = createRouteClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return reply({ error: "Authentication required." }, 401);
  const entitlement = await requireMemberModuleEntitlement("home", { supabase, user });
  if (!entitlement.ok) {
    return reply({ error: entitlement.status === 428 ? "Complete your birthday before using BeastHome." : "BeastHome is available to eligible adult members." }, entitlement.status);
  }

  const lease = acquireDigitalStaffRequestLease(user.id, "beasthome.home-studio-render");
  if (!lease.ok) {
    return reply(
      { error: lease.reason === "concurrent_request" ? "A Home Studio concept image is already being generated." : "Home Studio has reached its short-term image limit. Try again shortly." },
      429,
      { "Retry-After": String(lease.retryAfterSeconds) },
    );
  }

  try {
    const body = await request.json().catch(() => null) as { image?: unknown; prompt?: unknown; confirmed?: unknown } | null;
    const decoded = decodeHomeStudioImage(body?.image);
    const prompt = typeof body?.prompt === "string" ? body.prompt.trim().slice(0, 2_400) : "";
    if (!decoded || !prompt || body?.confirmed !== true) {
      return reply({ error: "Review the plan and explicitly confirm image generation first." }, 400);
    }
    if (!process.env.OPENAI_API_KEY) return reply({ error: "Home Studio image generation is not configured in this environment." }, 503);

    const form = new FormData();
    form.append("model", process.env.OPENAI_HOME_STUDIO_IMAGE_MODEL || "gpt-image-1.5");
    form.append("image[]", new Blob([decoded.bytes], { type: decoded.mimeType }), `room.${decoded.mimeType.split("/")[1]}`);
    form.append("prompt", prompt);
    form.append("quality", process.env.OPENAI_HOME_STUDIO_IMAGE_QUALITY || "low");
    form.append("size", "1536x1024");
    form.append("output_format", "jpeg");

    const headers = createOpenAIRequestHeaders(crypto.randomUUID());
    headers.delete("Content-Type");
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 105_000);
    let providerResponse: Response;
    try {
      providerResponse = await fetch("https://api.openai.com/v1/images/edits", {
        method: "POST",
        headers,
        body: form,
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timeout);
    }

    if (!providerResponse.ok) {
      return reply({ error: providerResponse.status === 429 ? "Image generation is busy or the account has no available image credit." : "The concept image could not be generated right now." }, providerResponse.status === 429 ? 429 : 502);
    }
    const payload = await providerResponse.json() as { data?: Array<{ b64_json?: string }> };
    const base64 = payload.data?.[0]?.b64_json || "";
    if (!base64 || !/^[A-Za-z0-9+/]+={0,2}$/.test(base64) || base64.length > 8_000_000) {
      return reply({ error: "The image provider returned an unusable result." }, 502);
    }
    return reply({
      image: `data:image/jpeg;base64,${base64}`,
      notice: "This is an AI concept, not a measured construction drawing or guarantee that pictured products will fit or are available.",
    });
  } catch (error) {
    const timedOut = error instanceof Error && error.name === "AbortError";
    return reply({ error: timedOut ? "Concept generation timed out. Nothing was saved; try again." : "The concept image could not be generated. Nothing was saved." }, timedOut ? 504 : 500);
  } finally {
    lease.release();
  }
}
