export const BEAST_OS_LANDING_PATH = "/dashboard/today";
export const BEAST_PASSWORD_RECOVERY_COOKIE = "beast-password-recovery";
export const BEAST_INVITATION_COOKIE = "beast-invitation";

export type BeastAuthViewState =
  | "sign_in"
  | "magic_link_requested"
  | "invalid_or_expired_link"
  | "email_not_verified"
  | "account_suspended"
  | "account_disabled"
  | "session_expired"
  | "authentication_error"
  | "password_reset_success"
  | "signed_out";

type AuthErrorLike = {
  code?: string | null;
  message?: string | null;
};

type BeastAuthUserLike = {
  app_metadata?: Record<string, unknown> | null;
};

const protectedDestinationPrefix = "/dashboard";

export function getBeastAuthOrigin(
  runtimeOrigin: string,
  configuredSiteUrl?: string | null
) {
  for (const candidate of [configuredSiteUrl, runtimeOrigin]) {
    if (!candidate) continue;

    try {
      const url = new URL(candidate);
      if (url.protocol === "https:" || url.protocol === "http:") {
        return url.origin;
      }
    } catch {
      // Try the runtime origin before falling back to the local development URL.
    }
  }

  return "http://localhost:3000";
}

export function getSafeAuthDestination(value?: string | null) {
  if (!value || value.includes("\\") || value.startsWith("//")) {
    return BEAST_OS_LANDING_PATH;
  }

  try {
    const destination = new URL(value, "https://beast.local");

    if (
      destination.origin !== "https://beast.local" ||
      (destination.pathname !== protectedDestinationPrefix &&
        !destination.pathname.startsWith(`${protectedDestinationPrefix}/`))
    ) {
      return BEAST_OS_LANDING_PATH;
    }

    return `${destination.pathname}${destination.search}${destination.hash}`;
  } catch {
    return BEAST_OS_LANDING_PATH;
  }
}

export function buildAuthLoginPath(
  destination?: string | null,
  state?: BeastAuthViewState | null
) {
  const params = new URLSearchParams();
  const safeDestination = getSafeAuthDestination(destination);

  if (safeDestination !== BEAST_OS_LANDING_PATH) {
    params.set("next", safeDestination);
  }

  if (state && state !== "sign_in") {
    params.set("state", state);
  }

  const query = params.toString();
  return query ? `/login?${query}` : "/login";
}

export function buildAuthCallbackUrl(origin: string, destination?: string | null) {
  const callback = new URL("/auth/callback", origin);
  const safeDestination = getSafeAuthDestination(destination);

  callback.searchParams.set("flow", "auth");
  if (safeDestination !== BEAST_OS_LANDING_PATH) {
    callback.searchParams.set("next", safeDestination);
  }

  return callback.toString();
}

export function buildPasswordRecoveryCallbackUrl(
  origin: string,
  destination?: string | null
) {
  const callback = new URL("/auth/recovery", origin);
  const safeDestination = getSafeAuthDestination(destination);

  if (safeDestination !== BEAST_OS_LANDING_PATH) {
    callback.searchParams.set("next", safeDestination);
  }

  return callback.toString();
}

export function buildForgotPasswordPath(destination?: string | null) {
  const safeDestination = getSafeAuthDestination(destination);

  return safeDestination === BEAST_OS_LANDING_PATH
    ? "/forgot-password"
    : `/forgot-password?next=${encodeURIComponent(safeDestination)}`;
}

export function buildResetPasswordPath(
  destination?: string | null,
  state?: "invalid_or_expired_link" | "authentication_error" | null
) {
  const params = new URLSearchParams();
  const safeDestination = getSafeAuthDestination(destination);

  if (safeDestination !== BEAST_OS_LANDING_PATH) {
    params.set("next", safeDestination);
  }
  if (state) {
    params.set("state", state);
  }

  const query = params.toString();
  return query ? `/reset-password?${query}` : "/reset-password";
}

export function buildCurrentAuthLoginPath(
  state: BeastAuthViewState = "session_expired"
) {
  const destination =
    typeof window === "undefined"
      ? BEAST_OS_LANDING_PATH
      : `${window.location.pathname}${window.location.search}${window.location.hash}`;

  return buildAuthLoginPath(destination, state);
}

export function normalizeAuthViewState(
  value?: string | null
): BeastAuthViewState {
  switch (value) {
    case "invalid_or_expired_link":
    case "email_not_verified":
    case "account_suspended":
    case "account_disabled":
    case "session_expired":
    case "authentication_error":
    case "password_reset_success":
    case "signed_out":
      return value;
    default:
      return "sign_in";
  }
}

export function getAuthErrorState(error?: AuthErrorLike | null) {
  const code = error?.code?.toLowerCase() ?? "";
  const message = error?.message?.toLowerCase() ?? "";

  if (code === "user_banned" || message.includes("banned")) {
    return "account_suspended" as const;
  }

  if (
    code === "email_not_confirmed" ||
    code === "provider_email_needs_verification" ||
    message.includes("email not confirmed") ||
    message.includes("email not verified")
  ) {
    return "email_not_verified" as const;
  }

  if (
    [
      "otp_expired",
      "flow_state_not_found",
      "flow_state_expired",
      "bad_code_verifier",
      "bad_oauth_state",
      "bad_oauth_callback",
      "invite_not_found",
    ].includes(code) ||
    message.includes("expired") ||
    message.includes("invalid link")
  ) {
    return "invalid_or_expired_link" as const;
  }

  if (
    [
      "session_not_found",
      "session_expired",
      "refresh_token_not_found",
      "refresh_token_already_used",
    ].includes(code)
  ) {
    return "session_expired" as const;
  }

  if (
    code === "user_disabled" ||
    code === "account_disabled" ||
    message.includes("account is disabled")
  ) {
    return "account_disabled" as const;
  }

  return "authentication_error" as const;
}

export function getAuthErrorMessage(error?: AuthErrorLike | null) {
  const code = error?.code?.toLowerCase() ?? "";
  const state = getAuthErrorState(error);

  if (state === "account_suspended") {
    return "This Beast account is suspended. Contact the account owner if you believe this is a mistake.";
  }

  if (state === "email_not_verified") {
    return "Verify your email before signing in. Check your inbox for the verification message.";
  }

  if (state === "invalid_or_expired_link") {
    return "That sign-in link is invalid or has expired. Request a new link to continue.";
  }

  if (state === "session_expired") {
    return "Your session expired. Sign in again to continue where you left off.";
  }

  if (state === "account_disabled") {
    return "This Beast account is disabled. Contact the account owner for help.";
  }

  if (code === "invalid_credentials") {
    return "The email or password you entered is not correct.";
  }

  if (code === "signup_disabled") {
    return "New Beast account registration is not available right now.";
  }

  if (
    code === "over_email_send_rate_limit" ||
    code === "over_request_rate_limit"
  ) {
    return "Too many attempts were made. Wait a moment, then try again.";
  }

  if (
    code === "email_address_invalid" ||
    code === "email_address_not_authorized"
  ) {
    return "Enter an email address that can receive Beast sign-in messages.";
  }

  if (code === "weak_password") {
    return "That password does not meet the Beast password requirements.";
  }

  return "BeastOS could not sign you in. Please try again.";
}

export function isDisabledBeastUser(user?: BeastAuthUserLike | null) {
  const metadata = user?.app_metadata;
  const status =
    typeof metadata?.account_status === "string"
      ? metadata.account_status.toLowerCase()
      : "";

  return metadata?.is_disabled === true || status === "disabled";
}

export function isPublicRegistrationEnabled(value?: string) {
  return value?.trim().toLowerCase() !== "false";
}

export function isPasswordSignInEnabled(value?: string) {
  return value?.trim().toLowerCase() === "true";
}

export const BEAST_PASSWORD_MIN_LENGTH = 12;
export const BEAST_PASSWORD_MAX_LENGTH = 72;

export type BeastPasswordValidation = {
  valid: boolean;
  requirements: Array<{
    id: "length" | "letter" | "number";
    label: string;
    met: boolean;
  }>;
};

export function validateBeastPassword(password: string): BeastPasswordValidation {
  const requirements: BeastPasswordValidation["requirements"] = [
    {
      id: "length",
      label: `Between ${BEAST_PASSWORD_MIN_LENGTH} and ${BEAST_PASSWORD_MAX_LENGTH} characters`,
      met:
        password.length >= BEAST_PASSWORD_MIN_LENGTH &&
        password.length <= BEAST_PASSWORD_MAX_LENGTH,
    },
    {
      id: "letter",
      label: "At least one letter",
      met: /[A-Za-z]/.test(password),
    },
    {
      id: "number",
      label: "At least one number",
      met: /\d/.test(password),
    },
  ];

  return {
    valid: requirements.every((requirement) => requirement.met),
    requirements,
  };
}
