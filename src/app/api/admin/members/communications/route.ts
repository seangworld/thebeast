import { createHash, createHmac, randomUUID, timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { createTransport } from "nodemailer";
import { createAsyncRouteClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { mergeBeastAdminMemberEmailStatuses, normalizeBeastAdminMemberDirectory, normalizeBeastAdminMemberEmailStatuses } from "@/lib/beastAdminMemberTimeline";
import { buildEmailVerificationCallbackUrl } from "@/lib/auth/emailWorkflows";
import { smtpOptions } from "@/lib/auth/accountMail/delivery";
import {
  deliverMemberMessages, memberIdPattern, MEMBER_MAIL_ADDRESS, MEMBER_MAIL_LIMIT,
  resolveSetupRecipients, memberMailCategories, type MemberMailCategory, type MemberMailOutcome,
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
    if (!memberMailCategories.includes(input?.category)) {
      return reply({ error: "Marketing delivery is unavailable without verified consent and suppression records." }, 422);
    }
    const { ids, action } = input;
    const category: MemberMailCategory = input.category;
    const officialVerification = category === "verification";
    const subject = officialVerification ? "Official Beast account verification" : input.subject;
    const body = officialVerification
      ? "Supabase Auth sends its existing account verification template with a secure link."
      : input.body;
    if (
      !Array.isArray(ids) || ids.length < 1 || ids.length > MEMBER_MAIL_LIMIT ||
      ids.some((id) => typeof id !== "string" || !memberIdPattern.test(id)) ||
      typeof subject !== "string" || !subject.trim() || subject.length > 160 || /[\x00-\x1f\x7f]/.test(subject) ||
      typeof body !== "string" || !body.trim() || body.length > 4000 ||
      (action !== "preview" && action !== "send")
    ) return reply({ error: "Provide a valid subject, message and up to five selected members." }, 400);

    const [directory, emailStatuses] = await Promise.all([
      client.rpc("get_beast_admin_member_directory"),
      category === "account_setup" ? null : client.rpc("get_beast_admin_member_email_statuses"),
    ]);
    const directoryHasCanonicalUsernames = Array.isArray(directory.data) &&
      directory.data.every((member) => member && Object.hasOwn(member, "username"));
    const members = directoryHasCanonicalUsernames ? normalizeBeastAdminMemberDirectory(directory.data) : null;
    if (directory.error || !members) return reply({ error: "Recipient eligibility could not be verified." }, 503);
    const statuses = emailStatuses ? normalizeBeastAdminMemberEmailStatuses(emailStatuses.data) : null;
    if (emailStatuses && (emailStatuses.error || !statuses)) return reply({ error: "Email status could not be verified." }, 503);
    const eligibleDirectory = statuses
      ? mergeBeastAdminMemberEmailStatuses(members, statuses).filter(member => statuses.some(status => status.id === member.id))
      : members;
    const recipients = resolveSetupRecipients(eligibleDirectory, Array.from(new Set<string>(ids)), category);
    if (!recipients.length) return reply({ error: category === "account_setup"
      ? "No eligible verified members need username setup."
      : "No selected members have an eligible unverified signup email." }, 422);

    const message = category === "onboarding"
      ? body + "\n\nTo verify your existing account, request your official verification link at https://thebeast.seangworld.com/resend-verification. Use the email you originally registered with."
      : body;

    const key = process.env.BEAST_AUTH_RATE_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!key || key.length < 32) return reply({ error: "Preview authorization is unavailable." }, 503);
    const payload = JSON.stringify({ category, ids: Array.from(new Set<string>(ids)).sort(), recipients, subject, body: message });
    const signature = (id: string, expires: number) => createHmac("sha256", key)
      .update(JSON.stringify(["member-mail", user.id, id, expires, payload])).digest("hex");
    const previewMode = process.env.VERCEL_ENV !== "production";
    if (action === "preview") {
      const id = randomUUID();
      const expires = Date.now() + 10 * 60 * 1000;
      return reply({ recipients, from: MEMBER_MAIL_ADDRESS, replyTo: MEMBER_MAIL_ADDRESS,
        id, expires, signature: signature(id, expires), previewMode, subject, body: message });
    }
    if (
      input.confirmed !== true || (!officialVerification && input.transactionalOnly !== true) || typeof input.id !== "string" || !memberIdPattern.test(input.id) ||
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
    const transport = officialVerification ? null
      : createTransport(smtpOptions({ ...process.env, BEAST_SMTP_FROM: MEMBER_MAIL_ADDRESS }));
    const fingerprint = officialVerification
      ? JSON.stringify([category, recipients, new Date().toISOString().slice(0, 10)])
      : JSON.stringify({ category, recipients, subject, body: message });
    const reserved = await admin.rpc("reserve_beast_admin_member_email_campaign", {
      p_id: input.id, p_actor: user.id, p_fingerprint: createHash("sha256").update(fingerprint).digest("hex"),
      p_subject: subject, p_recipients: recipients, p_category: category,
    });
    if (reserved.error) return reply({ error: "Campaign audit is unavailable." }, 503);
    if (reserved.data !== true) return reply({ error: "Campaign already reserved or the send limit was reached." }, 409);

    const record = async (outcomes: Record<string, MemberMailOutcome>) => {
      const recorded = await admin.from("beast_admin_member_email_campaigns")
        .update({ outcomes }).eq("id", input.id).select("id").single();
      if (recorded.error) throw Error("Audit update failed");
    };
    if (!transport) {
      const emailRedirectTo = buildEmailVerificationCallbackUrl(
        new URL(request.url).origin, process.env.NEXT_PUBLIC_BEAST_SITE_URL,
      );
      const outcomes: Record<string, MemberMailOutcome> = {};
      for (const recipient of recipients) {
        try {
          const { error } = await admin.auth.resend({
            type: "signup", email: recipient.email, options: { emailRedirectTo },
          });
          outcomes[recipient.id] = !error ? "accepted"
            : error.status && error.status >= 400 && error.status < 500 ? "rejected" : "uncertain";
        } catch {
          outcomes[recipient.id] = "uncertain";
        }
        await record(outcomes);
      }
      return reply({ outcomes });
    }
    const results = await deliverMemberMessages(recipients, subject, message, async (individual): Promise<MemberMailOutcome> => {
      try {
        const result = await transport.sendMail(individual);
        return result.accepted.length === 1 && result.rejected.length === 0 ? "accepted" : "rejected";
      } catch (error) {
        const code = (error as { responseCode?: number }).responseCode;
        return typeof code === "number" && code >= 400 && code < 600 ? "rejected" : "uncertain";
      }
    }, record);
    return reply(results);
  } catch {
    return reply({ error: "Request could not be completed. Review the audit before another send." }, 503);
  }
}
