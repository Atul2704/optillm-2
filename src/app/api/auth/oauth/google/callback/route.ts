import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createSessionToken } from "@/lib/auth";
import { getBaseUrl, OAUTH_NEXT_COOKIE, OAUTH_STATE_COOKIE, sanitizeNextPath } from "@/app/api/auth/oauth/shared";

type GoogleTokenResponse = {
  access_token?: string;
  id_token?: string;
  error?: string;
  error_description?: string;
};

type GoogleUserInfo = {
  email?: string;
  name?: string;
  verified_email?: boolean;
};

export async function GET(req: NextRequest) {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    return NextResponse.redirect(`${getBaseUrl()}/login?error=oauth_not_configured`);
  }

  const code = req.nextUrl.searchParams.get("code");
  const state = req.nextUrl.searchParams.get("state");
  const expectedState = req.cookies.get(OAUTH_STATE_COOKIE)?.value;
  const next = sanitizeNextPath(req.cookies.get(OAUTH_NEXT_COOKIE)?.value);
  if (!code || !state || !expectedState || state !== expectedState) {
    return NextResponse.redirect(`${getBaseUrl()}/login?error=oauth_state_invalid`);
  }

  const redirectUri = `${getBaseUrl()}/api/auth/oauth/google/callback`;
  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    }),
  });
  const tokenJson = (await tokenRes.json().catch(() => null)) as GoogleTokenResponse | null;
  if (!tokenRes.ok || !tokenJson?.access_token) {
    return NextResponse.redirect(`${getBaseUrl()}/login?error=oauth_token_failed`);
  }

  const userRes = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
    headers: { Authorization: `Bearer ${tokenJson.access_token}` },
  });
  const userJson = (await userRes.json().catch(() => null)) as GoogleUserInfo | null;
  const email = userJson?.email?.toLowerCase();
  if (!userRes.ok || !email) {
    return NextResponse.redirect(`${getBaseUrl()}/login?error=oauth_userinfo_failed`);
  }

  const existing = await prisma.user.findUnique({
    where: { email },
    select: { id: true, email: true },
  });
  const user =
    existing ??
    (await prisma.user
      .create({
        data: {
          email,
          ...( { fullName: userJson?.name ?? null } as Record<string, unknown> ),
        } as any,
        select: { id: true, email: true },
      })
      .catch(() =>
        prisma.user.create({
          data: { email },
          select: { id: true, email: true },
        }),
      ));

  const sessionToken = await createSessionToken({ sub: user.id, email: user.email });
  const res = NextResponse.redirect(`${getBaseUrl()}${next}`);
  res.cookies.set("optillm_session", sessionToken, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
  res.cookies.set(OAUTH_STATE_COOKIE, "", { path: "/", maxAge: 0 });
  res.cookies.set(OAUTH_NEXT_COOKIE, "", { path: "/", maxAge: 0 });
  return res;
}
