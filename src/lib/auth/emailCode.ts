import type { SupabaseClient } from "@supabase/supabase-js";
import { getAuthErrorMessage, isDisabledBeastUser } from "./experience";

type EmailCodeAuth = Pick<SupabaseClient["auth"], "verifyOtp" | "getUser" | "signOut">;

// Uses the browser client's normal cookie/session handling. No admin credential,
// token extraction, account creation, URL code or analytics code is involved.
export async function verifyBeastEmailCode(auth: EmailCodeAuth, email: string, code: string) {
  const token = code.trim();
  if (!email.trim() || !/^\d{6,10}$/.test(token)) {
    return { ok: false as const, message: "Enter the code from your sign-in email." };
  }
  const { error } = await auth.verifyOtp({ email: email.trim(), token, type: "email" });
  if (error) return { ok: false as const, message: error.code === "otp_expired"
    ? "That sign-in code is invalid or has expired. Request a new sign-in email."
    : getAuthErrorMessage(error) };
  const { data: { user }, error: userError } = await auth.getUser();
  if (userError || !user) {
    await auth.signOut();
    return { ok: false as const, message: "We could not verify your session. Request a new sign-in email." };
  }
  if (isDisabledBeastUser(user)) {
    await auth.signOut();
    return { ok: false as const, disabled: true, message: "This Beast account is disabled. Contact the account owner for help." };
  }
  return { ok: true as const };
}

