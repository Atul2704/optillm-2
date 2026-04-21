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

  // Top users by estimated cost in last 30 days.
  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const rows = await prisma.prompt.groupBy({
    by: ["userId"],
    where: { userId: { not: null }, createdAt: { gte: since } },
    _sum: { tokens: true, estimatedCost: true },
    _count: { _all: true },
    orderBy: { _sum: { estimatedCost: "desc" } },
    take: 10,
  });

  const ids = rows.map((r) => r.userId!).filter(Boolean);
  const users = await prisma.user.findMany({
    where: { id: { in: ids } },
    select: { id: true, email: true },
  });
  const emailById = new Map(users.map((u) => [u.id, u.email]));

  return NextResponse.json({
    users: rows.map((r) => ({
      email: emailById.get(r.userId!) ?? r.userId,
      tokens: r._sum.tokens ?? 0,
      costUsd: Number(r._sum.estimatedCost ?? 0),
      prompts: r._count._all,
    })),
  });
}

