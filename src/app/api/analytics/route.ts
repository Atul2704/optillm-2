import { NextResponse, NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { estimateCostUsd, estimateCostUsdForProvider } from "@/lib/costCalculator";
import { getCurrentUser } from "@/lib/auth";
import type { AiProvider } from "@/lib/ai/types";

function toDayKey(d: Date) {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function parseDateRange(searchParams: URLSearchParams) {
  const startDate = searchParams.get("startDate");
  const endDate = searchParams.get("endDate");

  const start = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const end = endDate ? new Date(endDate) : new Date();

  // Ensure valid dates
  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    return { start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), end: new Date() };
  }

  return { start, end };
}

export async function GET(request: NextRequest) {
  const user = await getCurrentUser();

  const { searchParams } = new URL(request.url);
  const { start, end } = parseDateRange(searchParams);
  const format = searchParams.get("format");
  const scope = searchParams.get("scope");
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const useGlobalScope = scope === "global";
  const baseWhere = useGlobalScope
    ? { createdAt: { gte: start, lte: end } }
    : { userId: user.id, createdAt: { gte: start, lte: end } };

  const recent = await prisma.prompt.findMany({
    where: baseWhere,
    orderBy: { createdAt: "desc" },
    take: 10000, // Increased for better analytics
    select: {
      createdAt: true,
      promptText: true,
      modelUsed: true,
      complexity: true,
      tokens: true,
      inputTokens: true,
      outputTokens: true,
      estimatedCost: true,
      provider: true,
      rawModel: true,
      strategy: true,
      confidence: true,
      cacheHit: true,
      fallbackReason: true,
    },
  });
  const realRecent = recent.filter((p) => p.provider !== "mock");
  const totalPrompts = realRecent.length;

  const modelUsage: Record<string, number> = {};
  const modelTokens: Record<string, number> = {};
  const modelCostUsd: Record<string, number> = {};
  const providerUsage: Record<string, number> = {};
  const complexityUsage: Record<string, number> = {};
  const strategyUsage: Record<string, number> = {};
  const fallbackUsage: Record<string, number> = {};
  const responseTimeStats: { total: number; count: number; avg: number } = { total: 0, count: 0, avg: 0 };
  let cacheHits = 0;
  let totalTokens = 0;
  let totalInputTokens = 0;
  let totalOutputTokens = 0;
  let totalActualCostUsd = 0;
  let totalGpt4oCostUsd = 0;
  let successCount = 0;
  let errorCount = 0;

  const days: Record<string, {
    day: string;
    actual: number;
    gpt4o: number;
    savings: number;
    prompts: number;
    tokens: number;
    avgResponseTime: number;
  }> = {};

  function normalizeProvider(provider: string | null): AiProvider {
    if (provider === "openai") return "openai";
    if (provider === "openai-compatible") return "openai-compatible";
    if (provider === "anthropic") return "anthropic";
    if (provider === "google") return "google";
    if (provider === "mistral") return "mistral";
    return "mock";
  }

  for (const p of realRecent) {
    modelUsage[p.modelUsed] = (modelUsage[p.modelUsed] ?? 0) + 1;
    complexityUsage[p.complexity] = (complexityUsage[p.complexity] ?? 0) + 1;
    strategyUsage[p.strategy] = (strategyUsage[p.strategy] ?? 0) + 1;
    if (p.provider) providerUsage[p.provider] = (providerUsage[p.provider] ?? 0) + 1;
    if (p.cacheHit) cacheHits += 1;
    if (p.fallbackReason) {
      fallbackUsage[p.fallbackReason] = (fallbackUsage[p.fallbackReason] ?? 0) + 1;
      errorCount += 1;
    } else {
      successCount += 1;
    }

    totalTokens += p.tokens;
    totalInputTokens += p.inputTokens || 0;
    totalOutputTokens += p.outputTokens || 0;
    const actual = estimateCostUsdForProvider(
      p.modelUsed,
      normalizeProvider(p.provider),
      p.tokens,
      p.inputTokens || 0,
      p.outputTokens || 0,
    );
    modelTokens[p.modelUsed] = (modelTokens[p.modelUsed] ?? 0) + p.tokens;
    modelCostUsd[p.modelUsed] = (modelCostUsd[p.modelUsed] ?? 0) + actual;
    const gpt4o = estimateCostUsd("GPT_4O", p.tokens);

    totalActualCostUsd += actual;
    totalGpt4oCostUsd += gpt4o;

    const day = toDayKey(p.createdAt);
    const bucket = (days[day] ??= {
      day,
      actual: 0,
      gpt4o: 0,
      savings: 0,
      prompts: 0,
      tokens: 0,
      avgResponseTime: 0
    });
    bucket.actual += actual;
    bucket.gpt4o += gpt4o;
    bucket.savings += Math.max(0, gpt4o - actual);
    bucket.prompts += 1;
    bucket.tokens += p.tokens;
  }

  const totalSavingsUsd = Math.max(0, totalGpt4oCostUsd - totalActualCostUsd);
  const totalSavingsPercent = totalGpt4oCostUsd > 0 ? (totalSavingsUsd / totalGpt4oCostUsd) * 100 : 0;
  const latestRealPrompt = realRecent[0] ?? null;
  const latestActualCostUsd = latestRealPrompt ? Number(latestRealPrompt.estimatedCost) : 0;
  const avgActualCostUsd = totalPrompts > 0 ? totalActualCostUsd / totalPrompts : 0;
  const cacheHitRate = realRecent.length ? cacheHits / realRecent.length : 0;
  const successRate = realRecent.length ? successCount / realRecent.length : 0;
  const now = Date.now();
  const last5MinPrompts = realRecent.filter((p) => now - p.createdAt.getTime() <= 5 * 60 * 1000).length;
  const last15MinPrompts = realRecent.filter((p) => now - p.createdAt.getTime() <= 15 * 60 * 1000).length;
  const last60MinPrompts = realRecent.filter((p) => now - p.createdAt.getTime() <= 60 * 60 * 1000).length;
  const promptsPerMinute = Number((last15MinPrompts / 15).toFixed(2));
  const recentEvents = realRecent.slice(0, 20).map((p) => ({
    createdAt: p.createdAt.toISOString(),
    promptText: p.promptText,
    modelUsed: p.modelUsed,
    complexity: p.complexity,
    provider: p.provider,
    tokens: p.tokens,
    estimatedCostUsd: Number(p.estimatedCost),
    strategy: p.strategy,
    cacheHit: p.cacheHit,
    fallbackReason: p.fallbackReason,
  }));

  const savingsSeries = Object.values(days).sort((a, b) => a.day.localeCompare(b.day));
  const groupedPromptMap = new Map<
    string,
    { promptText: string; count: number; latestAt: Date; totalCostUsd: number; modelUsage: Record<string, number> }
  >();
  for (const p of realRecent) {
    const key = p.promptText.trim().toLowerCase();
    const existing = groupedPromptMap.get(key);
    const actual = estimateCostUsdForProvider(
      p.modelUsed,
      normalizeProvider(p.provider),
      p.tokens,
      p.inputTokens || 0,
      p.outputTokens || 0,
    );
    if (existing) {
      existing.count += 1;
      if (p.createdAt > existing.latestAt) existing.latestAt = p.createdAt;
      existing.totalCostUsd += actual;
      existing.modelUsage[p.modelUsed] = (existing.modelUsage[p.modelUsed] ?? 0) + 1;
    } else {
      groupedPromptMap.set(key, {
        promptText: p.promptText,
        count: 1,
        latestAt: p.createdAt,
        totalCostUsd: actual,
        modelUsage: { [p.modelUsed]: 1 },
      });
    }
  }
  const groupedPrompts = Array.from(groupedPromptMap.values())
    .sort((a, b) => b.count - a.count || b.latestAt.getTime() - a.latestAt.getTime())
    .slice(0, 12)
    .map((g) => ({
      ...g,
      latestAt: g.latestAt.toISOString(),
    }));

  const analyticsData = {
    totalPrompts,
    totalTokens,
    totalInputTokens,
    totalOutputTokens,
    modelUsage,
    modelTokens,
    modelCostUsd,
    providerUsage,
    complexityUsage,
    strategyUsage,
    fallbackUsage,
    cacheHitRate,
    successRate,
    responseTimeStats,
    totalActualCostUsd,
    latestActualCostUsd,
    avgActualCostUsd,
    totalGpt4oCostUsd,
    totalSavingsUsd,
    totalSavingsPercent,
    savingsSeries,
    dateRange: { start: start.toISOString(), end: end.toISOString() },
    scope: useGlobalScope ? "global" : "user",
    realtime: {
      last5MinPrompts,
      last15MinPrompts,
      last60MinPrompts,
      promptsPerMinute,
    },
    recentEvents,
    groupedPrompts,
  };

  // Handle export formats
  if (format === "csv") {
    const csvHeaders = [
      "Date",
      "Prompts",
      "Tokens",
      "Actual Cost",
      "GPT-4o Cost",
      "Savings",
      "Savings %"
    ].join(",");

    const csvRows = savingsSeries.map(day =>
      [
        day.day,
        day.prompts,
        day.tokens,
        day.actual.toFixed(6),
        day.gpt4o.toFixed(6),
        day.savings.toFixed(6),
        ((day.savings / day.gpt4o) * 100).toFixed(2)
      ].join(",")
    );

    const csvContent = [csvHeaders, ...csvRows].join("\n");

    return new NextResponse(csvContent, {
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": `attachment; filename="analytics_${start.toISOString().split('T')[0]}_${end.toISOString().split('T')[0]}.csv"`
      }
    });
  }

  if (format === "json") {
    return new NextResponse(JSON.stringify(analyticsData, null, 2), {
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename="analytics_${start.toISOString().split('T')[0]}_${end.toISOString().split('T')[0]}.json"`
      }
    });
  }

  return NextResponse.json(analyticsData);
}

