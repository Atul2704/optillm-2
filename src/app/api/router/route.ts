import { NextResponse } from "next/server";
import { z } from "zod";
import { classifyPrompt } from "@/lib/classifier";
import { routeModel } from "@/lib/router";
import { generateRoutedCompletion } from "@/lib/ai";
import { calculateSavingsWithProvider } from "@/lib/costCalculator";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { checkUserMonthlyLimits } from "@/lib/quota";
import { getAppConfig } from "@/lib/config";
import { setRuntimeConfig } from "@/lib/runtimeConfig";
import {
  getCachedCompletion,
  getClientIdentifier,
  isRateLimited,
  setCachedCompletion,
} from "@/lib/runtimeGuards";

const BodySchema = z.object({
  promptText: z.string().min(1).max(20_000),
  promptMode: z.enum(["cost_cutting", "efficiency", "fast"]).optional(),
});

function chooseModelForPromptMode(args: {
  promptMode: "cost_cutting" | "efficiency" | "fast";
  complexity: "SIMPLE" | "MEDIUM" | "COMPLEX";
  confidence: number;
  length: number;
  defaultRoutedModel: "PHI_3_MINI" | "LLAMA_3" | "GPT_4O";
}) {
  const { promptMode, complexity, confidence, length } = args;
  if (promptMode === "cost_cutting") {
    if (complexity === "SIMPLE") return "PHI_3_MINI";
    if (complexity === "MEDIUM") return confidence >= 0.65 ? "PHI_3_MINI" : "LLAMA_3";
    // complex: prefer cheaper LLaMA unless very long/high-confidence complex prompt
    return confidence >= 0.92 || length >= 500 ? "GPT_4O" : "LLAMA_3";
  }

  if (promptMode === "efficiency") {
    // Balanced mode: keep quality safer than pure cost strategy.
    if (complexity === "COMPLEX") return "GPT_4O";
    if (complexity === "MEDIUM") return "LLAMA_3";
    return "LLAMA_3";
  }

  // fast mode: default to smallest/quickest model, with single safety bump for very long prompts
  if (length > 700) return "LLAMA_3";
  return "PHI_3_MINI";
}

export async function POST(req: Request) {
  const json = await req.json().catch(() => null);
  const parsed = BodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request", issues: parsed.error.issues },
      { status: 400 },
    );
  }

  const { promptText, promptMode = "cost_cutting" } = parsed.data;
  const classification = classifyPrompt(promptText);
  const user = await getCurrentUser();
  const rateKey = getClientIdentifier(req, user?.id);

  const config = await getAppConfig().catch(() => null);
  if (config) {
    setRuntimeConfig({
      rateLimitPerMinute: config.rateLimitPerMinute,
      cacheTtlMs: config.cacheTtlMs,
      abEnabled: config.abTestEnabled,
      abWeights: {
        costAware: config.abWeightCostAware,
        alwaysGpt4o: config.abWeightAlwaysGpt4o,
        conservative: config.abWeightConservative,
      },
      defaultMonthlyBudgetUsd: config.defaultMonthlyBudgetUsd,
      defaultMonthlyTokenLimit: config.defaultMonthlyTokenLimit,
      pricingPer1mUsd: {
        GPT_4O: { input: config.gpt4oInputPer1m, output: config.gpt4oOutputPer1m },
        LLAMA_3: { input: config.llama3InputPer1m, output: config.llama3OutputPer1m },
        PHI_3_MINI: { input: config.phi3InputPer1m, output: config.phi3OutputPer1m },
        claude: { input: config.claudeInputPer1m, output: config.claudeOutputPer1m },
        claudeHaiku: { input: config.claudeHaikuInputPer1m, output: config.claudeHaikuOutputPer1m },
        geminiPro: { input: config.geminiProInputPer1m, output: config.geminiProOutputPer1m },
        geminiFlash: { input: config.geminiFlashInputPer1m, output: config.geminiFlashOutputPer1m },
        mistralLarge: { input: config.mistralLargeInputPer1m, output: config.mistralLargeOutputPer1m },
        mistralMedium: { input: config.mistralMediumInputPer1m, output: config.mistralMediumOutputPer1m },
        mistralSmall: { input: config.mistralSmallInputPer1m, output: config.mistralSmallOutputPer1m },
      },
    });
  }

  const rate = isRateLimited(rateKey);
  if (rate.limited) {
    return NextResponse.json(
      { error: "Rate limit exceeded. Please retry shortly." },
      { status: 429, headers: { "x-ratelimit-reset": String(rate.resetAt) } },
    );
  }

  if (user?.id) {
    const limits = await checkUserMonthlyLimits(user.id).catch(() => null);
    if (limits?.overBudget) {
      return NextResponse.json(
        {
          error: "Monthly budget exceeded",
          limits: {
            budgetUsd: limits.budgetUsd,
            usedCostUsd: limits.usedCostUsd,
            start: limits.start.toISOString(),
          },
        },
        { status: 402 },
      );
    }
    if (limits?.overTokens) {
      return NextResponse.json(
        {
          error: "Monthly token limit exceeded",
          limits: {
            tokenLimit: limits.tokenLimit,
            usedTokens: limits.usedTokens,
            start: limits.start.toISOString(),
          },
        },
        { status: 429 },
      );
    }
  }

  const defaultRoutedModel = routeModel(classification.complexity, classification.confidence);
  const strategy = promptMode;
  const modelUsed = chooseModelForPromptMode({
    promptMode,
    complexity: classification.complexity,
    confidence: classification.confidence,
    length: classification.length,
    defaultRoutedModel,
  });

  const cached = getCachedCompletion(promptText, modelUsed);
  const ai = cached
    ? cached
    : await generateRoutedCompletion(modelUsed, promptText).then((result) => {
        setCachedCompletion(promptText, modelUsed, result);
        return result;
      });
  const savings = calculateSavingsWithProvider(
    modelUsed,
    ai.tokens,
    ai.provider,
    ai.inputTokens,
    ai.outputTokens,
  );

  const log = await prisma.prompt
    .create({
      data: {
        promptText,
        complexity: classification.complexity,
        modelUsed,
        tokens: ai.tokens,
        inputTokens: savings.inputTokens,
        outputTokens: savings.outputTokens,
        estimatedCost: savings.selectedModelCostUsd.toFixed(6),
        provider: ai.provider,
        rawModel: ai.rawModel,
        strategy,
        confidence: classification.confidence,
        cacheHit: Boolean(cached),
        fallbackReason: ai.fallbackReason,
        userId: user?.id ?? null,
      },
      select: {
        id: true,
        createdAt: true,
      },
    })
    .catch(() => null);

  return NextResponse.json({
    id: log?.id ?? null,
    createdAt: log?.createdAt ?? new Date().toISOString(),
    promptText,
    complexity: classification.complexity,
    reasons: classification.reasons,
    confidence: classification.confidence,
    strategy,
    modelUsed,
    provider: ai.provider,
    rawModel: ai.rawModel,
    fallbackReason: ai.fallbackReason,
    cacheHit: Boolean(cached),
    responseText: ai.text,
    tokens: ai.tokens,
    inputTokens: savings.inputTokens,
    outputTokens: savings.outputTokens,
    estimatedCostUsd: savings.selectedModelCostUsd,
    gpt4oCostUsd: savings.gpt4oCostUsd,
    savingsUsd: savings.savingsUsd,
    savingsPercent: savings.savingsPercent,
  });
}

