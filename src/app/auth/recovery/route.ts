import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import {
  BEAST_PASSWORD_RECOVERY_COOKIE,
  buildAuthLoginPath,
  buildResetPasswordPath,
  getAuthErrorState,
  getSafeAuthDestination,
  isDisabledBeastUser,
  isPasswordSignInEnabled,
} from "@/lib/auth/experience";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

function setRedirectLocation(
  response: NextResponse,
  request: NextRequest,
  path: string
) {
  response.headers.set("location", new URL(path, request.url).toString());
}

export async function GET(request: NextRequest) {
  const destination = getSafeAuthDestination(
    request.nextUrl.searchParams.get("next")
  );
  const response = NextResponse.redirect(
    new URL(buildResetPasswordPath(destination), request.url)
  );
  response.headers.set(
    "cache-control",
    "private, no-cache, no-store, must-revalidate, max-age=0"
  );

  if (
    !isPasswordSignInEnabled(
      process.env.NEXT_PUBLIC_BEAST_PASSWORD_SIGN_IN_ENABLED
    )
  ) {
    setRedirectLocation(response, request, buildAuthLoginPath(destination));
    return response;
  }

  const providerError = request.nextUrl.searchParams.get("error_code");
  const providerDescription =
    request.nextUrl.searchParams.get("error_description");

  if (providerError || providerDescription) {
    const state = getAuthErrorState({
      code: providerError,
      message: providerDescription,
    });
    setRedirectLocation(
      response,
      request,
      state === "account_suspended" || state === "account_disabled"
        ? buildAuthLoginPath(destination, state)
        : buildResetPasswordPath(destination, "invalid_or_expired_link")
    );
    return response;
  }

  const code = request.nextUrl.searchParams.get("code");

  if (!code) {
    setRedirectLocation(
      response,
      request,
      buildResetPasswordPath(destination, "invalid_or_expired_link")
    );
    return response;
  }

  if (!supabaseUrl || !supabaseAnonKey) {
    setRedirectLocation(
      response,
      request,
      buildResetPasswordPath(destination, "authentication_error")
    );
    return response;
  }

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet, headers) {
        cookiesToSet.forEach(({ name, value, options }) => {
          response.cookies.set(name, value, options);
        });
        Object.entries(headers).forEach(([name, value]) => {
          response.headers.set(name, value);
        });
      },
    },
  });

  const { data, error } = await supabase.auth.exchangeCodeForSession(code);
  const redirectType = (
    data as (typeof data & { redirectType?: string | null }) | null
  )?.redirectType;

  if (error) {
    setRedirectLocation(
      response,
      request,
      buildResetPasswordPath(destination, "invalid_or_expired_link")
    );
    return response;
  }

  if (redirectType !== "recovery") {
    await supabase.auth.signOut({ scope: "local" });
    setRedirectLocation(
      response,
      request,
      buildResetPasswordPath(destination, "invalid_or_expired_link")
    );
    return response;
  }

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    setRedirectLocation(
      response,
      request,
      buildResetPasswordPath(destination, "invalid_or_expired_link")
    );
    return response;
  }

  if (isDisabledBeastUser(user)) {
    await supabase.auth.signOut({ scope: "local" });
    setRedirectLocation(
      response,
      request,
      buildAuthLoginPath(destination, "account_disabled")
    );
    return response;
  }

  response.cookies.set({
    name: BEAST_PASSWORD_RECOVERY_COOKIE,
    value: "authorized",
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/reset-password",
    maxAge: 10 * 60,
  });

  return response;
}
