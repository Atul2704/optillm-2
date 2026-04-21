export type PromptComplexity = "SIMPLE" | "MEDIUM" | "COMPLEX";

const REASONING_KEYWORDS = ["explain", "analyze", "compare", "design", "algorithm"];

export function classifyPrompt(promptText: string): {
  complexity: PromptComplexity;
  reasons: string[];
  length: number;
  confidence: number;
} {
  const text = (promptText ?? "").trim();
  const length = text.length;
  const lowered = text.toLowerCase();

  const reasons: string[] = [];
  const hasKeyword = REASONING_KEYWORDS.some((k) => lowered.includes(k));
  if (hasKeyword) reasons.push("Reasoning keyword detected");

  if (length < 40) {
    reasons.push("Length < 40 chars");
    return { complexity: "SIMPLE", reasons, length, confidence: 0.9 };
  }

  if (length > 150) {
    reasons.push("Length > 150 chars");
    return { complexity: "COMPLEX", reasons, length, confidence: 0.9 };
  }

  if (hasKeyword) return { complexity: "COMPLEX", reasons, length, confidence: 0.75 };

  reasons.push("Length between 40–150 chars");
  return { complexity: "MEDIUM", reasons, length, confidence: 0.6 };
}

