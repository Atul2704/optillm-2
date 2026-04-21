import test from "node:test";
import assert from "node:assert/strict";
import {
  calculateSavings,
  calculateSavingsWithProvider,
  estimateCostUsd,
  estimateCostUsdForProvider,
  getPriceTable,
} from "@/lib/costCalculator";

test("costCalculator: returns non-negative costs", () => {
  assert.ok(estimateCostUsd("GPT_4O", 1000) >= 0);
  assert.ok(estimateCostUsd("LLAMA_3", 1000) >= 0);
  assert.ok(estimateCostUsd("PHI_3_MINI", 1000) >= 0);
});

test("costCalculator: savings baseline is GPT_4O", () => {
  const r = calculateSavings("PHI_3_MINI", 1000);
  assert.ok(r.gpt4oCostUsd > 0);
  assert.ok(r.selectedModelCostUsd >= 0);
  assert.ok(r.savingsUsd >= 0);
});

test("costCalculator: has price table rows for all models", () => {
  const t = getPriceTable();
  assert.ok(Boolean(t.GPT_4O));
  assert.ok(Boolean(t.LLAMA_3));
  assert.ok(Boolean(t.PHI_3_MINI));
});

test("costCalculator: estimateCostUsdForProvider uses Haiku row for Phi tier on Anthropic", () => {
  const haiku = estimateCostUsdForProvider("PHI_3_MINI", "anthropic", 10_000);
  const sonnet = estimateCostUsdForProvider("GPT_4O", "anthropic", 10_000);
  assert.ok(sonnet > haiku);
});

test("costCalculator: calculateSavingsWithProvider differs by provider for same tier", () => {
  const openai = calculateSavingsWithProvider("GPT_4O", 50_000, "openai");
  const mistral = calculateSavingsWithProvider("GPT_4O", 50_000, "mistral");
  assert.notEqual(openai.selectedModelCostUsd, mistral.selectedModelCostUsd);
});

