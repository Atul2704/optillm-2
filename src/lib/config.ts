import { prisma } from "@/lib/prisma";

export type AppConfigShape = {
  abTestEnabled: boolean;
  abWeightCostAware: number;
  abWeightAlwaysGpt4o: number;
  abWeightConservative: number;
  rateLimitPerMinute: number;
  cacheTtlMs: number;
  defaultMonthlyBudgetUsd: number;
  defaultMonthlyTokenLimit: number;
  gpt4oInputPer1m: number;
  gpt4oOutputPer1m: number;
  llama3InputPer1m: number;
  llama3OutputPer1m: number;
  phi3InputPer1m: number;
  phi3OutputPer1m: number;
  claudeInputPer1m: number;
  claudeOutputPer1m: number;
  claudeHaikuInputPer1m: number;
  claudeHaikuOutputPer1m: number;
  geminiProInputPer1m: number;
  geminiProOutputPer1m: number;
  geminiFlashInputPer1m: number;
  geminiFlashOutputPer1m: number;
  mistralLargeInputPer1m: number;
  mistralLargeOutputPer1m: number;
  mistralMediumInputPer1m: number;
  mistralMediumOutputPer1m: number;
  mistralSmallInputPer1m: number;
  mistralSmallOutputPer1m: number;
  slackWebhookUrl: string | null;
  dailySpendAlertUsd: number | null;
  fallbackRateAlertPercent: number | null;
};

let cached: { value: AppConfigShape; expiresAt: number } | null = null;
const CACHE_MS = 5000;

function clampInt(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, Math.floor(n)));
}

export async function getAppConfig(): Promise<AppConfigShape> {
  const now = Date.now();
  if (cached && cached.expiresAt > now) return cached.value;

  const row = await prisma.appConfig.upsert({
    where: { id: "singleton" },
    update: {},
    create: { id: "singleton" },
  });

  const value: AppConfigShape = {
    abTestEnabled: Boolean(row.abTestEnabled),
    abWeightCostAware: clampInt(row.abWeightCostAware, 0, 100),
    abWeightAlwaysGpt4o: clampInt(row.abWeightAlwaysGpt4o, 0, 100),
    abWeightConservative: clampInt(row.abWeightConservative, 0, 100),
    rateLimitPerMinute: clampInt(row.rateLimitPerMinute, 1, 10_000),
    cacheTtlMs: clampInt(row.cacheTtlMs, 0, 60 * 60 * 1000),
    defaultMonthlyBudgetUsd: Number(row.defaultMonthlyBudgetUsd),
    defaultMonthlyTokenLimit: clampInt(row.defaultMonthlyTokenLimit, 0, 1_000_000_000),
    gpt4oInputPer1m: Number(row.gpt4oInputPer1m),
    gpt4oOutputPer1m: Number(row.gpt4oOutputPer1m),
    llama3InputPer1m: Number(row.llama3InputPer1m),
    llama3OutputPer1m: Number(row.llama3OutputPer1m),
    phi3InputPer1m: Number(row.phi3InputPer1m),
    phi3OutputPer1m: Number(row.phi3OutputPer1m),
    claudeInputPer1m: Number(row.claudeInputPer1m),
    claudeOutputPer1m: Number(row.claudeOutputPer1m),
    claudeHaikuInputPer1m: Number(row.claudeHaikuInputPer1m),
    claudeHaikuOutputPer1m: Number(row.claudeHaikuOutputPer1m),
    geminiProInputPer1m: Number(row.geminiProInputPer1m),
    geminiProOutputPer1m: Number(row.geminiProOutputPer1m),
    geminiFlashInputPer1m: Number(row.geminiFlashInputPer1m),
    geminiFlashOutputPer1m: Number(row.geminiFlashOutputPer1m),
    mistralLargeInputPer1m: Number(row.mistralLargeInputPer1m),
    mistralLargeOutputPer1m: Number(row.mistralLargeOutputPer1m),
    mistralMediumInputPer1m: Number(row.mistralMediumInputPer1m),
    mistralMediumOutputPer1m: Number(row.mistralMediumOutputPer1m),
    mistralSmallInputPer1m: Number(row.mistralSmallInputPer1m),
    mistralSmallOutputPer1m: Number(row.mistralSmallOutputPer1m),
    slackWebhookUrl: row.slackWebhookUrl ?? null,
    dailySpendAlertUsd: row.dailySpendAlertUsd != null ? Number(row.dailySpendAlertUsd) : null,
    fallbackRateAlertPercent: row.fallbackRateAlertPercent ?? null,
  };

  cached = { value, expiresAt: now + CACHE_MS };
  return value;
}
