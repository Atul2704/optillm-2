import OpenAI from "openai";
import Anthropic from "@anthropic-ai/sdk";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { Mistral } from "@mistralai/mistralai";
import type { ModelUsed } from "@/lib/router";
import { estimateTokensFromText } from "@/lib/tokenEstimator";
import type { AiResult, BackendId } from "@/lib/ai/types";

const SYSTEM_PROMPT =
  "You are OptiLLM, a cost-aware router demo. Be concise, helpful, and return a direct answer without extra disclaimers.";

function estimateTotalTokens(prompt: string, text: string) {
  return estimateTokensFromText(prompt) + estimateTokensFromText(text);
}

async function runOpenaiGpt4o(prompt: string): Promise<AiResult> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("openai_not_configured");
  const client = new OpenAI({ apiKey });
  const model = process.env.OPENAI_MODEL_GPT4O || "gpt-4o";
  const completion = await client.chat.completions.create({
    model,
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: prompt },
    ],
    temperature: 0.2,
  });
  const text = completion.choices?.[0]?.message?.content?.trim() || "";
  const tokens =
    completion.usage?.total_tokens ?? estimateTotalTokens(prompt, text);
  return {
    text,
    tokens,
    inputTokens: completion.usage?.prompt_tokens ?? undefined,
    outputTokens: completion.usage?.completion_tokens ?? undefined,
    provider: "openai",
    rawModel: model,
    fallbackReason: null,
  };
}

async function runGroq(tier: ModelUsed, prompt: string): Promise<AiResult> {
  if (tier === "LLAMA_3") {
    const apiKey = process.env.LLAMA3_API_KEY;
    const baseURL = process.env.LLAMA3_BASE_URL;
    const model = process.env.LLAMA3_MODEL || "llama-3.3-70b-versatile";
    if (!apiKey || !baseURL) throw new Error("groq_llama_not_configured");
    const client = new OpenAI({ apiKey, baseURL });
    const completion = await client.chat.completions.create({
      model,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: prompt },
      ],
      temperature: 0.2,
    });
    const text = completion.choices?.[0]?.message?.content?.trim() || "";
    const tokens =
      completion.usage?.total_tokens ?? estimateTotalTokens(prompt, text);
    return {
      text,
      tokens,
      inputTokens: completion.usage?.prompt_tokens ?? undefined,
      outputTokens: completion.usage?.completion_tokens ?? undefined,
      provider: "openai-compatible",
      rawModel: model,
      fallbackReason: null,
    };
  }
  const apiKey = process.env.PHI3_API_KEY;
  const baseURL = process.env.PHI3_BASE_URL;
  const model = process.env.PHI3_MODEL || "llama-3.1-8b-instant";
  if (!apiKey || !baseURL) throw new Error("groq_phi_not_configured");
  const client = new OpenAI({ apiKey, baseURL });
  const completion = await client.chat.completions.create({
    model,
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: prompt },
    ],
    temperature: 0.2,
  });
  const text = completion.choices?.[0]?.message?.content?.trim() || "";
  const tokens =
    completion.usage?.total_tokens ?? estimateTotalTokens(prompt, text);
  return {
    text,
    tokens,
    inputTokens: completion.usage?.prompt_tokens ?? undefined,
    outputTokens: completion.usage?.completion_tokens ?? undefined,
    provider: "openai-compatible",
    rawModel: model,
    fallbackReason: null,
  };
}

async function runAnthropic(tier: ModelUsed, prompt: string): Promise<AiResult> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("anthropic_not_configured");
  const model =
    tier === "PHI_3_MINI"
      ? process.env.ANTHROPIC_MODEL_SMALL || "claude-3-haiku-20240307"
      : process.env.ANTHROPIC_MODEL || "claude-3-5-sonnet-20241022";
  const client = new Anthropic({ apiKey });
  const msg = await client.messages.create({
    model,
    max_tokens: 4096,
    system: SYSTEM_PROMPT,
    messages: [{ role: "user", content: prompt }],
    temperature: 0.2,
  });
  const block = msg.content[0];
  const text = block && block.type === "text" ? block.text.trim() : "";
  const billed =
    (msg.usage?.input_tokens ?? 0) + (msg.usage?.output_tokens ?? 0);
  const tokens = billed > 0 ? billed : estimateTotalTokens(prompt, text);
  return {
    text,
    tokens,
    inputTokens: msg.usage?.input_tokens ?? undefined,
    outputTokens: msg.usage?.output_tokens ?? undefined,
    provider: "anthropic",
    rawModel: model,
    fallbackReason: null,
  };
}

async function runGoogle(tier: ModelUsed, prompt: string): Promise<AiResult> {
  const apiKey = process.env.GOOGLE_AI_API_KEY || process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("google_not_configured");
  const modelName =
    tier === "PHI_3_MINI"
      ? process.env.GEMINI_MODEL_FLASH || "gemini-1.5-flash"
      : process.env.GEMINI_MODEL_PRO || "gemini-1.5-pro";
  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({
    model: modelName,
    systemInstruction: SYSTEM_PROMPT,
  });
  const result = await model.generateContent(prompt);
  const text = result.response.text().trim();
  const meta = result.response.usageMetadata;
  const billed =
    meta?.totalTokenCount ??
    (meta?.promptTokenCount ?? 0) + (meta?.candidatesTokenCount ?? 0);
  const tokens = billed > 0 ? billed : estimateTotalTokens(prompt, text);
  return {
    text,
    tokens,
    inputTokens: meta?.promptTokenCount ?? undefined,
    outputTokens: meta?.candidatesTokenCount ?? undefined,
    provider: "google",
    rawModel: modelName,
    fallbackReason: null,
  };
}

function mistralModelForTier(tier: ModelUsed) {
  if (tier === "GPT_4O") return process.env.MISTRAL_MODEL_LARGE || "mistral-large-latest";
  if (tier === "LLAMA_3") return process.env.MISTRAL_MODEL_MEDIUM || "mistral-medium-latest";
  return process.env.MISTRAL_MODEL_SMALL || "mistral-small-latest";
}

async function runMistral(tier: ModelUsed, prompt: string): Promise<AiResult> {
  const apiKey = process.env.MISTRAL_API_KEY;
  if (!apiKey) throw new Error("mistral_not_configured");
  const model = mistralModelForTier(tier);
  const client = new Mistral({ apiKey });
  const res = await client.chat.complete({
    model,
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: prompt },
    ],
    temperature: 0.2,
  });
  const choice = res.choices?.[0];
  const rawContent = choice?.message?.content;
  const text = (
    typeof rawContent === "string"
      ? rawContent
      : Array.isArray(rawContent)
        ? rawContent
            .map((c) =>
              typeof c === "object" && c !== null && "text" in c
                ? String((c as { text?: string }).text ?? "")
                : "",
            )
            .join("")
        : ""
  ).trim();
  const billed = res.usage?.totalTokens ?? 0;
  const tokens = billed > 0 ? billed : estimateTotalTokens(prompt, text);
  return {
    text,
    tokens,
    inputTokens: res.usage?.promptTokens ?? undefined,
    outputTokens: res.usage?.completionTokens ?? undefined,
    provider: "mistral",
    rawModel: model,
    fallbackReason: null,
  };
}

export async function executeBackend(
  backend: BackendId,
  tier: ModelUsed,
  prompt: string,
): Promise<AiResult> {
  switch (backend) {
    case "openai":
      if (tier !== "GPT_4O") {
        throw new Error("openai_only_for_gpt_tier");
      }
      return runOpenaiGpt4o(prompt);
    case "groq":
      return runGroq(tier, prompt);
    case "anthropic":
      return runAnthropic(tier, prompt);
    case "google":
      return runGoogle(tier, prompt);
    case "mistral":
      return runMistral(tier, prompt);
    default:
      throw new Error("unknown_backend");
  }
}
