import { prisma } from "@/lib/prisma";

function monthStart(d = new Date()) {
  return new Date(d.getFullYear(), d.getMonth(), 1, 0, 0, 0, 0);
}

export async function checkUserMonthlyLimits(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { monthlyBudgetUsd: true, monthlyTokenLimit: true },
  });

  const defaultBudgetUsd = Number(
    globalThis.__optillmRuntimeConfig?.defaultMonthlyBudgetUsd ?? process.env.DEFAULT_MONTHLY_BUDGET_USD ?? 5,
  );
  const defaultTokenLimit = Number(
    globalThis.__optillmRuntimeConfig?.defaultMonthlyTokenLimit ?? process.env.DEFAULT_MONTHLY_TOKEN_LIMIT ?? 200_000,
  );

  const budgetUsd = user?.monthlyBudgetUsd != null ? Number(user.monthlyBudgetUsd) : defaultBudgetUsd;
  const tokenLimit = user?.monthlyTokenLimit != null ? user.monthlyTokenLimit : defaultTokenLimit;

  const start = monthStart();

  const agg = await prisma.prompt.aggregate({
    where: { userId, createdAt: { gte: start } },
    _sum: { tokens: true, estimatedCost: true },
    _count: { _all: true },
  });

  const usedTokens = agg._sum.tokens ?? 0;
  const usedCostUsd = Number(agg._sum.estimatedCost ?? 0);

  const overTokens = tokenLimit > 0 && usedTokens >= tokenLimit;
  const overBudget = budgetUsd > 0 && usedCostUsd >= budgetUsd;

  return {
    budgetUsd,
    tokenLimit,
    usedTokens,
    usedCostUsd,
    overTokens,
    overBudget,
    start,
    requestsThisMonth: agg._count._all,
  };
}

