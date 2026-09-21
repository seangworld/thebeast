import { createCipheriv, createDecipheriv, randomBytes, createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { createRouteClient } from "@/lib/supabase/server";

export const SOCIAL_ORIGIN = "https://thebeast.seangworld.com";
export const SOCIAL_PATH = "/dashboard/operations/marketing/social";
export const SOCIAL_CALLBACK = `${SOCIAL_ORIGIN}/api/admin/beast-marketing/social/callback`;
export const socialJson = (body: unknown, status = 200) => NextResponse.json(body, { status, headers: { "Cache-Control": "private, no-store" } });
export async function socialOwner(request?: Request) {
  if (request && request.method !== "GET" && request.headers.get("origin") !== SOCIAL_ORIGIN) return null;
  const client = createRouteClient();
  const auth = await client.auth.getUser();
  if (auth.error || !auth.data.user) return null;
  const profile = await client.from("profiles").select("role").eq("id", auth.data.user.id).maybeSingle();
  return !profile.error && profile.data?.role === "admin" ? { client, id: auth.data.user.id } : null;
}
export function secretKey(env: NodeJS.ProcessEnv = process.env) {
  const value = env.SOCIAL_TOKEN_ENCRYPTION_KEY || env.GOOGLE_OAUTH_TOKEN_ENCRYPTION_KEY || "";
  const key = Buffer.from(value, /^[a-f0-9]{64}$/i.test(value) ? "hex" : "base64");
  if (key.length !== 32) throw new Error("Social token encryption is not configured.");
  return key;
}
export function seal(value: unknown, owner: string) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", secretKey(), iv);
  cipher.setAAD(Buffer.from(`beast-social:${owner}`));
  const encrypted = Buffer.concat([cipher.update(JSON.stringify(value), "utf8"), cipher.final()]);
  return { iv: iv.toString("base64"), tag: cipher.getAuthTag().toString("base64"), ciphertext: encrypted.toString("base64") };
}
export function unseal(value: { iv: string; tag: string; ciphertext: string }, owner: string): { access_token: string; refresh_token?: string } {
  const decipher = createDecipheriv("aes-256-gcm", secretKey(), Buffer.from(value.iv, "base64"));
  decipher.setAAD(Buffer.from(`beast-social:${owner}`));
  decipher.setAuthTag(Buffer.from(value.tag, "base64"));
  return JSON.parse(Buffer.concat([decipher.update(Buffer.from(value.ciphertext, "base64")), decipher.final()]).toString("utf8"));
}
export const stateHash = (value: string) => createHash("sha256").update(value).digest("hex");
export function socialConfiguration() {
  let encrypted = false;
  try { secretKey(); encrypted = true; } catch { /* report configuration, never secrets */ }
  return {
    meta: encrypted && !!process.env.META_APP_ID && !!process.env.META_APP_SECRET && /^v\d+\.0$/.test(process.env.META_GRAPH_VERSION || ""),
    x: encrypted && !!process.env.X_CLIENT_ID && !!process.env.X_CLIENT_SECRET,
    scheduler: !!process.env.CRON_SECRET,
    callback: SOCIAL_CALLBACK,
  };
}
