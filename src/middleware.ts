import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import {
  buildAuthLoginPath,
  getAuthErrorState,
  getSafeAuthDestination,
  isDisabledBeastUser,
} from "@/lib/auth/experience";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export async function middleware(request: NextRequest) {
  if (!supabaseUrl || !supabaseAnonKey) {
    return NextResponse.next();
  }

  const hadSessionCookie = request.cookies
    .getAll()
    .some(({ name }) => /^sb-.+-auth-token(?:\.\d+)?$/.test(name));
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
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
  matcher: ["/dashboard/:path*", "/login"],
};
