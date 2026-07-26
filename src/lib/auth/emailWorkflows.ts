import type { User } from "@supabase/supabase-js";
import {
  buildAuthCallbackUrl,
  getBeastAuthOrigin,
} from "./experience";

export const BEAST_ACCOUNT_SETTINGS_PATH = "/dashboard/settings/profile";
export const BEAST_EMAIL_SEND_COOLDOWN_SECONDS = 60;

export type BeastAuthEmailStatus = {
  currentEmail: string | null;
  verified: boolean;
  pendingEmail: string | null;
  emailChangeSentAt: string | null;
};

type AuthErrorLike = {
  code?: string | null;
  message?: string | null;
};

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function getBeastAuthEmailStatus(
  user?: Pick<
    User,
    "email" | "email_confirmed_at" | "new_email" | "email_change_sent_at"
  > | null
): BeastAuthEmailStatus {
  return {
    currentEmail: user?.email?.trim().toLowerCase() || null,
    verified: Boolean(user?.email_confirmed_at),
    pendingEmail: user?.new_email?.trim().toLowerCase() || null,
    emailChangeSentAt: user?.email_change_sent_at || null,
  };
}

export function normalizeRequestedAuthEmail(
  value: string,
  currentEmail?: string | null
) {
  const email = value.trim().toLowerCase();
  if (
    !emailPattern.test(email) ||
    email.length > 320 ||
    email === currentEmail?.trim().toLowerCase()
  ) {
    return null;
  }
  return email;
}

export function buildEmailVerificationCallbackUrl(
  runtimeOrigin: string,
  configuredSiteUrl?: string | null
) {
  const origin = getBeastAuthOrigin(runtimeOrigin, configuredSiteUrl);
  const destination = `${BEAST_ACCOUNT_SETTINGS_PATH}?email=verification-returned`;
  const callback = new URL(buildAuthCallbackUrl(origin, destination));
  callback.searchParams.set("flow", "email_verification");
  return callback.toString();
}

export function buildEmailVerificationFailurePath() {
  return `${BEAST_ACCOUNT_SETTINGS_PATH}?email=verification-failed`;
}

export function getEmailWorkflowErrorMessage(error?: AuthErrorLike | null) {
  const code = error?.code?.toLowerCase() || "";
  const message = error?.message?.toLowerCase() || "";

  if (
    code === "email_exists" ||
    message.includes("already registered") ||
    message.includes("already been registered") ||
    message.includes("email exists")
  ) {
    return "That email is already used by another Beast account.";
  }
  if (
    code === "over_email_send_rate_limit" ||
    code === "over_request_rate_limit" ||
    message.includes("rate limit")
  ) {
    return "A verification email was sent recently. Wait a moment, then try again.";
  }
  if (
    code === "email_address_invalid" ||
    code === "email_address_not_authorized"
  ) {
    return "Enter an email address that can receive Beast account messages.";
  }
  if (
    code === "session_not_found" ||
    code === "session_expired" ||
    message.includes("session")
  ) {
    return "Your session expired. Sign in again before changing your email.";
  }

  return "BeastOS could not update the account email. Your current sign-in email is unchanged.";
}
