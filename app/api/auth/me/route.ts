import { NextRequest, NextResponse } from "next/server";
import { AUTH_COOKIE, getSessionUsername } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const username = getSessionUsername(req.cookies.get(AUTH_COOKIE)?.value);

  return NextResponse.json({
    authenticated: Boolean(username),
    user: username
      ? {
          username,
        }
      : null,
  });
}
