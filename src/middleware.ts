import { NextResponse, type NextRequest } from "next/server";
import { jwtVerify } from "jose";

const SESSION_COOKIE = "optillm_session";

function parseAllowlist(raw: string | undefined) {
  return (raw ?? "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
}

async function readSessionEmail(token: string) {
  const secret = process.env.JWT_SECRET;
  if (!secret) return null;
  const key = new TextEncoder().encode(secret);
  const { payload } = await jwtVerify(token, key).catch(() => ({ payload: null as any }));
  if (!payload) return null;
  const email = payload.email;
  return typeof email === "string" ? email.toLowerCase() : null;
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (pathname.startsWith("/admin/login")) {
    return NextResponse.next();
  }

  // Protect app pages.
  if (pathname.startsWith("/dashboard") || pathname.startsWith("/analytics") || pathname.startsWith("/admin")) {
    const token = req.cookies.get(SESSION_COOKIE)?.value;
    const ok = Boolean(token);
    if (!ok) {
      const url = req.nextUrl.clone();
      url.pathname = pathname.startsWith("/admin") ? "/admin/login" : "/login";
      url.searchParams.set("next", pathname);
      return NextResponse.redirect(url);
    }

    if (pathname.startsWith("/admin")) {
      if (pathname.startsWith("/admin/access-denied")) {
        return NextResponse.next();
      }
      const allow = parseAllowlist(process.env.ADMIN_EMAILS);
      if (allow.length > 0) {
        const email = token ? await readSessionEmail(token) : null;
        const isAdmin = email ? allow.includes(email) : false;
        if (!isAdmin) {
          const url = req.nextUrl.clone();
          url.pathname = "/admin/access-denied";
          return NextResponse.redirect(url);
        }
      }
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*", "/analytics/:path*", "/admin/:path*"],
};

