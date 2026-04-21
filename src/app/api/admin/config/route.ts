import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin";
import type { AppConfig } from "@prisma/client";

const price = z.number().min(0).max(1_000_000).optional();

const PatchSchema = z.object({
  abTestEnabled: z.boolean().optional(),
  abWeightCostAware: z.number().int().min(0).max(100).optional(),
  abWeightAlwaysGpt4o: z.number().int().min(0).max(100).optional(),
  abWeightConservative: z.number().int().min(0).max(100).optional(),
  rateLimitPerMinute: z.number().int().min(1).max(10_000).optional(),
  cacheTtlMs: z.number().int().min(0).max(3_600_000).optional(),
  defaultMonthlyBudgetUsd: z.number().min(0).max(10_000).optional(),
  defaultMonthlyTokenLimit: z.number().int().min(0).max(1_000_000_000).optional(),
  gpt4oInputPer1m: price,
  gpt4oOutputPer1m: price,
  llama3InputPer1m: price,
  llama3OutputPer1m: price,
  phi3InputPer1m: price,
  phi3OutputPer1m: price,
  claudeInputPer1m: price,
  claudeOutputPer1m: price,
  claudeHaikuInputPer1m: price,
  claudeHaikuOutputPer1m: price,
  geminiProInputPer1m: price,
  geminiProOutputPer1m: price,
  geminiFlashInputPer1m: price,
  geminiFlashOutputPer1m: price,
  mistralLargeInputPer1m: price,
  mistralLargeOutputPer1m: price,
  mistralMediumInputPer1m: price,
  mistralMediumOutputPer1m: price,
  mistralSmallInputPer1m: price,
  mistralSmallOutputPer1m: price,
  slackWebhookUrl: z.string().url().nullable().optional(),
  dailySpendAlertUsd: z.number().min(0).max(1_000_000).nullable().optional(),
  fallbackRateAlertPercent: z.number().int().min(0).max(100).nullable().optional(),
});

function serializeConfig(row: AppConfig) {
  return {
    ...row,
    defaultMonthlyBudgetUsd: Number(row.defaultMonthlyBudgetUsd),
    dailySpendAlertUsd: row.dailySpendAlertUsd != null ? Number(row.dailySpendAlertUsd) : null,
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
  };
}

export async function GET() {
  const admin = await requireAdmin();
  if (!admin.ok) {
    return NextResponse.json(
      { error: admin.reason === "unauthorized" ? "Unauthorized" : "Forbidden" },
      { status: admin.reason === "unauthorized" ? 401 : 403 },
    );
  }

  const row = await prisma.appConfig.upsert({
    where: { id: "singleton" },
    update: {},
    create: { id: "singleton" },
  });

  return NextResponse.json({ config: serializeConfig(row) });
}

export async function PATCH(req: Request) {
  const admin = await requireAdmin();
  if (!admin.ok) {
    return NextResponse.json(
      { error: admin.reason === "unauthorized" ? "Unauthorized" : "Forbidden" },
      { status: admin.reason === "unauthorized" ? 401 : 403 },
    );
  }

  const json = await req.json().catch(() => null);
  const parsed = PatchSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request", issues: parsed.error.issues }, { status: 400 });
  }

  const updated = await prisma.appConfig.update({
    where: { id: "singleton" },
    data: {
      ...parsed.data,
      defaultMonthlyBudgetUsd:
        parsed.data.defaultMonthlyBudgetUsd === undefined ? undefined : parsed.data.defaultMonthlyBudgetUsd,
      dailySpendAlertUsd:
        parsed.data.dailySpendAlertUsd === undefined ? undefined : parsed.data.dailySpendAlertUsd,
    },
  });

  return NextResponse.json({ config: serializeConfig(updated) });
}
