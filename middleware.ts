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

  // Cron endpoints authenticate via CRON_SECRET (POST) — bypass session
  // check. GET on snapshot still falls through to the admin-session gate
  // below since /api/admin/snapshot starts with /api/admin.
  if (nextUrl.pathname === "/api/admin/sync-results") {
    return NextResponse.next();
  }
  if (nextUrl.pathname === "/api/admin/snapshot" && req.method === "POST") {
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

  // Admin gate. Skip the cron-secret-protected endpoints (already returned
  // above for the methods that use bearer auth).
  const isCronSecretEndpoint =
    nextUrl.pathname === "/api/admin/sync-results" ||
    (nextUrl.pathname === "/api/admin/snapshot" && req.method === "POST");
  if (
    (nextUrl.pathname.startsWith("/admin") || nextUrl.pathname.startsWith("/api/admin")) &&
    !isCronSecretEndpoint
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
