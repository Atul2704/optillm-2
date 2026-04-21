export type AiProvider = "openai" | "openai-compatible" | "anthropic" | "google" | "mistral" | "mock";

export type AiResult = {
  text: string;
  tokens: number;
  inputTokens?: number;
  outputTokens?: number;
  provider: AiProvider;
  rawModel: string;
  fallbackReason: string | null;
};

/** Logical upstream backends used for pools / failover. */
export type BackendId = "openai" | "anthropic" | "google" | "mistral" | "groq";
