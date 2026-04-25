import { NextRequest, NextResponse } from "next/server";
import { verifyPassword, createSessionToken, setSessionCookie } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const LoginSchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(8),
});

export async function POST(req: NextRequest) {
  try {
    const payload = await req.json().catch(() => null);
    const parsed = LoginSchema.safeParse(payload);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid email or password format" }, { status: 400 });
    }
    const { email, password } = parsed.data;
    const normalizedEmail = email.toLowerCase();

    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (!user || !user.passwordHash) {
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
    }

    const validPassword = await verifyPassword(password, user.passwordHash);
    if (!validPassword) {
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
    }

    // Create session token
    const sessionToken = await createSessionToken({ sub: user.id, email: user.email });

    const response = NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
      },
    });
    await setSessionCookie(sessionToken);

    return response;
  } catch (error) {
    console.error("Login error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}