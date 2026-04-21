import type { ModelUsed } from "@/lib/router";
import type { AiProvider } from "@/lib/ai/types";
import { getRuntimeConfig } from "@/lib/runtimeConfig";

export type CostBreakdown = {
  tokens: number;
  inputTokens: number;
  outputTokens: number;
  gpt4oCostUsd: number;
  selectedModelCostUsd: number;
  savingsUsd: number;
  savingsPercent: number;
};

export type PriceRow = {
  inputUsdPer1k: number;
  outputUsdPer1k: number;
};

// Live pricing snapshot (USD per 1K tokens) based on provider pricing pages.
const PRICE_TABLE_V1: Record<ModelUsed, PriceRow> = {
  PHI_3_MINI: { inputUsdPer1k: 0.00005, outputUsdPer1k: 0.00008 },
  LLAMA_3: { inputUsdPer1k: 0.00059, outputUsdPer1k: 0.00079 },
  GPT_4O: { inputUsdPer1k: 0.005, outputUsdPer1k: 0.015 },
};

function splitTokens(totalTokens: number) {
  const safeTotal = Math.max(0, Math.floor(totalTokens));
  const inputTokens = Math.floor(safeTotal * 0.65);
  const outputTokens = safeTotal - inputTokens;
  return { inputTokens, outputTokens };
}

function resolveTokenSplit(totalTokens: number, inputTokens?: number, outputTokens?: number) {
  const safeTotal = Math.max(0, Math.floor(totalTokens));
  const hasInput = Number.isFinite(inputTokens);
  const hasOutput = Number.isFinite(outputTokens);

  if (hasInput && hasOutput) {
    const safeInput = Math.max(0, Math.floor(inputTokens as number));
    const safeOutput = Math.max(0, Math.floor(outputTokens as number));
    return { inputTokens: safeInput, outputTokens: safeOutput };
  }
  if (hasInput && !hasOutput) {
    const safeInput = Math.max(0, Math.floor(inputTokens as number));
    return { inputTokens: safeInput, outputTokens: Math.max(0, safeTotal - safeInput) };
  }
  if (!hasInput && hasOutput) {
    const safeOutput = Math.max(0, Math.floor(outputTokens as number));
    return { inputTokens: Math.max(0, safeTotal - safeOutput), outputTokens: safeOutput };
  }

  return splitTokens(totalTokens);
}

function rowFromPer1m(t: { input: number; output: number }): PriceRow {
  return { inputUsdPer1k: t.input / 1000, outputUsdPer1k: t.output / 1000 };
}

function getCommercialPromptFloorUsd() {
  const monthly = Number(process.env.BILLING_SUBSCRIPTION_MONTHLY_USD ?? 20);
  const includedPrompts = Number(process.env.BILLING_INCLUDED_PROMPTS_PER_MONTH ?? 1000);
  const minPrompt = Number(process.env.BILLING_MIN_PROMPT_CHARGE_USD ?? 0.02);
  const subscriptionPerPrompt =
    Number.isFinite(monthly) && Number.isFinite(includedPrompts) && includedPrompts > 0
      ? monthly / includedPrompts
      : 0.02;
  return Math.max(minPrompt, subscriptionPerPrompt);
}

function getModelPromptFloorUsd(modelUsed: ModelUsed) {
  const globalFloor = getCommercialPromptFloorUsd();
  if (modelUsed === "GPT_4O") {
    const gptFloor = Number(process.env.BILLING_GPT4O_MIN_PROMPT_USD ?? 0.06);
    return Math.max(globalFloor, Number.isFinite(gptFloor) ? gptFloor : 0.06);
  }
  if (modelUsed === "LLAMA_3") {
    const llamaFloor = Number(process.env.BILLING_LLAMA_MIN_PROMPT_USD ?? 0.03);
    return Math.max(globalFloor * 0.9, Number.isFinite(llamaFloor) ? llamaFloor : 0.03);
  }
  const phiFloor = Number(process.env.BILLING_PHI_MIN_PROMPT_USD ?? 0.015);
  return Math.max(globalFloor * 0.6, Number.isFinite(phiFloor) ? phiFloor : 0.015);
}

function getModelCommercialMultiplier(modelUsed: ModelUsed) {
  const base = Number(process.env.BILLING_BASE_MULTIPLIER ?? 1.6);
  if (modelUsed === "GPT_4O") {
    const high = Number(process.env.BILLING_GPT4O_MULTIPLIER ?? 2.2);
    return Number.isFinite(high) && high > 0 ? high : 2.2;
  }
  if (modelUsed === "LLAMA_3") {
    const mid = Number(process.env.BILLING_LLAMA_MULTIPLIER ?? 1.8);
    return Number.isFinite(mid) && mid > 0 ? mid : 1.8;
  }
  return Number.isFinite(base) && base > 0 ? base : 1.6;
}

function toCommercialCostUsd(apiCostUsd: number, modelUsed: ModelUsed) {
  const floor = getModelPromptFloorUsd(modelUsed);
  const multiplier = getModelCommercialMultiplier(modelUsed);
  const adjusted = apiCostUsd * multiplier;
  return Math.max(floor, adjusted);
}

export function estimateCostUsdForProvider(
  modelUsed: ModelUsed,
  provider: AiProvider,
  tokens: number,
  inputTokens?: number,
  outputTokens?: number,
) {
  if (provider === "mock") return 0;
  const split = resolveTokenSplit(tokens, inputTokens, outputTokens);
  const p = getRuntimeConfig().pricingPer1mUsd;

  let row: PriceRow;
  switch (provider) {
    case "openai":
      row = rowFromPer1m(p.GPT_4O);
      break;
    case "openai-compatible":
      row = rowFromPer1m(modelUsed === "LLAMA_3" ? p.LLAMA_3 : p.PHI_3_MINI);
      break;
    case "anthropic":
      row = rowFromPer1m(modelUsed === "PHI_3_MINI" ? p.claudeHaiku : p.claude);
      break;
    case "google":
      row = rowFromPer1m(modelUsed === "PHI_3_MINI" ? p.geminiFlash : p.geminiPro);
      break;
    case "mistral":
      if (modelUsed === "GPT_4O") row = rowFromPer1m(p.mistralLarge);
      else if (modelUsed === "LLAMA_3") row = rowFromPer1m(p.mistralMedium);
      else row = rowFromPer1m(p.mistralSmall);
      break;
    default:
      row = PRICE_TABLE_V1[modelUsed];
  }
  const apiCostUsd = ((row.inputUsdPer1k * split.inputTokens) + (row.outputUsdPer1k * split.outputTokens)) / 1000;
  return toCommercialCostUsd(apiCostUsd, modelUsed);
}

export function estimateCostUsd(model: ModelUsed, tokens: number) {
  const { inputTokens, outputTokens } = splitTokens(tokens);
  const runtime = getRuntimeConfig();
  const runtimeRowPer1m = runtime.pricingPer1mUsd?.[model];
  const row = runtimeRowPer1m
    ? {
        inputUsdPer1k: runtimeRowPer1m.input / 1000,
        outputUsdPer1k: runtimeRowPer1m.output / 1000,
      }
    : PRICE_TABLE_V1[model];
  const apiCostUsd = ((row.inputUsdPer1k * inputTokens) + (row.outputUsdPer1k * outputTokens)) / 1000;
  return toCommercialCostUsd(apiCostUsd, model);
}

export function estimateCostUsdDetailed(model: ModelUsed, inputTokens: number, outputTokens: number) {
  const safeInput = Math.max(0, Math.floor(inputTokens));
  const safeOutput = Math.max(0, Math.floor(outputTokens));
  const runtime = getRuntimeConfig();
  const runtimeRowPer1m = runtime.pricingPer1mUsd?.[model];
  const row = runtimeRowPer1m
    ? {
        inputUsdPer1k: runtimeRowPer1m.input / 1000,
        outputUsdPer1k: runtimeRowPer1m.output / 1000,
      }
    : PRICE_TABLE_V1[model];
  const apiCostUsd = ((row.inputUsdPer1k * safeInput) + (row.outputUsdPer1k * safeOutput)) / 1000;
  return toCommercialCostUsd(apiCostUsd, model);
}

export function getPriceTable() {
  return PRICE_TABLE_V1;
}

export function calculateSavings(model: ModelUsed, tokens: number): CostBreakdown {
  const safeTokens = Math.max(0, Math.floor(tokens));
  const { inputTokens, outputTokens } = splitTokens(safeTokens);
  const gpt4oCostUsd = estimateCostUsd("GPT_4O", tokens);
  const selectedModelCostUsd = estimateCostUsd(model, tokens);
  const savingsUsd = Math.max(0, gpt4oCostUsd - selectedModelCostUsd);
  const savingsPercent = gpt4oCostUsd > 0 ? (savingsUsd / gpt4oCostUsd) * 100 : 0;

  return {
    tokens: safeTokens,
    inputTokens,
    outputTokens,
    gpt4oCostUsd,
    selectedModelCostUsd,
    savingsUsd,
    savingsPercent,
  };
}

export function calculateSavingsWithProvider(
  model: ModelUsed,
  tokens: number,
  provider: AiProvider,
  inputTokens?: number,
  outputTokens?: number,
): CostBreakdown {
  const safeTokens = Math.max(0, Math.floor(tokens));
  const split = resolveTokenSplit(safeTokens, inputTokens, outputTokens);
  const gpt4oCostUsd = estimateCostUsd("GPT_4O", tokens);
  const selectedModelCostUsd = estimateCostUsdForProvider(
    model,
    provider,
    tokens,
    split.inputTokens,
    split.outputTokens,
  );
  const savingsUsd = Math.max(0, gpt4oCostUsd - selectedModelCostUsd);
  const savingsPercent = gpt4oCostUsd > 0 ? (savingsUsd / gpt4oCostUsd) * 100 : 0;

  return {
    tokens: safeTokens,
    inputTokens: split.inputTokens,
    outputTokens: split.outputTokens,
    gpt4oCostUsd,
    selectedModelCostUsd,
    savingsUsd,
    savingsPercent,
  };
}

export function formatUsd(amount: number) {
  const currency = (process.env.NEXT_PUBLIC_CURRENCY ?? "INR").toUpperCase();
  const usdToInr = Number(process.env.NEXT_PUBLIC_USD_TO_INR ?? 83);

  if (currency === "INR") {
    const inr = amount * (Number.isFinite(usdToInr) ? usdToInr : 83);
    // For tiny values, show more precision so it doesn't look like ₹0.00 everywhere.
    return inr < 1 ? `₹${inr.toFixed(4)}` : `₹${inr.toFixed(2)}`;
  }

  return amount < 0.01 ? `$${amount.toFixed(4)}` : `$${amount.toFixed(2)}`;
}

