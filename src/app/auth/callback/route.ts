import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import type { EmailOtpType } from "@supabase/supabase-js";
import {
  BEAST_INVITATION_COOKIE,
  buildAuthLoginPath,
  getAuthErrorState,
  getSafeAuthDestination,
  isDisabledBeastUser,
} from "@/lib/auth/experience";
import { buildEmailVerificationFailurePath } from "@/lib/auth/emailWorkflows";
import { createAdminClient } from "@/lib/supabase/admin";

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
  const isEmailVerification =
    request.nextUrl.searchParams.get("flow") === "email_verification";
  const isInvitation =
    request.nextUrl.searchParams.get("flow") === "invite";
  const destination = getSafeAuthDestination(
    request.nextUrl.searchParams.get("next")
  );
  const response = NextResponse.redirect(new URL(destination, request.url));
  response.headers.set(
    "cache-control",
    "private, no-cache, no-store, must-revalidate, max-age=0"
  );

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
      isEmailVerification
        ? buildEmailVerificationFailurePath()
        : buildAuthLoginPath(destination, state)
    );
    return response;
  }

  const code = request.nextUrl.searchParams.get("code");
  const tokenHash = request.nextUrl.searchParams.get("token_hash");
  const requestedType = request.nextUrl.searchParams.get("type");
  const verificationType: EmailOtpType | null =
    requestedType === "email" ||
    requestedType === "email_change" ||
    requestedType === "invite"
      ? requestedType
      : null;

  if (isInvitation && verificationType !== "invite") {
    setRedirectLocation(
      response,
      request,
      buildAuthLoginPath(destination, "invalid_or_expired_link")
    );
    return response;
  }

  if (!code && !(tokenHash && verificationType)) {
    setRedirectLocation(
      response,
      request,
      isEmailVerification
        ? buildEmailVerificationFailurePath()
        : buildAuthLoginPath(destination, "invalid_or_expired_link")
    );
    return response;
  }

  if (!supabaseUrl || !supabaseAnonKey) {
    setRedirectLocation(
      response,
      request,
      isEmailVerification
        ? buildEmailVerificationFailurePath()
        : buildAuthLoginPath(destination, "authentication_error")
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

  const { error } =
    tokenHash && verificationType
      ? await supabase.auth.verifyOtp({
          token_hash: tokenHash,
          type: verificationType,
        })
      : await supabase.auth.exchangeCodeForSession(code as string);

  if (error) {
    setRedirectLocation(
      response,
      request,
      isEmailVerification
        ? buildEmailVerificationFailurePath()
        : buildAuthLoginPath(destination, getAuthErrorState(error))
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
      isEmailVerification
        ? buildEmailVerificationFailurePath()
        : buildAuthLoginPath(destination, getAuthErrorState(userError))
    );
    return response;
  }

  if (isDisabledBeastUser(user)) {
    await supabase.auth.signOut();
    setRedirectLocation(
      response,
      request,
      buildAuthLoginPath(destination, "account_disabled")
    );
    return response;
  }

  if (isInvitation) {
    const adminClient = createAdminClient();
    if (!adminClient) {
      await supabase.auth.signOut();
      setRedirectLocation(
        response,
        request,
        buildAuthLoginPath(destination, "authentication_error")
      );
      return response;
    }

    const { error: acceptanceError } = await adminClient.rpc(
      "accept_beast_admin_member_invitation",
      { selected_member_id: user.id }
    );
    if (acceptanceError) {
      await supabase.auth.signOut();
      setRedirectLocation(
        response,
        request,
        buildAuthLoginPath(destination, "invalid_or_expired_link")
      );
      return response;
    }

    response.cookies.set(BEAST_INVITATION_COOKIE, "authorized", {
      httpOnly: true,
      sameSite: "lax",
      secure: request.nextUrl.protocol === "https:",
      path: "/",
      maxAge: 15 * 60,
    });
    const acceptPath = new URL("/accept-invitation", request.url);
    if (destination !== "/dashboard/today") {
      acceptPath.searchParams.set("next", destination);
    }
    setRedirectLocation(response, request, `${acceptPath.pathname}${acceptPath.search}`);
  }

  return response;
}
