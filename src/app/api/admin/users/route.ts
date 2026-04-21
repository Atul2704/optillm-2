import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin";

export async function GET() {
  const admin = await requireAdmin();
  if (!admin.ok) {
    return NextResponse.json(
      { error: admin.reason === "unauthorized" ? "Unauthorized" : "Forbidden" },
      { status: admin.reason === "unauthorized" ? 401 : 403 },
    );
  }

  const users = await prisma.user.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      email: true,
      createdAt: true,
      monthlyBudgetUsd: true,
      monthlyTokenLimit: true,
      _count: { select: { prompts: true } },
    },
    take: 500,
  });

  return NextResponse.json({
    users: users.map((u) => ({
      id: u.id,
      email: u.email,
      createdAt: u.createdAt,
      monthlyBudgetUsd: u.monthlyBudgetUsd != null ? Number(u.monthlyBudgetUsd) : null,
      monthlyTokenLimit: u.monthlyTokenLimit ?? null,
      prompts: u._count.prompts,
    })),
  });
}

