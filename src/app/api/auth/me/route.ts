import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getUserRole } from "@/lib/admin";

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ user: null }, { status: 200 });
    }
    const role = await getUserRole(user.email);

    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        role,
      },
    });
  } catch (error) {
    console.error("Me error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}