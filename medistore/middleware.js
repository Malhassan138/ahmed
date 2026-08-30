import { NextResponse } from "next/server";

const COOKIE_NAME = "medistore_token";

export function middleware(req) {
  const { pathname } = req.nextUrl;
  const isDashboard =
    !pathname.startsWith("/login") &&
    !pathname.startsWith("/api") &&
    !pathname.startsWith("/_next") &&
    pathname !== "/favicon.ico";

  const token = req.cookies.get(COOKIE_NAME)?.value;

  if (isDashboard && !token) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image).*)"],
};
