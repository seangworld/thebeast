import { NextRequest, NextResponse } from "next/server";
import {
  isSharedSessionOriginAllowed,
  sharedSessionCorsHeaders,
  sharedSessionResponse,
} from "@/lib/auth/sharedSession";
import { isDisabledBeastUser } from "@/lib/auth/experience";
import { createRouteClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const privateHeaders = {
  "cache-control": "private, no-cache, no-store, must-revalidate, max-age=0",
};

function rejectedOrigin() {
  return new NextResponse(null, {
    status: 403,
    headers: privateHeaders,
  });
}

export function OPTIONS(request: NextRequest) {
  const origin = request.headers.get("origin");
  if (!isSharedSessionOriginAllowed(origin)) return rejectedOrigin();

  return new NextResponse(null, {
    status: 204,
    headers: {
      ...sharedSessionCorsHeaders(origin!),
      ...privateHeaders,
    },
  });
}

export async function GET(request: NextRequest) {
  const origin = request.headers.get("origin");
  if (!isSharedSessionOriginAllowed(origin)) return rejectedOrigin();

  let authenticated = false;

  try {
    const supabase = createRouteClient();
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (user && !error && !isDisabledBeastUser(user)) {
      const { data: sessionAllowed, error: sessionControlError } =
        await supabase.rpc("is_current_beast_session_allowed");
      authenticated = !sessionControlError && sessionAllowed === true;
    }
  } catch {
    // Authentication detection fails closed without delaying public navigation.
  }

  return NextResponse.json(sharedSessionResponse(authenticated), {
    headers: {
      ...sharedSessionCorsHeaders(origin!),
      ...privateHeaders,
    },
  });
}
