import { NextResponse } from "next/server";
import { BEAST_PASSWORD_RECOVERY_COOKIE } from "@/lib/auth/experience";

export async function POST() {
  const response = NextResponse.json({ completed: true });
  response.cookies.set({
    name: BEAST_PASSWORD_RECOVERY_COOKIE,
    value: "",
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/reset-password",
    maxAge: 0,
  });
  response.headers.set("cache-control", "private, no-store");
  return response;
}
