import NextAuth from "next-auth";
import { NextResponse } from "next/server";
import { authConfig } from "./auth.config";

const { auth } = NextAuth(authConfig);

export default auth((req) => {
  const { nextUrl } = req;
  const session = req.auth;

  const isPublicPath =
    nextUrl.pathname === "/" ||
    nextUrl.pathname === "/login" ||
    nextUrl.pathname === "/register" ||
    nextUrl.pathname === "/api/health" ||
    nextUrl.pathname.startsWith("/api/auth") ||
    nextUrl.pathname.startsWith("/api/register");

  // Cron endpoint authenticates via CRON_SECRET — bypass session check
  if (nextUrl.pathname === "/api/admin/sync-results") {
    return NextResponse.next();
  }

  // Unauthenticated users can only access public paths
  if (!session && !isPublicPath) {
    return NextResponse.redirect(new URL("/login", nextUrl));
  }

  // Authenticated users redirected away from auth pages
  if (session && (nextUrl.pathname === "/login" || nextUrl.pathname === "/register")) {
    return NextResponse.redirect(new URL("/clasament", nextUrl));
  }

  // Admin gate
  if (
    (nextUrl.pathname.startsWith("/admin") || nextUrl.pathname.startsWith("/api/admin")) &&
    nextUrl.pathname !== "/api/admin/sync-results"
  ) {
    if (!session?.user?.isAdmin) {
      return NextResponse.redirect(new URL("/clasament", nextUrl));
    }
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
