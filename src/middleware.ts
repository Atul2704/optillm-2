import { NextResponse, type NextRequest } from "next/server";

const SESSION_COOKIE = "optillm_session";

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Protect app pages.
  if (pathname.startsWith("/dashboard") || pathname.startsWith("/analytics")) {
    const ok = Boolean(req.cookies.get(SESSION_COOKIE)?.value);
    if (!ok) {
      const url = req.nextUrl.clone();
      url.pathname = "/login";
      url.searchParams.set("next", pathname);
      return NextResponse.redirect(url);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*", "/analytics/:path*"],
};

