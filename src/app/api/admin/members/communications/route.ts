import { createHash, createHmac, randomUUID, timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { createTransport } from "nodemailer";
import { createAsyncRouteClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { normalizeBeastAdminMemberDirectory } from "@/lib/beastAdminMemberTimeline";
import { smtpOptions } from "@/lib/auth/accountMail/delivery";
import {
  deliverMemberMessages, memberIdPattern, MEMBER_MAIL_ADDRESS, MEMBER_MAIL_LIMIT,
  resolveSetupRecipients, type MemberMailOutcome,
} from "@/lib/beastAdminMemberCommunications";

export const runtime = "nodejs";
export const maxDuration = 120;

const reply = (body: unknown, status = 200) =>
  NextResponse.json(body, { status, headers: { "Cache-Control": "private, no-store" } });

export async function POST(request: Request) {
  if (request.headers.get("origin") !== new URL(request.url).origin) {
    return reply({ error: "Request origin rejected." }, 403);
  }
  try {
    const client = await createAsyncRouteClient();
    const { data: { user }, error: authError } = await client.auth.getUser();
    if (authError || !user) return reply({ error: "Authentication required." }, 401);
    const [role, session] = await Promise.all([
      client.from("profiles").select("role").eq("id", user.id).maybeSingle(),
      client.rpc("is_current_beast_session_allowed"),
    ]);
    if (role.error || session.error || role.data?.role !== "admin" || session.data !== true) {
      return reply({ error: "BeastAdmin owner access required." }, 403);
    }

    const raw = await request.text();
    if (raw.length > 12000) return reply({ error: "Draft is too large." }, 413);
    const input = JSON.parse(raw);
    if (input?.category !== "account_setup") {
      return reply({ error: "Marketing delivery is unavailable without verified consent and suppression records." }, 422);
    }
    const { ids, subject, body, action } = input;
    if (
      !Array.isArray(ids) || ids.length < 1 || ids.length > MEMBER_MAIL_LIMIT ||
      ids.some((id) => typeof id !== "string" || !memberIdPattern.test(id)) ||
      typeof subject !== "string" || !subject.trim() || subject.length > 160 || /[\x00-\x1f\x7f]/.test(subject) ||
      typeof body !== "string" || !body.trim() || body.length > 4000 ||
      (action !== "preview" && action !== "send")
    ) return reply({ error: "Provide a valid subject, message and up to five selected members." }, 400);

    const directory = await client.rpc("get_beast_admin_member_directory");
    const directoryHasCanonicalUsernames = Array.isArray(directory.data) &&
      directory.data.every((member) => member && Object.hasOwn(member, "username"));
    const members = directoryHasCanonicalUsernames ? normalizeBeastAdminMemberDirectory(directory.data) : null;
    if (directory.error || !members) return reply({ error: "Recipient eligibility could not be verified." }, 503);
    const recipients = resolveSetupRecipients(members, Array.from(new Set<string>(ids)));
    if (!recipients.length) return reply({ error: "No eligible verified members need username setup." }, 422);

    const key = process.env.BEAST_AUTH_RATE_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!key || key.length < 32) return reply({ error: "Preview authorization is unavailable." }, 503);
    const payload = JSON.stringify({ category: "account_setup", recipients, subject, body });
    const signature = (id: string, expires: number) => createHmac("sha256", key)
      .update(JSON.stringify(["member-mail", user.id, id, expires, payload])).digest("hex");
    const previewMode = process.env.VERCEL_ENV !== "production";
    if (action === "preview") {
      const id = randomUUID();
      const expires = Date.now() + 10 * 60 * 1000;
      return reply({ recipients, from: MEMBER_MAIL_ADDRESS, replyTo: MEMBER_MAIL_ADDRESS,
        id, expires, signature: signature(id, expires), previewMode });
    }
    if (
      input.confirmed !== true || input.transactionalOnly !== true || typeof input.id !== "string" || !memberIdPattern.test(input.id) ||
      !Number.isSafeInteger(input.expires) || input.expires <= Date.now() ||
      typeof input.signature !== "string" || !/^[a-f0-9]{64}$/.test(input.signature) ||
      !timingSafeEqual(Buffer.from(input.signature), Buffer.from(signature(input.id, input.expires)))
    ) return reply({ error: "Preview the current recipients and message again before confirming." }, 409);

    if (previewMode) return reply({ simulated: true, count: recipients.length });
    if (
      process.env.BEAST_ADMIN_MEMBER_EMAIL_ENABLED !== "true" ||
      process.env.NEXT_PUBLIC_SUPABASE_URL !== "https://grpyzwvgqiwtxadfdtni.supabase.co"
    ) return reply({ error: "Member communications delivery is disabled." }, 503);

    const admin = createAdminClient();
    if (!admin) return reply({ error: "Campaign audit is unavailable." }, 503);
    const transport = createTransport(smtpOptions({ ...process.env, BEAST_SMTP_FROM: MEMBER_MAIL_ADDRESS }));
    const reserved = await admin.rpc("reserve_beast_admin_member_email_campaign", {
      p_id: input.id, p_actor: user.id, p_fingerprint: createHash("sha256").update(payload).digest("hex"),
      p_subject: subject, p_recipients: recipients,
    });
    if (reserved.error) return reply({ error: "Campaign audit is unavailable." }, 503);
    if (reserved.data !== true) return reply({ error: "Campaign already reserved or the send limit was reached." }, 409);

    const results = await deliverMemberMessages(recipients, subject, body, async (message): Promise<MemberMailOutcome> => {
      try {
        const result = await transport.sendMail(message);
        return result.accepted.length === 1 && result.rejected.length === 0 ? "accepted" : "rejected";
      } catch (error) {
        const code = (error as { responseCode?: number }).responseCode;
        return typeof code === "number" && code >= 400 && code < 600 ? "rejected" : "uncertain";
      }
    }, async (outcomes) => {
      const recorded = await admin.from("beast_admin_member_email_campaigns")
        .update({ outcomes }).eq("id", input.id).select("id").single();
      if (recorded.error) throw Error("Audit update failed");
    });
    return reply(results);
  } catch {
    return reply({ error: "Request could not be completed. Review the audit before another send." }, 503);
  }
}
