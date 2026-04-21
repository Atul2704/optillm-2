export type AbWeights = {
  costAware: number;
  alwaysGpt4o: number;
  conservative: number;
};

export type TierPricing = { input: number; output: number };

export type PricingPer1mUsd = {
  GPT_4O: TierPricing;
  LLAMA_3: TierPricing;
  PHI_3_MINI: TierPricing;
  claude: TierPricing;
  claudeHaiku: TierPricing;
  geminiPro: TierPricing;
  geminiFlash: TierPricing;
  mistralLarge: TierPricing;
  mistralMedium: TierPricing;
  mistralSmall: TierPricing;
};

export type RuntimeConfig = {
  rateLimitPerMinute: number;
  cacheTtlMs: number;
  abEnabled: boolean;
  abWeights: AbWeights;
  defaultMonthlyBudgetUsd: number;
  defaultMonthlyTokenLimit: number;
  pricingPer1mUsd: PricingPer1mUsd;
};

declare global {
  var __optillmRuntimeConfig: RuntimeConfig | undefined;
}

const DEFAULTS: RuntimeConfig = {
  rateLimitPerMinute: 30,
  cacheTtlMs: 120_000,
  abEnabled: false,
  abWeights: { costAware: 70, alwaysGpt4o: 15, conservative: 15 },
  defaultMonthlyBudgetUsd: 5,
  defaultMonthlyTokenLimit: 200_000,
  pricingPer1mUsd: {
    GPT_4O: { input: 2.5, output: 10 },
    LLAMA_3: { input: 0.59, output: 0.79 },
    PHI_3_MINI: { input: 0.05, output: 0.08 },
    claude: { input: 3, output: 15 },
    claudeHaiku: { input: 0.25, output: 1.25 },
    geminiPro: { input: 1.25, output: 5 },
    geminiFlash: { input: 0.075, output: 0.3 },
    mistralLarge: { input: 2, output: 6 },
    mistralMedium: { input: 0.4, output: 0.4 },
    mistralSmall: { input: 0.2, output: 0.2 },
  },
};

export function setRuntimeConfig(partial: Partial<RuntimeConfig>) {
  globalThis.__optillmRuntimeConfig = {
    ...DEFAULTS,
    ...(globalThis.__optillmRuntimeConfig ?? {}),
    ...partial,
    pricingPer1mUsd: {
      ...DEFAULTS.pricingPer1mUsd,
      ...(globalThis.__optillmRuntimeConfig?.pricingPer1mUsd ?? {}),
      ...(partial.pricingPer1mUsd ?? {}),
    },
  };
}

export function getRuntimeConfig(): RuntimeConfig {
  return globalThis.__optillmRuntimeConfig ?? DEFAULTS;
}
