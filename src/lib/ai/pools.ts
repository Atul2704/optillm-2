import type { ModelUsed } from "@/lib/router";
import type { BackendId } from "@/lib/ai/types";

const ALLOWED = new Set<BackendId>(["openai", "anthropic", "google", "mistral", "groq"]);

function parsePool(envKey: string, fallback: BackendId[]): BackendId[] {
  const raw = process.env[envKey]?.trim();
  if (!raw) return fallback;
  const parts = raw
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean) as BackendId[];
  return parts.filter((p) => ALLOWED.has(p));
}

export function defaultPoolForTier(tier: ModelUsed): BackendId[] {
  if (tier === "GPT_4O") {
    return parsePool("PROVIDER_POOL_GPT4O", ["openai", "anthropic", "google", "mistral"]);
  }
  if (tier === "LLAMA_3") {
    return parsePool("PROVIDER_POOL_LLAMA", ["groq", "mistral", "google"]);
  }
  return parsePool("PROVIDER_POOL_PHI", ["groq", "mistral", "google"]);
}

export function isBackendConfigured(id: BackendId, tier: ModelUsed): boolean {
  switch (id) {
    case "openai":
      return Boolean(process.env.OPENAI_API_KEY);
    case "anthropic":
      return Boolean(process.env.ANTHROPIC_API_KEY);
    case "google":
      return Boolean(process.env.GOOGLE_AI_API_KEY || process.env.GEMINI_API_KEY);
    case "mistral":
      return Boolean(process.env.MISTRAL_API_KEY);
    case "groq":
      if (tier === "LLAMA_3") {
        return Boolean(process.env.LLAMA3_API_KEY && process.env.LLAMA3_BASE_URL);
      }
      if (tier === "PHI_3_MINI") {
        return Boolean(process.env.PHI3_API_KEY && process.env.PHI3_BASE_URL);
      }
      return false;
    default:
      return false;
  }
}

export function getConfiguredPool(tier: ModelUsed): BackendId[] {
  return defaultPoolForTier(tier).filter((id) => isBackendConfigured(id, tier));
}

const rr = new Map<ModelUsed, number>();

export function rotatePool(tier: ModelUsed, pool: BackendId[]): BackendId[] {
  if (pool.length <= 1) return pool;
  const start = (rr.get(tier) ?? 0) % pool.length;
  rr.set(tier, start + 1);
  return [...pool.slice(start), ...pool.slice(0, start)];
}
