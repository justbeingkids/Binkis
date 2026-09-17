import { NextRequest, NextResponse } from "next/server";
import { ADMIN_COOKIE_NAME } from "@/lib/admin-auth";
import { verifySession } from "@/lib/session";

const ADMIN_PROTECTED_PREFIXES = ["/codes", "/generate", "/verify", "/winners", "/card", "/lottery", "/characters", "/account", "/escaneos", "/clientes", "/puntos"];

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
  // Must match the secret the login route signs with (see getSessionSecret). No
  // fallback: signing sessions with the service-role key meant anyone holding
  // that key could mint an admin cookie, and rotating it logged everyone out.
  const secret = process.env.SESSION_SECRET ?? "";
  const session = token && secret.length >= 32 ? await verifySession(token, secret) : null;

  if (!session) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("from", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!api|_next|claim|v/|login|favicon\\.ico|.*\\.(?:png|jpg|jpeg|svg|gif|ico|webp|css|js|woff|woff2|ttf|map)).*)",
  ],
};
