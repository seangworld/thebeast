import { NextResponse } from "next/server";
import { youtubeAuthorization, YOUTUBE_COOKIE_PATH } from "@/lib/server/directYouTube";
import { youtubeJson, youtubeOwner } from "../owner";
export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export async function POST(request: Request) {
  if (request.headers.get("origin") !== "https://thebeast.seangworld.com") return youtubeJson({ error: "Open YouTube setup on the live Beast site." }, 403);
  const owner = await youtubeOwner();
  if (!owner) return youtubeJson({ error: "Owner access required." }, 403);
  try {
    const authorization = youtubeAuthorization(owner.user.id, process.env);
    const response = NextResponse.json({ authorizationUrl: authorization.url });
    const options = { httpOnly: true, secure: true, sameSite: "lax" as const, path: YOUTUBE_COOKIE_PATH, maxAge: 600 };
    response.headers.set("Cache-Control", "private, no-store");
    response.cookies.set("beast_youtube_state", authorization.state, options);
    response.cookies.set("beast_youtube_verifier", authorization.verifier, options);
    return response;
  } catch { return youtubeJson({ error: "Google YouTube credentials must be configured first." }, 503); }
}
