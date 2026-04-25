"use client";

import * as React from "react";
import { motion } from "framer-motion";
import dynamic from "next/dynamic";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatUsd } from "@/lib/costCalculator";

const ModelUsagePie = dynamic(
  () => import("@/components/charts/ModelUsagePie").then((m) => m.ModelUsagePie),
  { ssr: false, loading: () => <div className="grid h-full place-items-center text-sm text-white/60">Loading chart…</div> },
);
const SavingsAreaChart = dynamic(
  () => import("@/components/charts/SavingsAreaChart").then((m) => m.SavingsAreaChart),
  { ssr: false, loading: () => <div className="grid h-full place-items-center text-sm text-white/60">Loading chart…</div> },
);

type RouterResult = {
  id: string;
  createdAt: string;
  promptText: string;
  complexity: "SIMPLE" | "MEDIUM" | "COMPLEX";
  reasons: string[];
  confidence: number;
  strategy: string;
  modelUsed: "PHI_3_MINI" | "LLAMA_3" | "GPT_4O";
  provider: "openai" | "openai-compatible" | "anthropic" | "google" | "mistral" | "mock";
  rawModel: string;
  fallbackReason: string | null;
  cacheHit: boolean;
  responseText: string;
  tokens: number;
  inputTokens: number;
  outputTokens: number;
  estimatedCostUsd: number;
  gpt4oCostUsd: number;
  savingsUsd: number;
  savingsPercent: number;
};

type PromptMode = "cost_cutting" | "efficiency" | "fast";

type Analytics = {
  totalPrompts: number;
  totalTokens: number;
  modelUsage: Record<string, number>;
  modelCostUsd?: Record<string, number>;
  totalActualCostUsd: number;
  totalGpt4oCostUsd: number;
  totalSavingsUsd: number;
  totalSavingsPercent: number;
  savingsSeries: { day: string; actual: number; gpt4o: number; savings: number }[];
  recentEvents?: {
    createdAt: string;
    promptText: string;
    modelUsed: string;
    complexity: string;
    provider: string | null;
    tokens: number;
    estimatedCostUsd: number;
    gpt4oCostUsd: number;
    strategy: string;
    cacheHit: boolean;
    fallbackReason: string | null;
  }[];
};

type MeResponse = {
  user: { id: string; email: string } | null;
};

type MyRecord = {
  id: string;
  createdAt: string;
  promptText: string;
  modelUsed: "PHI_3_MINI" | "LLAMA_3" | "GPT_4O";
  complexity: "SIMPLE" | "MEDIUM" | "COMPLEX";
  tokens: number;
  estimatedCostUsd: number;
  strategy: string;
  cacheHit: boolean;
};

type MyRecordsResponse = {
  user: { id: string; email: string } | null;
  totals: { prompts: number; tokens: number; costUsd: number };
  groupedRecords: {
    promptText: string;
    count: number;
    latestCreatedAt: string;
    totalTokens: number;
    totalEstimatedCostUsd: number;
    modelUsage: Record<string, number>;
  }[];
  records: MyRecord[];
};

function modelLabel(m: RouterResult["modelUsed"]) {
  if (m === "PHI_3_MINI") return "Phi‑3 Mini";
  if (m === "LLAMA_3") return "LLaMA 3";
  return "GPT‑4o";
}

function complexityColor(c: RouterResult["complexity"]) {
  if (c === "SIMPLE") return "border-emerald-400/20 bg-emerald-400/10";
  if (c === "MEDIUM") return "border-cyan-400/20 bg-cyan-400/10";
  return "border-violet-400/20 bg-violet-400/10";
}

export function DashboardClient() {
  const [promptText, setPromptText] = React.useState(
    "Explain the difference between authentication and authorization, with examples.",
  );
  const [loading, setLoading] = React.useState(false);
  const [promptMode, setPromptMode] = React.useState<PromptMode>("cost_cutting");
  const [result, setResult] = React.useState<RouterResult | null>(null);
  const [analytics, setAnalytics] = React.useState<Analytics | null>(null);
  const [me, setMe] = React.useState<MeResponse["user"] | null>(null);
  const [myRecords, setMyRecords] = React.useState<MyRecord[]>([]);
  const [groupedRecords, setGroupedRecords] = React.useState<MyRecordsResponse["groupedRecords"]>([]);
  const [myTotals, setMyTotals] = React.useState<{ prompts: number; tokens: number; costUsd: number } | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  const optimizationSeries = React.useMemo(() => {
    const events = (analytics?.recentEvents ?? []).slice().reverse();
    if (events.length < 3) return analytics?.savingsSeries ?? [];
    return events.slice(-30).map((e, idx) => ({
      day: `${String(idx + 1).padStart(2, "0")} ${new Date(e.createdAt).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      })}`,
      actual: e.estimatedCostUsd,
      gpt4o: e.gpt4oCostUsd,
      savings: Math.max(0, e.gpt4oCostUsd - e.estimatedCostUsd),
    }));
  }, [analytics]);

  async function refreshAnalytics() {
    const res = await fetch("/api/analytics", { cache: "no-store" });
    if (!res.ok) return;
    const json = (await res.json()) as Analytics;
    setAnalytics(json);
  }

  React.useEffect(() => {
    void refreshAnalytics();
    void (async () => {
      const res = await fetch("/api/auth/me", { cache: "no-store" });
      if (!res.ok) return;
      const json = (await res.json()) as MeResponse;
      setMe(json.user);
    })();
    void (async () => {
      const res = await fetch("/api/auth/me/records", { cache: "no-store" });
      if (!res.ok) return;
      const json = (await res.json()) as MyRecordsResponse;
      setMyRecords(json.records ?? []);
      setGroupedRecords(json.groupedRecords ?? []);
      setMyTotals(json.totals ?? null);
    })();
  }, []);

  async function onSubmit() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/router", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          promptText,
          promptMode,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json?.error || "Request failed");
        return;
      }
      setResult(json as RouterResult);
      await refreshAnalytics();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-8">
      <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
        <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
        <p className="mt-1 text-sm text-white/70">
          Test prompts, see routing decisions, and track costs & savings.
        </p>
      </div>

      {me ? (
        <Card className="border-emerald-400/20">
          <CardHeader>
            <CardTitle>Logged in</CardTitle>
            <CardDescription>{me.email}</CardDescription>
          </CardHeader>
          <CardContent className="text-sm">
            <div className="rounded-xl border border-emerald-400/20 bg-emerald-400/10 p-3">
              <div className="text-white/70">Status</div>
              <div className="mt-1 font-semibold text-emerald-200">Login successful</div>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {me ? (
        <Card>
          <CardHeader>
            <CardTitle>Your separate records</CardTitle>
            <CardDescription>Only your prompt history and usage data.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="grid gap-3 md:grid-cols-3">
              <div className="rounded-xl border border-white/10 bg-white/5 p-3">
                <div className="text-white/60">Your prompts</div>
                <div className="mt-1 text-lg font-semibold">{myTotals?.prompts ?? 0}</div>
              </div>
              <div className="rounded-xl border border-white/10 bg-white/5 p-3">
                <div className="text-white/60">Your tokens</div>
                <div className="mt-1 text-lg font-semibold">{myTotals?.tokens ?? 0}</div>
              </div>
              <div className="rounded-xl border border-white/10 bg-white/5 p-3">
                <div className="text-white/60">Your estimated cost</div>
                <div className="mt-1 text-lg font-semibold">{formatUsd(myTotals?.costUsd ?? 0)}</div>
              </div>
            </div>

            <div className="space-y-2">
              {groupedRecords.map((g, idx) => (
                <div key={`${g.promptText}-${idx}`} className="rounded-xl border border-white/10 bg-white/5 p-3">
                  <div className="flex items-center justify-between gap-3">
                    <div className="font-medium line-clamp-1">
                      {g.promptText}
                    </div>
                    <div className="text-xs text-cyan-300">x{g.count}</div>
                  </div>
                  <div className="mt-1 text-xs text-white/60">
                    latest: {new Date(g.latestCreatedAt).toLocaleString()} • tokens: {g.totalTokens} • cost:{" "}
                    {formatUsd(g.totalEstimatedCostUsd)}
                  </div>
                  <div className="mt-1 text-xs text-white/50">
                    models: {Object.entries(g.modelUsage).map(([m, c]) => `${m}(${c})`).join(" • ")}
                  </div>
                </div>
              ))}
              {groupedRecords.length === 0 ? (
                <div className="rounded-xl border border-dashed border-white/15 bg-white/5 p-3 text-white/60">
                  No personal records yet. Submit a prompt to start building your separate history.
                </div>
              ) : null}
            </div>
          </CardContent>
        </Card>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-5">
        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle>Prompt testing</CardTitle>
            <CardDescription>Submit a prompt and OptiLLM will route it.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Textarea
              value={promptText}
              onChange={(e) => setPromptText(e.target.value)}
              placeholder="Type your prompt…"
            />
            <div className="space-y-2">
              <div className="text-xs text-white/60">Prompt mode</div>
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant={promptMode === "cost_cutting" ? "default" : "outline"}
                  onClick={() => setPromptMode("cost_cutting")}
                >
                  Cost Cutting
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant={promptMode === "efficiency" ? "default" : "outline"}
                  onClick={() => setPromptMode("efficiency")}
                >
                  Efficiency
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant={promptMode === "fast" ? "default" : "outline"}
                  onClick={() => setPromptMode("fast")}
                >
                  Fast
                </Button>
              </div>
              <div className="text-xs text-white/50">
                {promptMode === "cost_cutting"
                  ? "Minimize cost while keeping acceptable quality."
                  : promptMode === "efficiency"
                    ? "Balanced mode for quality and cost efficiency."
                    : "Prioritize speed with quicker model choices."}
              </div>
            </div>
            <Button onClick={onSubmit} disabled={loading || !promptText.trim()} size="lg">
              {loading ? "Routing…" : "Submit prompt"}
            </Button>
            {error ? <div className="text-sm text-red-300">{error}</div> : null}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2 border-cyan-500/20 bg-cyan-500/[0.04]">
          <CardHeader>
            <CardTitle>Live savings</CardTitle>
            <CardDescription>Compared to always using GPT‑4o.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="rounded-xl border border-white/10 bg-white/5 p-3">
                <div className="text-white/60">Total prompts</div>
                <div className="mt-1 text-lg font-semibold">{analytics?.totalPrompts ?? "—"}</div>
              </div>
              <div className="rounded-xl border border-white/10 bg-white/5 p-3">
                <div className="text-white/60">Savings</div>
                <div className="mt-1 text-lg font-semibold">
                  {analytics ? formatUsd(analytics.totalSavingsUsd) : "—"}
                </div>
              </div>
              <div className="rounded-xl border border-white/10 bg-white/5 p-3">
                <div className="text-white/60">Actual cost</div>
                <div className="mt-1 text-lg font-semibold">
                  {analytics ? formatUsd(analytics.totalActualCostUsd) : "—"}
                </div>
              </div>
              <div className="rounded-xl border border-white/10 bg-white/5 p-3">
                <div className="text-white/60">GPT‑4o baseline</div>
                <div className="mt-1 text-lg font-semibold">
                  {analytics ? formatUsd(analytics.totalGpt4oCostUsd) : "—"}
                </div>
              </div>
            </div>
            <div className="rounded-2xl border border-emerald-400/20 bg-emerald-500/10 p-3">
              <div className="text-xs text-white/70">Optimization impact</div>
              <div className="mt-1 text-sm">
                Before optimization:{" "}
                <span className="font-semibold">{analytics ? formatUsd(analytics.totalGpt4oCostUsd) : "—"}</span>
              </div>
              <div className="mt-1 text-sm">
                After optimization:{" "}
                <span className="font-semibold">{analytics ? formatUsd(analytics.totalActualCostUsd) : "—"}</span>
              </div>
              <div className="mt-1 text-sm text-emerald-200">
                We reduced cost by{" "}
                <span className="font-semibold">
                  {analytics ? `${Math.round(analytics.totalSavingsPercent)}%` : "—"}
                </span>
              </div>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
              <div className="text-xs text-white/60">Savings over time (recent)</div>
              <div className="mt-2 h-40">
                <SavingsAreaChart data={optimizationSeries} />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {result ? (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: "easeOut" }}
          className="grid gap-4 lg:grid-cols-5"
        >
          <Card className="lg:col-span-3">
            <CardHeader>
              <CardTitle>Response</CardTitle>
              <CardDescription>Routed output + usage.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap items-center gap-2">
                <Badge className={`border ${complexityColor(result.complexity)}`}>
                  {result.complexity}
                </Badge>
                <Badge>{modelLabel(result.modelUsed)}</Badge>
                <Badge className="bg-white/5">{result.strategy}</Badge>
                <Badge className="bg-white/5">{result.provider}</Badge>
                <Badge className="bg-white/5">{result.tokens} tokens</Badge>
                <Badge className="bg-white/5">confidence {Math.round(result.confidence * 100)}%</Badge>
                {result.cacheHit ? <Badge className="bg-emerald-500/20">cache hit</Badge> : null}
              </div>

              <div className="rounded-2xl border border-white/10 bg-black/30 p-4">
                <div className="text-xs text-white/60">AI response</div>
                <pre className="mt-2 whitespace-pre-wrap text-sm leading-6 text-white/85">
                  {result.responseText}
                </pre>
              </div>
            </CardContent>
          </Card>

          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Cost breakdown</CardTitle>
              <CardDescription>Estimated for prototype pricing.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl border border-white/10 bg-white/5 p-3">
                  <div className="text-white/60">GPT‑4o cost</div>
                  <div className="mt-1 text-base font-semibold">{formatUsd(result.gpt4oCostUsd)}</div>
                </div>
                <div className="rounded-xl border border-white/10 bg-white/5 p-3">
                  <div className="text-white/60">Selected cost</div>
                  <div className="mt-1 text-base font-semibold">
                    {formatUsd(result.estimatedCostUsd)}
                  </div>
                </div>
                <div className="rounded-xl border border-white/10 bg-white/5 p-3">
                  <div className="text-white/60">Savings</div>
                  <div className="mt-1 text-base font-semibold">{formatUsd(result.savingsUsd)}</div>
                </div>
                <div className="rounded-xl border border-white/10 bg-white/5 p-3">
                  <div className="text-white/60">Savings %</div>
                  <div className="mt-1 text-base font-semibold">
                    {Math.round(result.savingsPercent)}%
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
                <div className="text-xs text-white/60">Routing rationale</div>
                <ul className="mt-2 list-disc space-y-1 pl-5 text-white/70">
                  {result.reasons.map((r) => (
                    <li key={r}>{r}</li>
                  ))}
                </ul>
                {result.fallbackReason ? (
                  <div className="mt-2 text-xs text-amber-200">Fallback chain: {result.fallbackReason}</div>
                ) : null}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Model usage</CardTitle>
            <CardDescription>Distribution across routed models.</CardDescription>
          </CardHeader>
          <CardContent className="h-72">
            <ModelUsagePie usage={analytics?.modelUsage ?? {}} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Notes</CardTitle>
            <CardDescription>Prototype assumptions</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-white/70">
            <div>
              - Routing uses the heuristic rules you specified (length + keywords).
            </div>
            <div>
              - If provider keys aren’t set, OptiLLM returns a mock response but still logs usage.
            </div>
            <div>
              - Pricing is a simple per-1K token table in <span className="text-white/85">`src/lib/costCalculator.ts`</span>.
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Request logs</CardTitle>
          <CardDescription>Recent optimized requests and model choices</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          {(analytics?.recentEvents ?? []).slice(0, 12).map((evt, idx) => (
            <div key={`${evt.createdAt}-${idx}`} className="rounded-xl border border-white/10 bg-white/5 p-3">
              <div className="flex items-center justify-between gap-2">
                <div className="font-medium line-clamp-1">{evt.promptText}</div>
                <div className="text-xs text-white/60">{new Date(evt.createdAt).toLocaleTimeString()}</div>
              </div>
              <div className="mt-1 text-xs text-white/60">
                {evt.modelUsed} • {evt.complexity} • {evt.tokens} tokens • {formatUsd(evt.estimatedCostUsd)} •{" "}
                {evt.strategy}
              </div>
            </div>
          ))}
          {(analytics?.recentEvents?.length ?? 0) === 0 ? (
            <div className="rounded-xl border border-dashed border-white/15 bg-white/5 p-3 text-white/60">
              No request logs yet. Submit prompts to populate optimization logs.
            </div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}

