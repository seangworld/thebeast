"use client";

import Image from "next/image";
import Link from "next/link";
import { Suspense, useEffect, useMemo, useState, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  beastOSApplications,
  beastOSPlatformIdentity,
  beastOSSharedCapabilities,
} from "@/lib/platform/identity";
import {
  buildAuthCallbackUrl,
  buildForgotPasswordPath,
  buildAuthLoginPath,
  getAuthErrorMessage,
  getAuthErrorState,
  getBeastAuthOrigin,
  getSafeAuthDestination,
  isDisabledBeastUser,
  isGoogleSignInEnabled,
  isPasswordSignInEnabled,
  isPublicRegistrationEnabled,
  normalizeAuthViewState,
  validateBeastPassword,
  type BeastAuthViewState,
} from "@/lib/auth/experience";
import { createClient } from "@/lib/supabase/client";
import { trackBeastFunnelEvent } from "@/lib/analytics/client";

type AuthIntent = "login" | "create-account";
type AuthMethod = "magic-link" | "password";

const publicRegistrationEnabled = isPublicRegistrationEnabled(
  process.env.NEXT_PUBLIC_BEAST_PUBLIC_REGISTRATION_ENABLED
);
const passwordSignInEnabled = isPasswordSignInEnabled(
  process.env.NEXT_PUBLIC_BEAST_PASSWORD_SIGN_IN_ENABLED
);
const googleSignInEnabled = isGoogleSignInEnabled(
  process.env.NEXT_PUBLIC_BEAST_GOOGLE_AUTH_ENABLED
);

const authStateContent: Record<
  Exclude<BeastAuthViewState, "sign_in" | "magic_link_requested">,
  { title: string; description: string }
> = {
  invalid_or_expired_link: {
    title: "That link no longer works",
    description:
      "Sign-in links are time limited and can only be used once. Request a new link to continue.",
  },
  email_not_verified: {
    title: "Verify your email",
    description:
      "Check your inbox for the Beast verification message, then return here to sign in.",
  },
  account_suspended: {
    title: "Account suspended",
    description:
      "Sign-in is temporarily unavailable for this Beast account. Contact the account owner if you believe this is a mistake.",
  },
  account_disabled: {
    title: "Account disabled",
    description:
      "This Beast account no longer has sign-in access. Contact the account owner for help.",
  },
  session_expired: {
    title: "Your session expired",
    description: "Sign in again and BeastOS will return you to where you left off.",
  },
  authentication_error: {
    title: "We could not sign you in",
    description: "Something interrupted authentication. Please try again.",
  },
  password_reset_success: {
    title: "Password updated",
    description:
      "Your password was changed and existing sessions were closed. Sign in again with your new password.",
  },
  signed_out: {
    title: "You’re signed out",
    description: "Your Beast session ended safely.",
  },
};

function LoginExperience() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const destination = useMemo(
    () => getSafeAuthDestination(searchParams.get("next")),
    [searchParams]
  );
  const queryState = normalizeAuthViewState(searchParams.get("state"));
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [intent, setIntent] = useState<AuthIntent>(() =>
    publicRegistrationEnabled && searchParams.get("intent") === "create-account"
      ? "create-account"
      : "login"
  );
  const [method, setMethod] = useState<AuthMethod>(() =>
    passwordSignInEnabled ? "password" : "magic-link"
  );
  const [localState, setLocalState] = useState<BeastAuthViewState | null>(null);
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const activeState = localState ?? queryState;

  useEffect(() => {
    if (queryState !== "sign_in") return;

    let active = true;

    async function routeAuthenticatedMember() {
      try {
        const supabase = createClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!active || !user) return;

        if (isDisabledBeastUser(user)) {
          await supabase.auth.signOut();
          if (active) setLocalState("account_disabled");
          return;
        }

        router.replace(destination);
      } catch {
        // The form remains usable and will surface a human-readable error on submit.
      }
    }

    void routeAuthenticatedMember();
    return () => {
      active = false;
    };
  }, [destination, queryState, router]);

  function showSignIn() {
    setLocalState(null);
    setMessage("");
    setIntent("login");
    setMethod(passwordSignInEnabled ? "password" : "magic-link");
    setPassword("");
    router.replace(buildAuthLoginPath(destination));
  }

  function selectIntent(nextIntent: AuthIntent) {
    setIntent(nextIntent);
    setMethod(passwordSignInEnabled ? "password" : "magic-link");
    setMessage("");
  }

  async function authenticateWithGoogle() {
    setMessage("");
    setSubmitting(true);

    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: buildAuthCallbackUrl(
            getBeastAuthOrigin(
              window.location.origin,
              process.env.NEXT_PUBLIC_BEAST_SITE_URL
            ),
            destination
          ),
        },
      });

      if (error) {
        setLocalState(getAuthErrorState(error));
        setMessage(getAuthErrorMessage(error));
      }
    } catch {
      setLocalState("authentication_error");
      setMessage("BeastOS could not reach Google sign-in. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  async function authenticate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");

    const normalizedEmail = email.trim();

    if (!normalizedEmail) {
      setMessage("Enter your email to continue.");
      return;
    }

    if (method === "password" && !password) {
      setMessage("Enter your password to continue.");
      return;
    }

    setSubmitting(true);

    try {
      const supabase = createClient();

      if (method === "password") {
        if (intent === "create-account") {
          const passwordValidation = validateBeastPassword(password);
          if (!passwordValidation.valid) {
            setMessage(
              "Create a password between 12 and 72 characters with at least one letter and one number."
            );
            return;
          }

          const { data, error } = await supabase.auth.signUp({
            email: normalizedEmail,
            password,
            options: {
              emailRedirectTo: buildAuthCallbackUrl(
                getBeastAuthOrigin(
                  window.location.origin,
                  process.env.NEXT_PUBLIC_BEAST_SITE_URL
                ),
                destination
              ),
            },
          });

          if (error) {
            setLocalState(getAuthErrorState(error));
            setMessage(getAuthErrorMessage(error));
            return;
          }

          if (data.user) {
            trackBeastFunnelEvent("account_created", {
              result: "success",
              category: "password",
            });
          }

          if (data.session && data.user) {
            router.replace(destination);
            router.refresh();
            return;
          }

          setEmail(normalizedEmail);
          setLocalState("magic_link_requested");
          return;
        }

        const { data, error } = await supabase.auth.signInWithPassword({
          email: normalizedEmail,
          password,
        });

        if (error) {
          setLocalState(getAuthErrorState(error));
          setMessage(getAuthErrorMessage(error));
          return;
        }

        if (isDisabledBeastUser(data.user)) {
          await supabase.auth.signOut();
          setLocalState("account_disabled");
          return;
        }

        router.replace(destination);
        trackBeastFunnelEvent("login_completed", {
          result: "success",
          category: "password",
        });
        router.refresh();
        return;
      }

      const { error } = await supabase.auth.signInWithOtp({
        email: normalizedEmail,
        options: {
          emailRedirectTo: buildAuthCallbackUrl(
            getBeastAuthOrigin(
              window.location.origin,
              process.env.NEXT_PUBLIC_BEAST_SITE_URL
            ),
            destination
          ),
          shouldCreateUser: intent === "create-account",
        },
      });

      if (error) {
        setLocalState(getAuthErrorState(error));
        setMessage(getAuthErrorMessage(error));
        return;
      }

      setEmail(normalizedEmail);
      setLocalState("magic_link_requested");
    } catch {
      setLocalState("authentication_error");
      setMessage("BeastOS could not reach authentication. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  const blockingState =
    activeState !== "sign_in" &&
    activeState !== "magic_link_requested" &&
    activeState !== "session_expired" &&
    activeState !== "password_reset_success" &&
    activeState !== "signed_out";
  const noticeState =
    activeState === "session_expired" ||
    activeState === "password_reset_success" ||
    activeState === "signed_out"
      ? activeState
      : null;

  return (
    <main className="beast-page flex min-h-screen items-center justify-center px-4 py-6 sm:px-6 sm:py-12">
      <section
        aria-labelledby="beast-auth-title"
        className="beast-card w-full max-w-xl px-5 py-7 text-center sm:px-10 sm:py-10"
      >
        <div className="flex flex-col items-center">
          <Image
            src="/beast-logo-square.png"
            alt="BeastOS"
            width={88}
            height={88}
            priority
            className="h-20 w-20 rounded-2xl object-cover sm:h-24 sm:w-24"
          />
          <p className="mt-5 text-xs font-black uppercase tracking-[0.18em] text-[#38bdf8]">
            {beastOSPlatformIdentity.role}
          </p>
          <h1
            id="beast-auth-title"
            className="mt-2 text-3xl font-black tracking-tight text-white sm:text-4xl"
          >
            BeastOS
          </h1>
          <p className="mt-2 max-w-md text-sm leading-6 text-[#c7cfdb] sm:text-base">
            One Beast account for every application, professional, and shared
            service.
          </p>
        </div>

        {activeState === "magic_link_requested" ? (
          <div className="mt-7 rounded-2xl border border-[#24516a] bg-[#0e1b24] p-5 text-left sm:p-6">
            <p className="text-xs font-black uppercase tracking-wide text-[#38bdf8]">
              Magic link requested
            </p>
            <h2 className="mt-2 text-xl font-black text-white">
              Check your email
            </h2>
            <p className="mt-2 text-sm leading-6 text-[#c7cfdb]">
              We sent a secure {intent === "create-account" ? "account setup" : "sign-in"} link to{" "}
              <strong className="text-white">{email}</strong>. You can close this
              page after opening the link.
            </p>
            <p className="mt-3 text-xs leading-5 text-[#8d99aa]">
              The link expires for your protection. If it does not arrive, check
              spam or request another one.
            </p>
            <button
              type="button"
              className="beast-button-secondary mt-5 min-h-[48px] w-full"
              onClick={showSignIn}
            >
              Use a different email
            </button>
          </div>
        ) : blockingState ? (
          <div
            role="alert"
            className="mt-7 rounded-2xl border border-[#6b3440] bg-[#241319] p-5 text-left sm:p-6"
          >
            <p className="text-xs font-black uppercase tracking-wide text-[#fb7185]">
              BeastOS authentication
            </p>
            <h2 className="mt-2 text-xl font-black text-white">
              {authStateContent[activeState].title}
            </h2>
            <p className="mt-2 text-sm leading-6 text-[#d7bdc3]">
              {message || authStateContent[activeState].description}
            </p>
            {activeState !== "account_suspended" &&
            activeState !== "account_disabled" ? (
              <button
                type="button"
                className="beast-button mt-5 min-h-[48px] w-full"
                onClick={showSignIn}
              >
                Try signing in again
              </button>
            ) : null}
          </div>
        ) : (
          <>
            {noticeState ? (
              <div
                role="status"
                className="mt-7 rounded-2xl border border-[#24516a] bg-[#0e1b24] p-4 text-left"
              >
                <p className="font-bold text-white">
                  {authStateContent[noticeState].title}
                </p>
                <p className="mt-1 text-sm leading-5 text-[#b8c7d4]">
                  {authStateContent[noticeState].description}
                </p>
              </div>
            ) : null}

            <div className="mt-7 text-left">
              <h2 className="text-2xl font-black text-white">
                {intent === "create-account" ? "Create your Beast account" : "Sign in to BeastOS"}
              </h2>
              <p className="mt-2 text-sm leading-6 text-[#9da9b9]">
                {intent === "create-account"
                  ? "Your account carries your identity and permissions across the Beast ecosystem."
                  : destination === "/dashboard/today"
                    ? "Continue to your BeastOS Today workspace."
                    : "Sign in and we’ll return you to where you left off."}
              </p>
            </div>

            {publicRegistrationEnabled ? (
              <div
                className="mt-5 grid grid-cols-2 gap-2 rounded-xl border border-[#2a3242] bg-[#0f1419] p-1"
                aria-label="Authentication options"
              >
                <button
                  type="button"
                  className={`min-h-[44px] rounded-lg px-3 text-sm font-bold transition ${
                    intent === "login"
                      ? "bg-[#1d4ed8] text-white"
                      : "text-[#aab4c2] hover:bg-[#18202b] hover:text-white"
                  }`}
                  aria-pressed={intent === "login"}
                  onClick={() => selectIntent("login")}
                >
                  Sign In
                </button>
                <button
                  type="button"
                  className={`min-h-[44px] rounded-lg px-3 text-sm font-bold transition ${
                    intent === "create-account"
                      ? "bg-[#1d4ed8] text-white"
                      : "text-[#aab4c2] hover:bg-[#18202b] hover:text-white"
                  }`}
                  aria-pressed={intent === "create-account"}
                  onClick={() => selectIntent("create-account")}
                >
                  Create Account
                </button>
              </div>
            ) : null}

            <form className="mt-5 text-left" onSubmit={authenticate} data-analytics-event="auth_initiated" data-analytics-category={method === "password" ? "password" : "magic_link"} data-analytics-status="started">
              <label htmlFor="email" className="text-sm font-bold text-white">
                Email address
              </label>
              <input
                id="email"
                type="email"
                inputMode="email"
                autoComplete="email"
                placeholder="you@email.com"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="beast-input mt-2 min-h-[48px]"
                autoFocus
              />

              {method === "password" ? (
                <>
                  <div className="mt-4 flex items-center justify-between gap-3">
                    <label
                      htmlFor="password"
                      className="text-sm font-bold text-white"
                    >
                      Password
                    </label>
                    {intent === "login" ? (
                      <Link
                        href={buildForgotPasswordPath(destination)}
                        className="text-sm font-bold text-[#7dd3fc] transition hover:text-white"
                      >
                        Forgot password?
                      </Link>
                    ) : null}
                  </div>
                  <input
                    id="password"
                    type="password"
                    autoComplete={
                      intent === "create-account"
                        ? "new-password"
                        : "current-password"
                    }
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    className="beast-input mt-2 min-h-[48px]"
                  />
                  {intent === "create-account" ? (
                    <p className="mt-2 text-xs leading-5 text-[#8d99aa]">
                      Use 12–72 characters with at least one letter and one
                      number.
                    </p>
                  ) : null}
                </>
              ) : null}

              {message ? (
                <p
                  role="alert"
                  className="mt-3 rounded-xl border border-[#6b3440] bg-[#241319] p-3 text-sm leading-5 text-[#efc4cd]"
                >
                  {message}
                </p>
              ) : null}

              <button
                type="submit"
                disabled={submitting}
                className="beast-button mt-4 min-h-[48px] w-full disabled:cursor-wait disabled:opacity-60"
              >
                {submitting
                  ? method === "password"
                    ? intent === "create-account"
                      ? "Creating account…"
                      : "Signing in…"
                    : "Sending secure link…"
                  : method === "password"
                    ? intent === "create-account"
                      ? "Create Account"
                      : "Log In"
                    : intent === "create-account"
                      ? "Create Account with Email"
                      : "Email Me a Sign-In Link"}
              </button>

              {passwordSignInEnabled ? (
                <button
                  type="button"
                  className="mt-4 min-h-[44px] w-full text-sm font-bold text-[#7dd3fc] transition hover:text-white"
                  onClick={() => {
                    setMethod((current) =>
                      current === "magic-link" ? "password" : "magic-link"
                    );
                    setMessage("");
                  }}
                >
                  {method === "magic-link"
                    ? intent === "create-account"
                      ? "Create an account with a password instead"
                      : "Use password instead"
                    : "Use a magic link instead"}
                </button>
              ) : null}

              {googleSignInEnabled ? (
                <>
                  <div className="my-4 flex items-center gap-3" aria-hidden="true">
                    <span className="h-px flex-1 bg-[#2a3242]" />
                    <span className="text-xs font-bold uppercase tracking-wide text-[#7f8da3]">
                      or
                    </span>
                    <span className="h-px flex-1 bg-[#2a3242]" />
                  </div>
                  <button
                    type="button"
                    disabled={submitting}
                    className="beast-button-secondary min-h-[48px] w-full disabled:cursor-wait disabled:opacity-60"
                    onClick={() => void authenticateWithGoogle()}
                  >
                    Continue with Google
                  </button>
                </>
              ) : null}
            </form>
          </>
        )}

        <div
          className="mt-7 border-t border-[#2a3242] pt-5 text-left"
          aria-label="Beast applications and shared platform services"
        >
          <p className="text-xs font-black uppercase tracking-wide text-[#7f8da3]">
            One account across {beastOSApplications.length} Beast applications
          </p>
          <p className="mt-2 text-xs font-semibold leading-5 text-[#6f7d91]">
            {beastOSSharedCapabilities.join(" · ")}
          </p>
          <span className="sr-only">
            {beastOSPlatformIdentity.description}
            {beastOSApplications.map((application) => application.name).join(", ")}
          </span>
        </div>
      </section>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <main className="beast-page flex min-h-screen items-center justify-center px-4">
          <div className="beast-card p-6 text-sm text-[#c7cfdb]">
            Loading BeastOS sign in…
          </div>
        </main>
      }
    >
      <LoginExperience />
    </Suspense>
  );
}
