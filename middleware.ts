import { NextRequest, NextResponse } from "next/server";
import { AUTH_COOKIE, isValidSession } from "./lib/auth";

function isAuthenticated(req: NextRequest) {
  return isValidSession(req.cookies.get(AUTH_COOKIE)?.value);
}

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const authenticated = isAuthenticated(req);

  if (pathname === "/login" && authenticated) {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }

  if (pathname.startsWith("/dashboard") && !authenticated) {
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("next", pathname);

    return NextResponse.redirect(loginUrl);
  }

  if (pathname === "/api/generate" && !authenticated) {
    return new Response("Please log in first.", {
      status: 401,
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-store",
      },
    });
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*", "/api/generate", "/login"],
};
