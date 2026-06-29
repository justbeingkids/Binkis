import { NextRequest, NextResponse } from "next/server";
import { ADMIN_COOKIE_NAME } from "@/lib/admin-auth";
import { verifySession } from "@/lib/session";

const ADMIN_PROTECTED_PREFIXES = ["/codes", "/generate", "/verify", "/winners", "/card", "/lottery", "/account"];

function isAdminPath(pathname: string): boolean {
  if (pathname === "/") return true;
  return ADMIN_PROTECTED_PREFIXES.some((p) => pathname === p || pathname.startsWith(p + "/"));
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (!isAdminPath(pathname)) {
    return NextResponse.next();
  }

  const token = request.cookies.get(ADMIN_COOKIE_NAME)?.value;
  // Must match the secret the login route signs with (see getServerEnv):
  // prefer SESSION_SECRET, else fall back to the service-role key.
  const secret = process.env.SESSION_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY;
  const session = token && secret ? await verifySession(token, secret) : null;

  if (!session) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("from", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!api|_next|claim|v|login|favicon\\.ico|.*\\.(?:png|jpg|jpeg|svg|gif|ico|webp|css|js|woff|woff2|ttf|map)).*)",
  ],
};
