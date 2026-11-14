import { NextResponse } from "next/server";
import { beastGuideRuntimeEnvironment } from "@/lib/beastguide/runtime";
import { getRuntime } from "@/vendor/beastguide/server/identity/runtime.js";
import { createNativeAuthHandler } from "@/vendor/beastguide/api/native-auth.js";
import { createNativeIdentityHandler } from "@/vendor/beastguide/api/native-identity.js";
import nativeCatalog from "@/vendor/beastguide/api/native-catalog.js";
type Service = "auth" | "identity" | "catalog";
function environment(): NodeJS.ProcessEnv {
 return { ...process.env, ...beastGuideRuntimeEnvironment(process.env),
  BEAST_NATIVE_API_ENABLED: process.env.BEAST_NATIVE_API_ENABLED,
  BEAST_UNIVERSAL_AUTH_ENABLED: process.env.BEAST_UNIVERSAL_AUTH_ENABLED,
  BEAST_IDENTITY_URL: process.env.BEAST_IDENTITY_URL,
  BEAST_CANONICAL_AUTH_SERVICE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
  BEAST_CANONICAL_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  BEAST_AUTH_RATE_SECRET: process.env.BEAST_AUTH_RATE_SECRET,
  BEAST_AUTH_ORIGIN: process.env.BEAST_AUTH_EMAIL_ORIGIN || "https://thebeast.seangworld.com",
  BEAST_PUBLIC_REGISTRATION_ENABLED: process.env.BEAST_PUBLIC_REGISTRATION_ENABLED || process.env.NEXT_PUBLIC_BEAST_PUBLIC_REGISTRATION_ENABLED,
  BEAST_AUTH_CAPTCHA_REQUIRED: process.env.BEAST_AUTH_CAPTCHA_REQUIRED,
 };
}
export async function handleNativeBeastGuide(request: Request, service: Service): Promise<NextResponse> {
 const env = environment();
 const headers = Object.fromEntries(request.headers.entries());
 const length = Number(request.headers.get("content-length") || 0);
 const limit = service === "auth" ? 8192 : 65536;
 if (length > limit) return NextResponse.json({ error: "BODY_TOO_LARGE" }, { status: 413 });
 const body = request.method === "GET" || request.method === "OPTIONS" ? undefined : await request.text();
 if (body !== undefined && Buffer.byteLength(body) > limit) return NextResponse.json({ error: "BODY_TOO_LARGE" }, { status: 413 });
 const req = { method: request.method, headers, query: Object.fromEntries(new URL(request.url).searchParams.entries()), body };
 let statusCode = 200, responseBody = "";
 const responseHeaders = new Headers();
 const res = { get statusCode() { return statusCode; }, set statusCode(value: number) { statusCode = value; }, setHeader(name: string, value: string) { responseHeaders.set(name, value); }, end(value?: string) { responseBody = value || ""; } };
 if (service === "auth") await createNativeAuthHandler({ env })(req, res);
 else if (service === "identity") await createNativeIdentityHandler({ env, runtime: () => getRuntime(beastGuideRuntimeEnvironment(process.env)) })(req, res);
 else await nativeCatalog(req, res);
 return new NextResponse(statusCode === 204 || statusCode === 304 ? null : responseBody, { status: statusCode, headers: responseHeaders });
}