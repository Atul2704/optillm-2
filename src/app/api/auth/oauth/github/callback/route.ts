import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createSessionToken } from "@/lib/auth";
import { getBaseUrl, OAUTH_NEXT_COOKIE, OAUTH_STATE_COOKIE, sanitizeNextPath } from "@/app/api/auth/oauth/shared";

type GithubTokenResponse = {
  access_token?: string;
  error?: string;
  error_description?: string;
};

type GithubUser = {
  email?: string | null;
  name?: string | null;
};

type GithubEmail = {
  email: string;
  primary: boolean;
  verified: boolean;
};

export async function GET(req: NextRequest) {
  const clientId = process.env.GITHUB_CLIENT_ID;
  const clientSecret = process.env.GITHUB_CLIENT_SECRET;
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

  const redirectUri = `${getBaseUrl()}/api/auth/oauth/github/callback`;
  const tokenRes = await fetch("https://github.com/login/oauth/access_token", {
    method: "POST",
    headers: { "content-type": "application/json", accept: "application/json" },
    body: JSON.stringify({
      client_id: clientId,
      client_secret: clientSecret,
      code,
      redirect_uri: redirectUri,
      state,
    }),
  });
  const tokenJson = (await tokenRes.json().catch(() => null)) as GithubTokenResponse | null;
  if (!tokenRes.ok || !tokenJson?.access_token) {
    return NextResponse.redirect(`${getBaseUrl()}/login?error=oauth_token_failed`);
  }

  const userRes = await fetch("https://api.github.com/user", {
    headers: {
      Authorization: `Bearer ${tokenJson.access_token}`,
      Accept: "application/vnd.github+json",
      "User-Agent": "optillm-app",
    },
  });
  const userJson = (await userRes.json().catch(() => null)) as GithubUser | null;

  let email = userJson?.email?.toLowerCase();
  if (!email) {
    const emailRes = await fetch("https://api.github.com/user/emails", {
      headers: {
        Authorization: `Bearer ${tokenJson.access_token}`,
        Accept: "application/vnd.github+json",
        "User-Agent": "optillm-app",
      },
    });
    const emailJson = (await emailRes.json().catch(() => null)) as GithubEmail[] | null;
    const primary = (emailJson ?? []).find((e) => e.primary && e.verified);
    email = primary?.email?.toLowerCase();
  }

  if (!email) {
    return NextResponse.redirect(`${getBaseUrl()}/login?error=oauth_email_unavailable`);
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
