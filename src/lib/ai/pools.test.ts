import test from "node:test";
import assert from "node:assert/strict";
import { defaultPoolForTier, getConfiguredPool, rotatePool, isBackendConfigured } from "@/lib/ai/pools";

function withEnv(updates: Record<string, string | undefined>, fn: () => void) {
  const prev: Record<string, string | undefined> = {};
  for (const k of Object.keys(updates)) {
    prev[k] = process.env[k];
    const v = updates[k];
    if (v === undefined) delete process.env[k];
    else process.env[k] = v;
  }
  try {
    fn();
  } finally {
    for (const k of Object.keys(updates)) {
      const old = prev[k];
      if (old === undefined) delete process.env[k];
      else process.env[k] = old;
    }
  }
}

test("defaultPoolForTier: PROVIDER_POOL_GPT4O overrides order and filters unknown ids", () => {
  withEnv({ PROVIDER_POOL_GPT4O: "mistral, bogus ,google" }, () => {
    assert.deepEqual(defaultPoolForTier("GPT_4O"), ["mistral", "google"]);
  });
});

test("rotatePool: rotates order per tier", () => {
  const tier = "GPT_4O";
  const pool = ["a", "b", "c"] as const;
  const r0 = rotatePool(tier, [...pool]);
  const r1 = rotatePool(tier, [...pool]);
  const r2 = rotatePool(tier, [...pool]);
  assert.deepEqual(r0, ["a", "b", "c"]);
  assert.deepEqual(r1, ["b", "c", "a"]);
  assert.deepEqual(r2, ["c", "a", "b"]);
});

test("getConfiguredPool: only includes backends with credentials for tier", () => {
  withEnv(
    {
      PROVIDER_POOL_PHI: "groq,mistral,google",
      LLAMA3_BASE_URL: undefined,
      LLAMA3_API_KEY: undefined,
      PHI3_BASE_URL: "https://api.groq.com/openai/v1",
      PHI3_API_KEY: "x",
      MISTRAL_API_KEY: undefined,
      GOOGLE_AI_API_KEY: "g",
    },
    () => {
      const pool = getConfiguredPool("PHI_3_MINI");
      assert.ok(pool.includes("groq"));
      assert.ok(pool.includes("google"));
      assert.ok(!pool.includes("mistral"));
    },
  );
});

test("isBackendConfigured: groq false for GPT_4O tier", () => {
  assert.equal(isBackendConfigured("groq", "GPT_4O"), false);
});
