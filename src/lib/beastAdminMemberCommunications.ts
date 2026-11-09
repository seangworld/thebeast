import type { BeastAdminMemberDirectoryEntry } from "./beastAdminMemberTimeline";

export const MEMBER_MAIL_ADDRESS = "seang@seangworld.com";
export const MEMBER_MAIL_LIMIT = 5;
export const memberIdPattern = /^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i;

export const memberMailCategories = ["account_setup", "onboarding", "verification"] as const;
export type MemberMailCategory = typeof memberMailCategories[number];

export function resolveSetupRecipients(
  members: BeastAdminMemberDirectoryEntry[],
  ids: string[],
  category: MemberMailCategory = "account_setup",
) {
  const emails = new Set<string>();
  return members.flatMap((member) => {
    const email = member.email?.trim();
    if (
      !ids.includes(member.id) || member.accountKind !== "member" ||
      (member.accountStatus !== "active" && !(category !== "account_setup" && member.accountStatus === "invited")) ||
      (category === "account_setup"
        ? member.emailVerificationStatus !== "verified" || Boolean(member.username)
        : member.emailVerificationStatus !== "unverified" || Boolean(member.pendingEmail)) || !email || email.length > 254 ||
      !/^[a-z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-z0-9-]+(?:\.[a-z0-9-]+)+$/i.test(email) ||
      emails.has(email.toLowerCase())
    ) return [];
    emails.add(email.toLowerCase());
    return [{ id: member.id, email }];
  }).sort((a, b) => a.id.localeCompare(b.id));
}

export const memberMailTemplates = {
  account_setup: {
    subject: "Finish setting up your Beast username",
    body: "Please sign in to BeastOS with your verified email and choose your login username in Account Setup.",
  },
  onboarding: {
    subject: "Finish verifying your Beast account",
    body: "Your Beast account is already set up to receive a verification email. Request a fresh verification link using the email you registered with, then follow the link to finish setup. You can use your existing account.",
  },
};

export function getMemberMailTemplateOptions(
  members: BeastAdminMemberDirectoryEntry[],
  ids: string[],
) {
  const setup = resolveSetupRecipients(members, ids).length;
  const onboarding = resolveSetupRecipients(members, ids, "onboarding").length;
  // Only prefill when the entire selection resolves to one eligible group.
  const recommended = ids.length > 0 && setup === ids.length ? "account_setup"
    : ids.length > 0 && onboarding === ids.length ? "onboarding" : null;
  return { setup, onboarding, recommended } as const;
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
