export function estimateTokensFromText(text: string) {
  // Rough heuristic: ~4 chars/token for English, but prompts vary.
  // For a prototype we use max of (words*1.3) and (chars/4).
  const t = (text ?? "").trim();
  if (!t) return 0;
  const words = t.split(/\s+/).filter(Boolean).length;
  const byWords = Math.ceil(words * 1.3);
  const byChars = Math.ceil(t.length / 4);
  return Math.max(byWords, byChars);
}

