import type { PromptComplexity } from "@/lib/classifier";

export type ModelUsed = "PHI_3_MINI" | "LLAMA_3" | "GPT_4O";

export function routeModel(complexity: PromptComplexity, confidence = 1): ModelUsed {
  // If classifier confidence is weak, use safer mid-tier routing.
  if (confidence < 0.55) return "LLAMA_3";

  switch (complexity) {
    case "SIMPLE":
      return "PHI_3_MINI";
    case "MEDIUM":
      return "LLAMA_3";
    case "COMPLEX":
      return "GPT_4O";
  }
}

