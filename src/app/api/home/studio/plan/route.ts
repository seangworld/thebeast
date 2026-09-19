import { NextResponse } from "next/server";
import { createOpenAIRequestHeaders } from "@/lib/digitalStaffRuntime/provider";
import { acquireDigitalStaffRequestLease } from "@/lib/digitalStaffRuntime/requestBudget";
import {
  homeStudioPlanSchema,
  normalizeHomeStudioInput,
  normalizeHomeStudioPlan,
} from "@/lib/homeStudio";
import { requireMemberModuleEntitlement } from "@/lib/memberAgeServer";
import { createRouteClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const maxDuration = 90;

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

  const lease = acquireDigitalStaffRequestLease(user.id, "beasthome.home-studio-plan");
  if (!lease.ok) {
    return reply(
      { error: lease.reason === "concurrent_request" ? "A Home Studio plan is already being prepared." : "Home Studio has reached its short-term request limit. Try again shortly." },
      429,
      { "Retry-After": String(lease.retryAfterSeconds) },
    );
  }

  try {
    const input = normalizeHomeStudioInput(await request.json().catch(() => null));
    if (!input) return reply({ error: "Add one valid room photo, room name, room type, and preferred style." }, 400);
    if (!process.env.OPENAI_API_KEY) return reply({ error: "Home Studio planning is not configured in this environment." }, 503);

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 75_000);
    let providerResponse: Response;
    try {
      providerResponse = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: createOpenAIRequestHeaders(crypto.randomUUID()),
        signal: controller.signal,
        body: JSON.stringify({
          model: process.env.OPENAI_HOME_STUDIO_MODEL || process.env.OPENAI_LEARNING_MODEL || "gpt-4.1-mini",
          store: false,
          temperature: 0.2,
          response_format: {
            type: "json_schema",
            json_schema: { name: "beast_home_studio_plan", strict: true, schema: homeStudioPlanSchema },
          },
          messages: [{
            role: "user",
            content: [
              {
                type: "text",
                text: [
                  "Create a practical interior styling and space-planning concept for the supplied room photo and member constraints.",
                  "Preserve the room architecture, windows, doors, ceiling, camera viewpoint, and requested must-keep items. Do not claim measurements or structural facts that are not visible or supplied.",
                  "Separate visible observations from assumptions. Never recommend removing walls, altering electrical/plumbing, blocking exits, defeating safety devices, or performing structural work without a qualified local professional.",
                  "Create a realistic palette, layout steps, design moves, and a prioritized generic shopping list. Do not invent live prices, availability, brands, affiliate relationships, or exact fit. targetPrice must be a clearly labeled planning range or 'Measure and price locally'.",
                  "The conceptPrompt will be used to edit the supplied photo. It must request a photorealistic redesign that preserves geometry and must-keep items, avoids people and text, and follows the member's budget and style.",
                  JSON.stringify({
                    roomName: input.roomName,
                    roomType: input.roomType,
                    dimensions: input.dimensions || "Not supplied",
                    style: input.style,
                    colors: input.colors || "No fixed palette supplied",
                    budget: input.budget || "Not supplied",
                    mustKeep: input.mustKeep || "None identified",
                    needs: input.needs || "General improvement",
                    windowsDoorsAndOpenings: input.openings || "Not supplied",
                    notes: input.notes || "None",
                  }),
                ].join("\n\n"),
              },
              { type: "image_url", image_url: { url: input.image, detail: "high" } },
            ],
          }],
        }),
      });
    } finally {
      clearTimeout(timeout);
    }

    if (!providerResponse.ok) {
      return reply({ error: providerResponse.status === 429 ? "Home Studio's design provider is busy or out of available credit." : "The room plan could not be prepared right now." }, providerResponse.status === 429 ? 429 : 502);
    }
    const payload = await providerResponse.json() as { choices?: Array<{ message?: { content?: string } }> };
    let candidate: unknown;
    try {
      candidate = JSON.parse(payload.choices?.[0]?.message?.content || "{}");
    } catch {
      return reply({ error: "The design provider returned an unreadable plan. Nothing was saved." }, 502);
    }
    const plan = normalizeHomeStudioPlan(candidate);
    if (!plan) return reply({ error: "The design provider returned an incomplete plan. Nothing was saved." }, 502);
    return reply({ plan, notice: "Review measurements, fit, safety, prices, and product availability before acting. The source photo and plan are not saved by this workspace." });
  } catch (error) {
    const timedOut = error instanceof Error && error.name === "AbortError";
    return reply({ error: timedOut ? "Home Studio planning timed out. Nothing was saved; try again." : "The room plan could not be prepared. Nothing was saved." }, timedOut ? 504 : 500);
  } finally {
    lease.release();
  }
}
