import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import {
  getModuleRegistryEntry,
  type BeastModuleIdentifier,
} from "@/lib/moduleRegistry";
import { resolveMemberModuleEntitlement } from "@/lib/memberAgeEntitlements";
import { getConfigurationBoundary, resolveSupabasePublicConfiguration } from "@/lib/supabase/config";
import {
  buildAuthLoginPath,
  getAuthErrorState,
  getSafeAuthDestination,
  isDisabledBeastUser,
} from "@/lib/auth/experience";

export async function middleware(request: NextRequest) {
  if (request.nextUrl.pathname === "/api/session/status") {
    return NextResponse.next();
  }

  const configuration = resolveSupabasePublicConfiguration({
    url: process.env.NEXT_PUBLIC_SUPABASE_URL,
    publicKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  });
  if (!configuration.ok) {
    const boundary = getConfigurationBoundary(request.nextUrl.pathname);
    if (boundary === "public") return NextResponse.next();
    const unavailable = boundary === "api"
      ? NextResponse.json({ error: "This service is temporarily unavailable. Please try again shortly." }, { status: 503 })
      : new NextResponse("This workspace is temporarily unavailable. Please try again shortly.", { status: 503 });
    unavailable.headers.set("cache-control", "private, no-cache, no-store, must-revalidate, max-age=0");
    return unavailable;
  }

  const hadSessionCookie = request.cookies
    .getAll()
    .some(({ name }) => /^sb-.+-auth-token(?:\.\d+)?$/.test(name));
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const supabase = createServerClient(configuration.configuration.url, configuration.configuration.publicKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet, headers) {
        cookiesToSet.forEach(({ name, value }) => {
          request.cookies.set(name, value);
        });
        response = NextResponse.next({
          request: {
            headers: request.headers,
          },
        });
        cookiesToSet.forEach(({ name, value, options }) => {
          response.cookies.set(name, value, options);
        });
        Object.entries(headers).forEach(([name, value]) => {
          response.headers.set(name, value);
        });
      },
    },
  });

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  const isDashboardRoute = request.nextUrl.pathname.startsWith("/dashboard");
  const isLoginRoute = request.nextUrl.pathname === "/login";
  const isApiRoute = request.nextUrl.pathname.startsWith("/api/");
  const isPublicAuthApiRoute =
    request.nextUrl.pathname.startsWith("/api/auth/");

  function redirect(path: string) {
    const redirectResponse = NextResponse.redirect(new URL(path, request.url));
    response.cookies.getAll().forEach((cookie) => {
      redirectResponse.cookies.set(cookie);
    });
    redirectResponse.headers.set(
      "cache-control",
      "private, no-cache, no-store, must-revalidate, max-age=0"
    );
    return redirectResponse;
  }

  if (user && isDisabledBeastUser(user)) {
    await supabase.auth.signOut();
    return redirect(
      buildAuthLoginPath(
        `${request.nextUrl.pathname}${request.nextUrl.search}`,
        "account_disabled"
      )
    );
  }

  if (
    user &&
    (isDashboardRoute || (isApiRoute && !isPublicAuthApiRoute))
  ) {
    const { data: sessionAllowed, error: sessionControlError } =
      await supabase.rpc("is_current_beast_session_allowed");

    if (!sessionControlError && sessionAllowed === false) {
      await supabase.auth.signOut({ scope: "global" });
      if (isApiRoute) {
        const apiResponse = NextResponse.json(
          {
            error:
              "Your account requires a fresh sign-in before this request can continue.",
          },
          { status: 401 }
        );
        response.cookies.getAll().forEach((cookie) => {
          apiResponse.cookies.set(cookie);
        });
        apiResponse.headers.set(
          "cache-control",
          "private, no-cache, no-store, must-revalidate, max-age=0"
        );
        return apiResponse;
      }

      return redirect(
        buildAuthLoginPath(
          `${request.nextUrl.pathname}${request.nextUrl.search}`,
          "session_expired"
        )
      );
    }
  }

  if (user && (isDashboardRoute || (isApiRoute && !isPublicAuthApiRoute))) {
    const gatedModule = request.nextUrl.pathname.match(
      /(?:^|\/)(?:dashboard\/|api\/)(money|health|home)(?:\/|$)/
    )?.[1];
    if (gatedModule) {
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("role,birthday")
        .eq("id", user.id)
        .maybeSingle();
      const isAdmin = profile?.role === "admin";
      const decision = profile
        ? resolveMemberModuleEntitlement({
            module: gatedModule as BeastModuleIdentifier,
            birthday: profile.birthday,
            isAdmin,
            entry: getModuleRegistryEntry(gatedModule as BeastModuleIdentifier),
          })
        : null;
      if (
        profileError ||
        !profile ||
        !decision?.allowed
      ) {
        if (isApiRoute) {
          return NextResponse.json(
            { error: "This workspace is unavailable for the current member profile." },
            { status: profileError || !profile ? 503 : 403 }
          );
        }
        return redirect("/dashboard/education");
      }
    }
  }

  if (isDashboardRoute && (!user || error)) {
    const destination = `${request.nextUrl.pathname}${request.nextUrl.search}`;
    const state = hadSessionCookie
      ? getAuthErrorState(error)
      : error?.code === "user_banned"
        ? "account_suspended"
        : null;

    return redirect(buildAuthLoginPath(destination, state));
  }

  if (
    isLoginRoute &&
    user &&
    !request.nextUrl.searchParams.get("state")
  ) {
    return redirect(
      getSafeAuthDestination(request.nextUrl.searchParams.get("next"))
    );
  }

  return response;
}

export const config = {
  matcher: ["/dashboard/:path*", "/login", "/api/:path*"],
};
