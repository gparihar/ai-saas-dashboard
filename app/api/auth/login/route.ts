import { NextResponse } from "next/server";
import { AUTH_COOKIE, createSessionToken } from "@/lib/auth";

type LoginBody = {
  username?: string;
  password?: string;
};

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export async function POST(req: Request) {
  const body = (await req.json()) as LoginBody;
  const username = body.username?.trim().toLowerCase() || "";
  const password = body.password || "";

  if (!isValidEmail(username)) {
    return NextResponse.json(
      { error: "Enter a valid email address." },
      { status: 400 }
    );
  }

  if (password.length < 6) {
    return NextResponse.json(
      { error: "Password must be at least 6 characters." },
      { status: 400 }
    );
  }

  const response = NextResponse.json({
    user: {
      username,
    },
  });

  response.cookies.set({
    name: AUTH_COOKIE,
    value: createSessionToken(username),
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });

  return response;
}
