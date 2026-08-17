"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import {
  buildAuthCallbackUrl,
  buildForgotPasswordPath,
  getAuthErrorMessage,
  getBeastAuthOrigin,
  isDisabledBeastUser,
  isGoogleSignInEnabled,
  isPasswordSignInEnabled,
  isPublicRegistrationEnabled,
  validateBeastPassword,
} from "@/lib/auth/experience";
import {
  beastOSApplications,
  beastOSPlatformIdentity,
} from "@/lib/platform/identity";
import { createClient } from "@/lib/supabase/client";

type AuthIntent = "login" | "create-account";
type AuthMethod = "password" | "magic-link";

const publicRegistrationEnabled = isPublicRegistrationEnabled(
  process.env.NEXT_PUBLIC_BEAST_PUBLIC_REGISTRATION_ENABLED
);
const passwordSignInEnabled = isPasswordSignInEnabled(
  process.env.NEXT_PUBLIC_BEAST_PASSWORD_SIGN_IN_ENABLED
);
const googleSignInEnabled = isGoogleSignInEnabled(
  process.env.NEXT_PUBLIC_BEAST_GOOGLE_AUTH_ENABLED
);

function AuthenticationDialog({
  intent,
  open,
  onClose,
  onAuthenticated,
}: {
  intent: AuthIntent;
  open: boolean;
  onClose: () => void;
  onAuthenticated: (user: User) => void;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const emailRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [method, setMethod] = useState<AuthMethod>(() =>
    passwordSignInEnabled ? "password" : "magic-link"
  );
  const [message, setMessage] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (open && !dialog.open) {
      dialog.showModal();
      window.setTimeout(() => emailRef.current?.focus(), 0);
    } else if (!open && dialog.open) {
      dialog.close();
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    setMethod(passwordSignInEnabled ? "password" : "magic-link");
    setMessage("");
    setSubmitted(false);
    setPassword("");
  }, [intent, open]);

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
      const origin = getBeastAuthOrigin(
        window.location.origin,
        process.env.NEXT_PUBLIC_BEAST_SITE_URL
      );
      const emailRedirectTo = buildAuthCallbackUrl(origin);

      if (method === "magic-link") {
        const { error } = await supabase.auth.signInWithOtp({
          email: normalizedEmail,
          options: {
            emailRedirectTo,
            shouldCreateUser: intent === "create-account",
          },
        });
        if (error) {
          setMessage(getAuthErrorMessage(error));
          return;
        }
        setEmail(normalizedEmail);
        setSubmitted(true);
        return;
      }

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
          options: { emailRedirectTo },
        });
        if (error) {
          setMessage(getAuthErrorMessage(error));
          return;
        }
        if (data.session && data.user && !isDisabledBeastUser(data.user)) {
          onAuthenticated(data.user);
          router.push("/dashboard/today");
          router.refresh();
          return;
        }
        setEmail(normalizedEmail);
        setSubmitted(true);
        return;
      }

      const { data, error } = await supabase.auth.signInWithPassword({
        email: normalizedEmail,
        password,
      });
      if (error) {
        setMessage(getAuthErrorMessage(error));
        return;
      }
      if (isDisabledBeastUser(data.user)) {
        await supabase.auth.signOut();
        setMessage(getAuthErrorMessage({ code: "account_disabled" }));
        return;
      }
      if (data.user) {
        onAuthenticated(data.user);
        router.push("/dashboard/today");
        router.refresh();
      }
    } catch {
      setMessage("BeastOS could not reach authentication. Please try again.");
    } finally {
      setSubmitting(false);
    }
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
            )
          ),
        },
      });
      if (error) setMessage(getAuthErrorMessage(error));
    } catch {
      setMessage("BeastOS could not reach Google sign-in. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <dialog
      ref={dialogRef}
      aria-modal="true"
      aria-labelledby="member-auth-title"
      aria-describedby="member-auth-description"
      className="m-auto w-[calc(100%-2rem)] max-w-lg rounded-3xl border border-[#334155] bg-[#0b1626] p-0 text-white shadow-2xl backdrop:bg-black/75"
      onCancel={(event) => {
        if (submitting) {
          event.preventDefault();
          return;
        }
        onClose();
      }}
      onClose={onClose}
    >
      <div className="p-5 sm:p-7">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.18em] text-[#38bdf8]">
              SEANGWORLD / The Beast
            </p>
            <h2 id="member-auth-title" className="mt-2 text-2xl font-black">
              {intent === "create-account"
                ? "Create your account"
                : "Log in to The Beast"}
            </h2>
            <p
              id="member-auth-description"
              className="mt-2 text-sm leading-6 text-[#b8c7d4]"
            >
              {intent === "create-account"
                ? "Create your identity first. Product onboarding comes after you sign in."
                : "Continue to your private Beast workspace."}
            </p>
          </div>
          <button
            type="button"
            aria-label="Close authentication"
            disabled={submitting}
            className="rounded-xl border border-[#334155] px-3 py-2 text-sm font-bold text-[#c7d2df] hover:bg-white/5 disabled:opacity-60"
            onClick={onClose}
          >
            Close
          </button>
        </div>

        {submitted ? (
          <div
            role="status"
            className="mt-6 rounded-2xl border border-[#24516a] bg-[#0e1b24] p-5"
          >
            <h3 className="font-black">Check your email</h3>
            <p className="mt-2 text-sm leading-6 text-[#c7cfdb]">
              We sent a secure{" "}
              {intent === "create-account"
                ? "account confirmation"
                : "sign-in"}{" "}
              link. Open it in this browser to continue.
            </p>
            <button
              type="button"
              className="beast-button-secondary mt-4 min-h-[44px] w-full"
              onClick={() => {
                setSubmitted(false);
                setMessage("");
              }}
            >
              Use a different email
            </button>
          </div>
        ) : (
          <form className="mt-6" onSubmit={authenticate}>
            <label
              htmlFor={`public-auth-email-${intent}`}
              className="text-sm font-bold"
            >
              Email address
            </label>
            <input
              ref={emailRef}
              id={`public-auth-email-${intent}`}
              type="email"
              inputMode="email"
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="beast-input mt-2 min-h-[48px]"
            />

            {method === "password" ? (
              <>
                <div className="mt-4 flex items-center justify-between gap-3">
                  <label
                    htmlFor={`public-auth-password-${intent}`}
                    className="text-sm font-bold"
                  >
                    Password
                  </label>
                  {intent === "login" ? (
                    <Link
                      href={buildForgotPasswordPath()}
                      className="text-sm font-bold text-[#7dd3fc] hover:text-white"
                      onClick={onClose}
                    >
                      Forgot password?
                    </Link>
                  ) : null}
                </div>
                <input
                  id={`public-auth-password-${intent}`}
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
                    Use 12–72 characters with at least one letter and one number.
                  </p>
                ) : null}
              </>
            ) : null}

            {message ? (
              <p
                role="alert"
                className="mt-4 rounded-xl border border-[#6b3440] bg-[#241319] p-3 text-sm text-[#efc4cd]"
              >
                {message}
              </p>
            ) : null}

            <button
              type="submit"
              disabled={submitting}
              className="beast-button mt-5 min-h-[48px] w-full disabled:cursor-wait disabled:opacity-60"
            >
              {submitting
                ? "Please wait…"
                : method === "magic-link"
                  ? intent === "create-account"
                    ? "Create Account with Email"
                    : "Email Me a Sign-In Link"
                  : intent === "create-account"
                    ? "Create Account"
                    : "Log In"}
            </button>

            {passwordSignInEnabled ? (
              <button
                type="button"
                className="mt-4 min-h-[44px] w-full text-sm font-bold text-[#7dd3fc] hover:text-white"
                onClick={() => {
                  setMethod((current) =>
                    current === "password" ? "magic-link" : "password"
                  );
                  setMessage("");
                }}
              >
                {method === "password"
                  ? "Use a magic link instead"
                  : "Use email and password instead"}
              </button>
            ) : null}

            {googleSignInEnabled ? (
              <button
                type="button"
                disabled={submitting}
                className="beast-button-secondary mt-3 min-h-[48px] w-full disabled:opacity-60"
                onClick={() => void authenticateWithGoogle()}
              >
                Continue with Google
              </button>
            ) : null}
          </form>
        )}

        <p className="mt-5 text-center text-xs leading-5 text-[#7f8da3]">
          Prefer the dedicated page?{" "}
          <Link
            href={
              intent === "create-account"
                ? "/login?intent=create-account"
                : "/login"
            }
            className="font-bold text-[#7dd3fc] hover:text-white"
          >
            Open full-screen authentication
          </Link>
        </p>
      </div>
    </dialog>
  );
}

export function HomeRedirect() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [authIntent, setAuthIntent] = useState<AuthIntent>("login");
  const [authOpen, setAuthOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [logoutError, setLogoutError] = useState("");

  useEffect(() => {
    const supabase = createClient();
    let active = true;

    void supabase.auth.getUser().then(({ data }) => {
      if (!active) return;
      setUser(
        data.user && !isDisabledBeastUser(data.user) ? data.user : null
      );
    });

    const { data: subscription } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (!active) return;
        setUser(
          session?.user && !isDisabledBeastUser(session.user)
            ? session.user
            : null
        );
      }
    );

    return () => {
      active = false;
      subscription.subscription.unsubscribe();
    };
  }, []);

  function openAuthentication(intent: AuthIntent) {
    setAuthIntent(intent);
    setAuthOpen(true);
  }

  async function logout() {
    setSigningOut(true);
    setLogoutError("");
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signOut();
      if (error) {
        setLogoutError("The Beast could not log you out. Please try again.");
        return;
      }
      setUser(null);
      router.refresh();
    } catch {
      setLogoutError("The Beast could not log you out. Please try again.");
    } finally {
      setSigningOut(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#07111f] text-white">
      <header className="sticky top-0 z-40 border-b border-white/10 bg-[#07111f]/95 px-4 py-3 backdrop-blur sm:px-6 lg:px-10">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
          <Link
            href="/"
            className="flex min-w-0 items-center gap-3"
            aria-label="The Beast home"
          >
            <Image
              src="/beast-logo-square.png"
              alt=""
              width={44}
              height={44}
              priority
              className="h-11 w-11 rounded-xl object-cover"
            />
            <div className="min-w-0">
              <p className="truncate text-base font-black">The Beast</p>
              <p className="truncate text-xs font-semibold text-[#8fa1b7]">
                Powered by BeastOS
              </p>
            </div>
          </Link>

          <nav
            aria-label="Member authentication"
            className="flex items-center gap-2 sm:gap-3"
          >
            {user ? (
              <>
                <Link
                  href="/dashboard/settings/profile"
                  className="rounded-xl border border-[#334155] px-3 py-2 text-sm font-bold text-[#d9e4f1] hover:bg-white/5 sm:px-4"
                >
                  Account
                </Link>
                <button
                  type="button"
                  disabled={signingOut}
                  className="rounded-xl bg-[#2563eb] px-3 py-2 text-sm font-black text-white hover:bg-[#1d4ed8] disabled:opacity-60 sm:px-4"
                  onClick={() => void logout()}
                >
                  {signingOut ? "Logging out…" : "Log Out"}
                </button>
              </>
            ) : (
              <>
                {publicRegistrationEnabled ? (
                  <button
                    type="button"
                    className="rounded-xl border border-[#334155] px-3 py-2 text-sm font-bold text-[#d9e4f1] hover:bg-white/5 sm:px-4"
                    onClick={() => openAuthentication("create-account")}
                  >
                    Sign Up
                  </button>
                ) : null}
                <button
                  type="button"
                  className="rounded-xl bg-[#2563eb] px-3 py-2 text-sm font-black text-white hover:bg-[#1d4ed8] sm:px-4"
                  onClick={() => openAuthentication("login")}
                >
                  Log In
                </button>
              </>
            )}
          </nav>
        </div>
        {logoutError ? (
          <p
            role="alert"
            className="mx-auto mt-3 max-w-7xl text-right text-sm font-semibold text-[#fda4af]"
          >
            {logoutError}
          </p>
        ) : null}
      </header>

      <section className="relative overflow-hidden px-4 py-16 sm:px-6 sm:py-24 lg:px-10 lg:py-28">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(37,99,235,0.24),transparent_45%),radial-gradient(circle_at_bottom_left,rgba(34,197,94,0.12),transparent_42%)]" />
        <div className="relative mx-auto grid max-w-7xl items-center gap-12 lg:grid-cols-[1.15fr_0.85fr]">
          <div>
            <p className="text-sm font-black uppercase tracking-[0.2em] text-[#38bdf8]">
              SEANGWORLD / The Beast
            </p>
            <h1 className="mt-5 max-w-4xl text-4xl font-black leading-tight tracking-tight sm:text-6xl">
              One private place to organize the life you are building.
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-[#b8c7d4]">
              BeastOS connects your identity, goals, documents, education, money,
              health, home, and Digital Staff without turning the experience into
              a login page.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              {user ? (
                <Link
                  href="/dashboard/today"
                  className="beast-button min-h-[50px] px-6 text-center"
                >
                  Enter The Beast
                </Link>
              ) : (
                <>
                  {publicRegistrationEnabled ? (
                    <button
                      type="button"
                      className="beast-button min-h-[50px] px-6"
                      onClick={() => openAuthentication("create-account")}
                    >
                      Create Your Account
                    </button>
                  ) : null}
                  <button
                    type="button"
                    className="beast-button-secondary min-h-[50px] px-6"
                    onClick={() => openAuthentication("login")}
                  >
                    Log In
                  </button>
                </>
              )}
            </div>
          </div>

          <div className="rounded-3xl border border-white/10 bg-[#0b1626]/90 p-5 shadow-2xl sm:p-7">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-[#34d399]">
              Your Beast workspace
            </p>
            <h2 className="mt-3 text-2xl font-black">
              Focused applications. Shared understanding.
            </h2>
            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              {beastOSApplications.slice(0, 6).map((application) => (
                <div
                  key={application.id}
                  className="rounded-2xl border border-white/10 bg-[#0f1c2e] p-4"
                >
                  <p className="font-black text-white">
                    {application.productName}
                  </p>
                  <p className="mt-1 text-sm text-[#91a1b5]">
                    {application.name}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="border-y border-white/10 bg-[#0b1626] px-4 py-10 sm:px-6 lg:px-10">
        <div className="mx-auto grid max-w-7xl gap-6 md:grid-cols-3">
          {[
            [
              "One account",
              "A single Supabase-backed identity across every Beast application.",
            ],
            [
              "Member controlled",
              "Permissions, confirmation, and safe recovery stay visible and reviewable.",
            ],
            ["Built for continuity", beastOSPlatformIdentity.description],
          ].map(([title, description]) => (
            <div
              key={title}
              className="rounded-2xl border border-white/10 bg-[#07111f] p-5"
            >
              <h2 className="font-black">{title}</h2>
              <p className="mt-2 text-sm leading-6 text-[#9eafc3]">
                {description}
              </p>
            </div>
          ))}
        </div>
      </section>

      <AuthenticationDialog
        intent={authIntent}
        open={authOpen}
        onClose={() => setAuthOpen(false)}
        onAuthenticated={(nextUser) => {
          setUser(nextUser);
          setAuthOpen(false);
        }}
      />
    </main>
  );
}
