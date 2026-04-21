type HitWindow = {
  count: number;
  resetAt: number;
};

type CacheEntry = {
  text: string;
  tokens: number;
  provider: "openai" | "openai-compatible" | "anthropic" | "google" | "mistral" | "mock";
  rawModel: string;
  fallbackReason: string | null;
  expiresAt: number;
};

const RATE_LIMIT_WINDOW_MS = 60_000;

const hitWindows = new Map<string, HitWindow>();
const semanticCache = new Map<string, CacheEntry>();

function now() {
  return Date.now();
}

export function getClientIdentifier(req: Request, userId?: string | null) {
  if (userId) return `user:${userId}`;
  const forwarded = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const realIp = req.headers.get("x-real-ip")?.trim();
  const ip = forwarded || realIp || "unknown";
  return `ip:${ip}`;
}

export function isRateLimited(key: string) {
  const RATE_LIMIT_PER_MINUTE = globalThis.__optillmRuntimeConfig?.rateLimitPerMinute ?? 30;
  const current = now();
  const found = hitWindows.get(key);
  if (!found || found.resetAt <= current) {
    hitWindows.set(key, { count: 1, resetAt: current + RATE_LIMIT_WINDOW_MS });
    return { limited: false, remaining: RATE_LIMIT_PER_MINUTE - 1, resetAt: current + RATE_LIMIT_WINDOW_MS };
  }

  found.count += 1;
  const remaining = Math.max(0, RATE_LIMIT_PER_MINUTE - found.count);
  if (found.count > RATE_LIMIT_PER_MINUTE) {
    return { limited: true, remaining: 0, resetAt: found.resetAt };
  }
  return { limited: false, remaining, resetAt: found.resetAt };
}

function getCacheKey(promptText: string, modelUsed: string) {
  const normalized = promptText.trim().toLowerCase().replace(/\s+/g, " ");
  return `${modelUsed}::${normalized}`;
}

export function getCachedCompletion(promptText: string, modelUsed: string) {
  const key = getCacheKey(promptText, modelUsed);
  const found = semanticCache.get(key);
  if (!found) return null;
  if (found.expiresAt <= now()) {
    semanticCache.delete(key);
    return null;
  }
  return found;
}

export function setCachedCompletion(
  promptText: string,
  modelUsed: string,
  value: Omit<CacheEntry, "expiresAt">,
) {
  const CACHE_TTL_MS = globalThis.__optillmRuntimeConfig?.cacheTtlMs ?? 120_000;
  const key = getCacheKey(promptText, modelUsed);
  semanticCache.set(key, {
    ...value,
    expiresAt: now() + CACHE_TTL_MS,
  });
}

