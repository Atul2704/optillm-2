import type { ModelUsed } from "@/lib/router";
import { estimateTokensFromText } from "@/lib/tokenEstimator";
import { getConfiguredPool, rotatePool, defaultPoolForTier, isBackendConfigured } from "@/lib/ai/pools";
import {
  circuitKey,
  getCircuitStates,
  isCircuitOpen,
  markProviderFailure,
  markProviderSuccess,
} from "@/lib/ai/circuit";
import { executeBackend } from "@/lib/ai/execute";
import type { AiResult } from "@/lib/ai/types";

export type { AiResult, AiProvider, BackendId } from "@/lib/ai/types";

function getFallbackOrder(primary: ModelUsed): ModelUsed[] {
  const all: ModelUsed[] = ["GPT_4O", "LLAMA_3", "PHI_3_MINI"];
  return [primary, ...all.filter((m) => m !== primary)];
}

function shouldTryFallback(err: unknown): boolean {
  if (!err || typeof err !== "object") return false;
  const maybeErr = err as { status?: number; code?: string; type?: string; message?: string };
  if (maybeErr.status === 401 || maybeErr.status === 402 || maybeErr.status === 429) return true;
  if (maybeErr.status === 503 || maybeErr.status === 529) return true;
  if (maybeErr.code === "insufficient_quota" || maybeErr.code === "invalid_api_key") return true;
  if (maybeErr.code === "model_decommissioned") return true;
  if (maybeErr.type === "insufficient_quota") return true;
  const msg = String(maybeErr.message ?? "").toLowerCase();
  if (msg.includes("rate limit") || msg.includes("overloaded")) return true;
  return false;
}

function describeFallbackError(err: unknown): string {
  if (!err || typeof err !== "object") return "provider_error";
  const maybeErr = err as { status?: number; code?: string; type?: string };
  return maybeErr.code || maybeErr.type || (maybeErr.status ? `http_${maybeErr.status}` : "provider_error");
}

export function getProviderHealthSnapshot() {
  const at = Date.now();
  const tiers: ModelUsed[] = ["GPT_4O", "LLAMA_3", "PHI_3_MINI"];
  const states = getCircuitStates();

  const providers: {
    model: string;
    failures: number;
    circuitOpen: boolean;
    retryAt: number | null;
    configured: boolean;
  }[] = [];

  for (const tier of tiers) {
    for (const backend of defaultPoolForTier(tier)) {
      const key = circuitKey(tier, backend);
      const state = states.get(key) ?? { failures: 0, openUntil: 0 };
      providers.push({
        model: `${tier}:${backend}`,
        failures: state.failures,
        circuitOpen: state.openUntil > at,
        retryAt: state.openUntil || null,
        configured: isBackendConfigured(backend, tier),
      });
    }
  }

  return providers;
}

export async function generateRoutedCompletion(
  modelUsed: ModelUsed,
  promptText: string,
): Promise<AiResult> {
  const prompt = (promptText ?? "").trim();
  const orderedTiers = getFallbackOrder(modelUsed);
  const fallbackReasons: string[] = [];

  for (const tier of orderedTiers) {
    const poolBase = getConfiguredPool(tier);
    if (!poolBase.length) continue;

    const pool = rotatePool(tier, poolBase);

    for (const backend of pool) {
      const ck = circuitKey(tier, backend);
      if (isCircuitOpen(ck)) {
        fallbackReasons.push(`${ck}:circuit_open`);
        continue;
      }

      try {
        const result = await executeBackend(backend, tier, prompt);
        markProviderSuccess(ck);
        return {
          ...result,
          fallbackReason: fallbackReasons.length ? fallbackReasons.join(" -> ") : null,
        };
      } catch (err) {
        if (!shouldTryFallback(err)) {
          throw err;
        }
        markProviderFailure(ck);
        fallbackReasons.push(`${ck}:${describeFallbackError(err)}`);
      }
    }
  }

  const mock = `Mock response (providers unavailable, out of quota, invalid, or not configured) for ${modelUsed}.\n\nPrompt:\n${prompt.slice(
    0,
    400,
  )}${prompt.length > 400 ? "…" : ""}\n\nTip: configure OPENAI_API_KEY, ANTHROPIC_API_KEY, GOOGLE_AI_API_KEY, MISTRAL_API_KEY, and/or Groq (LLAMA3_*/PHI3_*).`;
  return {
    text: mock,
    tokens: estimateTokensFromText(prompt) + estimateTokensFromText(mock),
    provider: "mock",
    rawModel: "mock",
    fallbackReason: fallbackReasons.length ? fallbackReasons.join(" -> ") : "all_providers_unavailable",
  };
}
