import type { BeastAdminMemberDirectoryEntry } from "./beastAdminMemberTimeline";

export const MEMBER_MAIL_ADDRESS = "seang@seangworld.com";
export const MEMBER_MAIL_LIMIT = 5;
export const memberIdPattern = /^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i;

export function resolveSetupRecipients(
  members: BeastAdminMemberDirectoryEntry[],
  ids: string[],
) {
  const emails = new Set<string>();
  return members.flatMap((member) => {
    const email = member.email?.trim();
    if (
      !ids.includes(member.id) || member.accountKind !== "member" ||
      member.accountStatus !== "active" || member.emailVerificationStatus !== "verified" ||
      member.username || !email || email.length > 254 ||
      !/^[a-z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-z0-9-]+(?:\.[a-z0-9-]+)+$/i.test(email) ||
      emails.has(email.toLowerCase())
    ) return [];
    emails.add(email.toLowerCase());
    return [{ id: member.id, email }];
  }).sort((a, b) => a.id.localeCompare(b.id));
}

export type MemberMailOutcome = "accepted" | "rejected" | "uncertain";

export async function deliverMemberMessages(
  recipients: { id: string; email: string }[],
  subject: string,
  body: string,
  send: (message: { from: string; replyTo: string; to: string; subject: string; text: string }) => Promise<MemberMailOutcome>,
  record: (outcomes: Record<string, MemberMailOutcome>) => Promise<void>,
) {
  const outcomes: Record<string, MemberMailOutcome> = {};
  for (const recipient of recipients) {
    outcomes[recipient.id] = await send({
      from: MEMBER_MAIL_ADDRESS, replyTo: MEMBER_MAIL_ADDRESS, to: recipient.email, subject, text: body,
    });
    await record(outcomes);
  }
  const counts = { accepted: 0, rejected: 0, uncertain: 0 };
  for (const outcome of Object.values(outcomes)) counts[outcome]++;
  outcomes.summary = await send({
    from: MEMBER_MAIL_ADDRESS, replyTo: MEMBER_MAIL_ADDRESS, to: MEMBER_MAIL_ADDRESS,
    subject: "BeastAdmin account setup email summary",
    text: `Accepted: ${counts.accepted}\nRejected: ${counts.rejected}\nUncertain: ${counts.uncertain}\nAcceptance does not confirm inbox delivery.`,
  });
  await record(outcomes);
  return { ...counts, summary: outcomes.summary };
}
