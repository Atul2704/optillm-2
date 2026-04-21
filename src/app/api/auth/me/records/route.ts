import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ user: null, records: [] }, { status: 200 });

    const records = await prisma.prompt.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      take: 80,
      select: {
        id: true,
        createdAt: true,
        promptText: true,
        modelUsed: true,
        complexity: true,
        tokens: true,
        estimatedCost: true,
        strategy: true,
        cacheHit: true,
      },
    });

    const totals = records.reduce(
      (acc, r) => {
        acc.prompts += 1;
        acc.tokens += r.tokens;
        acc.costUsd += Number(r.estimatedCost);
        return acc;
      },
      { prompts: 0, tokens: 0, costUsd: 0 },
    );

    const groupedMap = new Map<
      string,
      {
        promptText: string;
        count: number;
        latestCreatedAt: Date;
        totalTokens: number;
        totalEstimatedCostUsd: number;
        modelUsage: Record<string, number>;
      }
    >();

    for (const r of records) {
      const key = r.promptText.trim().toLowerCase();
      const existing = groupedMap.get(key);
      if (existing) {
        existing.count += 1;
        if (r.createdAt > existing.latestCreatedAt) existing.latestCreatedAt = r.createdAt;
        existing.totalTokens += r.tokens;
        existing.totalEstimatedCostUsd += Number(r.estimatedCost);
        existing.modelUsage[r.modelUsed] = (existing.modelUsage[r.modelUsed] ?? 0) + 1;
      } else {
        groupedMap.set(key, {
          promptText: r.promptText,
          count: 1,
          latestCreatedAt: r.createdAt,
          totalTokens: r.tokens,
          totalEstimatedCostUsd: Number(r.estimatedCost),
          modelUsage: { [r.modelUsed]: 1 },
        });
      }
    }

    const groupedRecords = Array.from(groupedMap.values())
      .sort((a, b) => b.latestCreatedAt.getTime() - a.latestCreatedAt.getTime())
      .slice(0, 20);

    return NextResponse.json({
      user,
      totals,
      groupedRecords,
      records: records.map((r) => ({
        ...r,
        promptText: r.promptText,
        estimatedCostUsd: Number(r.estimatedCost),
      })),
    });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
