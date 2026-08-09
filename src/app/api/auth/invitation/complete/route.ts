import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { BEAST_INVITATION_COOKIE } from "@/lib/auth/experience";
import { createAdminClient } from "@/lib/supabase/admin";
import { createRouteClient } from "@/lib/supabase/server";

export async function POST() {
  if ((await cookies()).get(BEAST_INVITATION_COOKIE)?.value !== "authorized") {
    return NextResponse.json(
      { error: "The invitation session is no longer available." },
      { status: 401 }
    );
  }

  const routeClient = createRouteClient();
  const {
    data: { user },
    error,
  } = await routeClient.auth.getUser();

  if (error || !user) {
    return NextResponse.json(
      { error: "The invitation session is no longer available." },
      { status: 401 }
    );
  }

  const adminClient = createAdminClient();
  if (!adminClient) {
    return NextResponse.json(
      { error: "Invitation completion is not configured." },
      { status: 503 }
    );
  }

  const { error: acceptanceError } = await adminClient.rpc(
    "accept_beast_admin_member_invitation",
    { selected_member_id: user.id }
  );
  if (acceptanceError) {
    return NextResponse.json(
      { error: "BeastOS could not complete this invitation." },
      { status: 409 }
    );
  }

  const response = NextResponse.json(
    { message: "Invitation accepted." },
    { headers: { "Cache-Control": "no-store" } }
  );
  response.cookies.set(BEAST_INVITATION_COOKIE, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });
  return response;
}
