import type { PromptComplexity } from "@/lib/classifier";
import type { ModelUsed } from "@/lib/router";

export type RoutingStrategy = "cost_aware" | "always_gpt4o" | "conservative";

function hashStringToInt(s: string) {
  // Deterministic non-crypto hash (stable bucket assignment).
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function chooseStrategyStable(key: string): RoutingStrategy {
  const enabled =
    Boolean(globalThis.__optillmRuntimeConfig?.abEnabled) ||
    String(process.env.ROUTER_AB_TEST_ENABLED ?? "0") === "1";
  if (!enabled) return "cost_aware";

  const bucket = hashStringToInt(key) % 100;
  const weights =
    globalThis.__optillmRuntimeConfig?.abWeights ?? { costAware: 70, alwaysGpt4o: 15, conservative: 15 };

  const wCost = Math.max(0, Math.min(100, Math.floor(weights.costAware)));
  const wAlways = Math.max(0, Math.min(100, Math.floor(weights.alwaysGpt4o)));
  const wCons = Math.max(0, Math.min(100, Math.floor(weights.conservative)));

  const total = wCost + wAlways + wCons;
  const normCost = total ? Math.round((wCost / total) * 100) : 70;
  const normAlways = total ? Math.round((wAlways / total) * 100) : 15;
  // conservative gets remainder
  const cut1 = normCost;
  const cut2 = normCost + normAlways;

  if (bucket < cut1) return "cost_aware";
  if (bucket < cut2) return "always_gpt4o";
  return "conservative";
}

export function chooseModelForStrategy(args: {
  strategy: RoutingStrategy;
  complexity: PromptComplexity;
  confidence: number;
  defaultRoutedModel: ModelUsed;
}): ModelUsed {
  const { strategy, complexity, confidence, defaultRoutedModel } = args;
  if (strategy === "always_gpt4o") return "GPT_4O";
  if (strategy === "conservative") {
    if (complexity === "COMPLEX") return "GPT_4O";
    if (confidence < 0.7) return "LLAMA_3";
    return "LLAMA_3";
  }
  // cost_aware: keep existing routing decision
  return defaultRoutedModel;
}

