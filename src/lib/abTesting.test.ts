import test from "node:test";
import assert from "node:assert/strict";
import { chooseModelForStrategy, chooseStrategyStable } from "@/lib/abTesting";

test("abTesting: returns cost_aware when AB test disabled", () => {
  const prev = process.env.ROUTER_AB_TEST_ENABLED;
  process.env.ROUTER_AB_TEST_ENABLED = "0";
  try {
    assert.equal(chooseStrategyStable("user:abc"), "cost_aware");
  } finally {
    if (prev === undefined) delete process.env.ROUTER_AB_TEST_ENABLED;
    else process.env.ROUTER_AB_TEST_ENABLED = prev;
  }
});

test("abTesting: always_gpt4o forces GPT_4O", () => {
  assert.equal(
    chooseModelForStrategy({
      strategy: "always_gpt4o",
      complexity: "SIMPLE",
      confidence: 0.9,
      defaultRoutedModel: "PHI_3_MINI",
    }),
    "GPT_4O",
  );
});

