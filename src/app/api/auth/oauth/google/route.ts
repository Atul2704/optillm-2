import { NextRequest, NextResponse } from "next/server";
import { getBaseUrl, OAUTH_NEXT_COOKIE, OAUTH_STATE_COOKIE, randomState, sanitizeNextPath } from "@/app/api/auth/oauth/shared";

export async function GET(req: NextRequest) {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  if (!clientId) {
    return NextResponse.json({ error: "Google OAuth is not configured" }, { status: 503 });
  }

  const next = sanitizeNextPath(req.nextUrl.searchParams.get("next"));
  const state = randomState();
  const baseUrl = getBaseUrl();
  const redirectUri = `${baseUrl}/api/auth/oauth/google/callback`;

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: "openid email profile",
    state,
    prompt: "select_account",
  });

  const redirect = NextResponse.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`);
  redirect.cookies.set(OAUTH_STATE_COOKIE, state, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 10,
  });
  redirect.cookies.set(OAUTH_NEXT_COOKIE, next, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 10,
  });
  return redirect;
}
