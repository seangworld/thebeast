import { NextResponse } from "next/server";
import { createRouteClient } from "@/lib/supabase/server";
import { createOpenAIRequestHeaders } from "@/lib/digitalStaffRuntime/provider";

export const dynamic = "force-dynamic";
const headers = { "Cache-Control": "private, no-store, max-age=0", Pragma: "no-cache" };

export async function POST(request: Request) {
  const supabase = createRouteClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Authentication required." }, { status: 401, headers });

  const body = await request.json().catch(() => null) as { image?: string; room?: string } | null;
  const image = body?.image ?? "";
  if (!/^data:image\/(?:jpeg|png|webp);base64,/.test(image) || image.length > 7_000_000) {
    return NextResponse.json({ error: "Use one private JPG, PNG, or WebP image up to 5 MB." }, { status: 400, headers });
  }
  if (!process.env.OPENAI_API_KEY) return NextResponse.json({ error: "Photo detection is not configured." }, { status: 503, headers });

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: createOpenAIRequestHeaders(crypto.randomUUID()),
    body: JSON.stringify({
      model: process.env.OPENAI_LEARNING_MODEL || "gpt-4.1-mini",
      temperature: 0.1,
      response_format: { type: "json_object" },
      messages: [{ role: "user", content: [
        { type: "text", text: `Identify ordinary personal possessions visibly present in this ${String(body?.room || "room").slice(0, 80)} photo. Return JSON only as {"items":[{"name":"...","quantity":1,"details":"brief visible identifying detail or null"}]}. Do not infer ownership, value, serial numbers, hidden items, people, documents, addresses, or sensitive information. Omit uncertain objects. Maximum 25 items.` },
        { type: "image_url", image_url: { url: image, detail: "high" } },
      ] }],
    }),
  });
  if (!response.ok) return NextResponse.json({ error: "Photo detection is temporarily unavailable." }, { status: 502, headers });
  const payload = await response.json() as { choices?: Array<{ message?: { content?: string } }> };
  const parsed = JSON.parse(payload.choices?.[0]?.message?.content || "{}") as { items?: Array<Record<string, unknown>> };
  const items = (parsed.items ?? []).slice(0, 25).flatMap((item) => {
    const name = typeof item.name === "string" ? item.name.trim().slice(0, 120) : "";
    if (!name) return [];
    return [{ name, quantity: Math.max(1, Math.min(9999, Number(item.quantity) || 1)), details: typeof item.details === "string" ? item.details.trim().slice(0, 500) : "" }];
  });
  return NextResponse.json({ items, notice: "AI suggestions are unconfirmed. Review every item before saving." }, { headers });
}
