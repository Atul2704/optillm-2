export type PromptComplexity = "SIMPLE" | "MEDIUM" | "COMPLEX";

type TrainingSample = { text: string; label: PromptComplexity };

const TRAINING_SET: TrainingSample[] = [
  { text: "hi", label: "SIMPLE" },
  { text: "hello", label: "SIMPLE" },
  { text: "summarize this in 2 lines", label: "SIMPLE" },
  { text: "rewrite this sentence politely", label: "SIMPLE" },
  { text: "draft a short email reply", label: "SIMPLE" },
  { text: "translate this paragraph to hindi", label: "MEDIUM" },
  { text: "create an api endpoint for user profile", label: "MEDIUM" },
  { text: "explain jwt auth flow with middleware", label: "MEDIUM" },
  { text: "optimize this sql query and index plan", label: "MEDIUM" },
  { text: "generate test cases for this function", label: "MEDIUM" },
  { text: "write an ai research paper with citations", label: "COMPLEX" },
  { text: "design distributed architecture for 10 million users", label: "COMPLEX" },
  { text: "analyze time complexity and prove correctness", label: "COMPLEX" },
  { text: "compare transformer variants with tradeoff analysis", label: "COMPLEX" },
  { text: "build complete multi-tenant rbac system with threat model", label: "COMPLEX" },
];

const CLASSES: PromptComplexity[] = ["SIMPLE", "MEDIUM", "COMPLEX"];
const ALPHA = 1; // Laplace smoothing

function tokenize(text: string) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter(Boolean);
}

type NbModel = {
  priors: Record<PromptComplexity, number>;
  tokenCounts: Record<PromptComplexity, Record<string, number>>;
  totalTokensByClass: Record<PromptComplexity, number>;
  vocabulary: Set<string>;
};

function trainNaiveBayes(samples: TrainingSample[]): NbModel {
  const classDocs: Record<PromptComplexity, number> = { SIMPLE: 0, MEDIUM: 0, COMPLEX: 0 };
  const tokenCounts: Record<PromptComplexity, Record<string, number>> = {
    SIMPLE: {},
    MEDIUM: {},
    COMPLEX: {},
  };
  const totalTokensByClass: Record<PromptComplexity, number> = { SIMPLE: 0, MEDIUM: 0, COMPLEX: 0 };
  const vocabulary = new Set<string>();

  for (const s of samples) {
    classDocs[s.label] += 1;
    const tokens = tokenize(s.text);
    for (const t of tokens) {
      vocabulary.add(t);
      tokenCounts[s.label][t] = (tokenCounts[s.label][t] ?? 0) + 1;
      totalTokensByClass[s.label] += 1;
    }
  }

  const totalDocs = samples.length || 1;
  const priors: Record<PromptComplexity, number> = {
    SIMPLE: classDocs.SIMPLE / totalDocs,
    MEDIUM: classDocs.MEDIUM / totalDocs,
    COMPLEX: classDocs.COMPLEX / totalDocs,
  };

  return { priors, tokenCounts, totalTokensByClass, vocabulary };
}

const MODEL = trainNaiveBayes(TRAINING_SET);

function addFeatureTokens(tokens: string[], text: string) {
  const length = text.trim().length;
  if (length < 40) tokens.push("__len_short");
  else if (length > 180) tokens.push("__len_long");
  else tokens.push("__len_mid");

  if (/\b(explain|analyze|compare|design|architecture|research|proof)\b/.test(text.toLowerCase())) {
    tokens.push("__reasoning");
  }
}

function predictComplexity(text: string) {
  const tokens = tokenize(text);
  addFeatureTokens(tokens, text);
  const vocabSize = MODEL.vocabulary.size + 3; // include feature tokens
  const scores: Record<PromptComplexity, number> = { SIMPLE: 0, MEDIUM: 0, COMPLEX: 0 };

  for (const c of CLASSES) {
    // log prior
    scores[c] = Math.log(Math.max(MODEL.priors[c], 1e-9));
    const denom = MODEL.totalTokensByClass[c] + ALPHA * vocabSize;
    for (const t of tokens) {
      const count = MODEL.tokenCounts[c][t] ?? 0;
      const prob = (count + ALPHA) / denom;
      scores[c] += Math.log(prob);
    }
  }

  const maxLog = Math.max(scores.SIMPLE, scores.MEDIUM, scores.COMPLEX);
  const expSimple = Math.exp(scores.SIMPLE - maxLog);
  const expMedium = Math.exp(scores.MEDIUM - maxLog);
  const expComplex = Math.exp(scores.COMPLEX - maxLog);
  const z = expSimple + expMedium + expComplex;
  const probs = {
    SIMPLE: expSimple / z,
    MEDIUM: expMedium / z,
    COMPLEX: expComplex / z,
  };

  const complexity = (Object.entries(probs).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "MEDIUM") as PromptComplexity;
  const confidence = probs[complexity];
  return { complexity, confidence, probs };
}

export function classifyPrompt(promptText: string): {
  complexity: PromptComplexity;
  reasons: string[];
  length: number;
  confidence: number;
} {
  const text = (promptText ?? "").trim();
  const length = text.length;
  const reasons: string[] = [];
  if (!text) {
    return { complexity: "SIMPLE", reasons: ["Empty prompt fallback"], length: 0, confidence: 0.99 };
  }

  // Deterministic guards for extreme cases (stabilizes quality for obvious prompts).
  if (length <= 12) {
    return {
      complexity: "SIMPLE",
      reasons: ["Ultra-short prompt guard", "ML-assisted routing"],
      length,
      confidence: 0.9,
    };
  }
  if (length >= 220) {
    return {
      complexity: "COMPLEX",
      reasons: ["Long prompt guard", "ML-assisted routing"],
      length,
      confidence: 0.92,
    };
  }
  if (/\b(explain|analyze|compare|design|architecture|research|proof|threat model)\b/.test(text.toLowerCase())) {
    return {
      complexity: "COMPLEX",
      reasons: ["Reasoning intent guard", "ML-assisted routing"],
      length,
      confidence: 0.86,
    };
  }

  const pred = predictComplexity(text);
  reasons.push(`ML Naive Bayes classified as ${pred.complexity}`);
  reasons.push(`Class probabilities S/M/C: ${pred.probs.SIMPLE.toFixed(2)}/${pred.probs.MEDIUM.toFixed(2)}/${pred.probs.COMPLEX.toFixed(2)}`);
  if (length < 40) reasons.push("Short prompt feature");
  if (length > 180) reasons.push("Long prompt feature");

  return { complexity: pred.complexity, reasons, length, confidence: pred.confidence };
}

