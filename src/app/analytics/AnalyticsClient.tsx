"use client";

import * as React from "react";
import dynamic from "next/dynamic";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatUsd } from "@/lib/costCalculator";
import { Download, RefreshCw } from "lucide-react";

const ModelUsagePie = dynamic(
  () => import("@/components/charts/ModelUsagePie").then((m) => m.ModelUsagePie),
  { ssr: false, loading: () => <div className="grid h-full place-items-center text-sm text-white/60">Loading chart…</div> },
);
const CostComparisonLine = dynamic(
  () => import("@/components/charts/CostComparisonLine").then((m) => m.CostComparisonLine),
  { ssr: false, loading: () => <div className="grid h-full place-items-center text-sm text-white/60">Loading chart…</div> },
);
const ModelComparisonBars = dynamic(
  () => import("@/components/charts/ModelComparisonBars").then((m) => m.ModelComparisonBars),
  { ssr: false, loading: () => <div className="grid h-full place-items-center text-sm text-white/60">Loading chart…</div> },
);

type Analytics = {
  totalPrompts: number;
  totalTokens: number;
  totalInputTokens: number;
  totalOutputTokens: number;
  modelUsage: Record<string, number>;
  modelTokens: Record<string, number>;
  modelCostUsd: Record<string, number>;
  providerUsage: Record<string, number>;
  complexityUsage: Record<string, number>;
  strategyUsage: Record<string, number>;
  fallbackUsage: Record<string, number>;
  cacheHitRate: number;
  successRate: number;
  responseTimeStats: { total: number; count: number; avg: number };
  totalActualCostUsd: number;
  latestActualCostUsd: number;
  avgActualCostUsd: number;
  totalGpt4oCostUsd: number;
  totalSavingsUsd: number;
  totalSavingsPercent: number;
  savingsSeries: { day: string; actual: number; gpt4o: number; savings: number; prompts: number; tokens: number; avgResponseTime: number }[];
  dateRange: { start: string; end: string };
  scope: "global" | "user";
  realtime: {
    last5MinPrompts: number;
    last15MinPrompts: number;
    last60MinPrompts: number;
    promptsPerMinute: number;
  };
  recentEvents: {
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
  groupedPrompts: {
    promptText: string;
    count: number;
    latestAt: string;
    totalCostUsd: number;
    modelUsage: Record<string, number>;
  }[];
};

function ComplexityPills({ usage }: { usage: Record<string, number> }) {
  const entries = Object.entries(usage).sort((a, b) => b[1] - a[1]);
  return (
    <div className="flex flex-wrap gap-2">
      {entries.map(([k, v]) => (
        <Badge key={k} className="bg-white/5">
          {k}: {v}
        </Badge>
      ))}
    </div>
  );
}

function MoneyPills({ usage }: { usage: Record<string, number> }) {
  const entries = Object.entries(usage).sort((a, b) => b[1] - a[1]);
  return (
    <div className="flex flex-wrap gap-2">
      {entries.map(([k, v]) => (
        <Badge key={k} className="bg-white/5">
          {k}: {formatUsd(v)}
        </Badge>
      ))}
    </div>
  );
}

export function AnalyticsClient() {
  const [data, setData] = React.useState<Analytics | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [liveMode, setLiveMode] = React.useState(true);
  const [lastUpdatedAt, setLastUpdatedAt] = React.useState<string | null>(null);
  const [startDate, setStartDate] = React.useState(() => {
    const date = new Date();
    date.setDate(date.getDate() - 30);
    return date.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = React.useState(() => new Date().toISOString().split('T')[0]);
  const [exporting, setExporting] = React.useState<string | null>(null);

  const costSeries = React.useMemo(() => {
    const events = (data?.recentEvents ?? []).slice().reverse();
    if (events.length < 3) return (data?.savingsSeries ?? []).slice(-30);
    return events.slice(-30).map((e, idx) => ({
      day: `${String(idx + 1).padStart(2, "0")} ${new Date(e.createdAt).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      })}`,
      actual: e.estimatedCostUsd,
      gpt4o: e.gpt4oCostUsd,
      savings: Math.max(0, e.gpt4oCostUsd - e.estimatedCostUsd),
      prompts: 1,
      tokens: e.tokens,
      avgResponseTime: 0,
    }));
  }, [data]);

  function toStartOfDayIso(dateStr: string) {
    const d = new Date(`${dateStr}T00:00:00`);
    return d.toISOString();
  }

  function toEndOfDayIso(dateStr: string) {
    const d = new Date(`${dateStr}T23:59:59.999`);
    return d.toISOString();
  }

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        startDate: toStartOfDayIso(startDate),
        endDate: toEndOfDayIso(endDate),
        scope: "user",
      });
      const res = await fetch(`/api/analytics?${params}`, { cache: "no-store" });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "Failed to load analytics");
      setData(json as Analytics);
      setLastUpdatedAt(new Date().toISOString());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }

  async function exportData(format: 'csv' | 'json') {
    setExporting(format);
    try {
      const params = new URLSearchParams({
        startDate: toStartOfDayIso(startDate),
        endDate: toEndOfDayIso(endDate),
        format,
        scope: "user",
      });
      const res = await fetch(`/api/analytics?${params}`);
      if (!res.ok) throw new Error('Export failed');

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `analytics_${startDate}_${endDate}.${format}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Export failed");
    } finally {
      setExporting(null);
    }
  }

  React.useEffect(() => {
    void load();
  }, [startDate, endDate]);

  React.useEffect(() => {
    if (!liveMode) return;
    const id = window.setInterval(() => {
      void load();
    }, 10000);
    return () => window.clearInterval(id);
  }, [liveMode, startDate, endDate]);

  return (
    <div className="space-y-8">
      <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">Analytics</h1>
          <p className="mt-1 text-sm text-white/70">
            Advanced analytics dashboard with real-time metrics and export capabilities.
          </p>
          <p className="mt-1 text-xs text-cyan-300/80">
            Data scope: {data?.scope === "user" ? "Your account" : "Global traffic"}
          </p>
          <p className="mt-1 text-xs text-white/50">
            {lastUpdatedAt ? `Last updated: ${new Date(lastUpdatedAt).toLocaleTimeString()}` : "Not loaded yet"}
          </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button variant={liveMode ? "default" : "outline"} size="sm" onClick={() => setLiveMode((v) => !v)}>
              {liveMode ? "Live: ON" : "Live: OFF"}
            </Button>
            <div className="flex flex-wrap items-center gap-2 rounded-xl border border-white/10 bg-white/5 p-2">
              <div className="flex items-center gap-1">
                <Label htmlFor="start-date" className="text-sm">From:</Label>
                <Input
                  id="start-date"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-36"
                />
              </div>
              <div className="flex items-center gap-1">
                <Label htmlFor="end-date" className="text-sm">To:</Label>
                <Input
                  id="end-date"
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-36"
                />
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={load} disabled={loading}>
              <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              {loading ? "Loading…" : "Refresh"}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => exportData('csv')}
              disabled={exporting === 'csv'}
            >
              <Download className="w-4 h-4 mr-2" />
              {exporting === 'csv' ? 'Exporting…' : 'CSV'}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => exportData('json')}
              disabled={exporting === 'json'}
            >
              <Download className="w-4 h-4 mr-2" />
              {exporting === 'json' ? 'Exporting…' : 'JSON'}
            </Button>
          </div>
        </div>
      </div>

      {error ? <div className="text-sm text-red-300">{error}</div> : null}

      <div className="grid gap-4 md:grid-cols-6">
        <Card className="border-cyan-500/20 bg-cyan-500/[0.04]">
          <CardHeader>
            <CardTitle>Total prompts</CardTitle>
            <CardDescription>Logged requests</CardDescription>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">{data?.totalPrompts ?? "—"}</CardContent>
        </Card>
        <Card className="border-violet-500/20 bg-violet-500/[0.04]">
          <CardHeader>
            <CardTitle>Total tokens</CardTitle>
            <CardDescription>Input + Output</CardDescription>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">{data?.totalTokens ?? "—"}</CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Input tokens</CardTitle>
            <CardDescription>Prompt tokens</CardDescription>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">{data?.totalInputTokens ?? "—"}</CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Output tokens</CardTitle>
            <CardDescription>Response tokens</CardDescription>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">{data?.totalOutputTokens ?? "—"}</CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Actual cost</CardTitle>
            <CardDescription>Routed model costs</CardDescription>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">
            {data ? formatUsd(data.totalActualCostUsd) : "—"}
            <div className="mt-1 text-xs font-normal text-white/60">
              latest: {data ? formatUsd(data.latestActualCostUsd) : "—"} • avg/prompt:{" "}
              {data ? formatUsd(data.avgActualCostUsd) : "—"}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Savings</CardTitle>
            <CardDescription>Vs GPT‑4o baseline</CardDescription>
          </CardHeader>
          <CardContent className="space-y-1">
            <div className="text-2xl font-semibold">
              {data ? formatUsd(data.totalSavingsUsd) : "—"}
            </div>
            <div className="text-sm text-white/60">
              {data ? `${Math.round(data.totalSavingsPercent)}%` : "—"}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader>
            <CardTitle>Last 5 min</CardTitle>
            <CardDescription>Prompt volume</CardDescription>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">{data?.realtime?.last5MinPrompts ?? 0}</CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Last 15 min</CardTitle>
            <CardDescription>Prompt volume</CardDescription>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">{data?.realtime?.last15MinPrompts ?? 0}</CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Last 60 min</CardTitle>
            <CardDescription>Prompt volume</CardDescription>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">{data?.realtime?.last60MinPrompts ?? 0}</CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Prompts/min</CardTitle>
            <CardDescription>15-minute average</CardDescription>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">{data?.realtime?.promptsPerMinute ?? 0}</CardContent>
        </Card>
      </div>

      <Card className="border-white/15 bg-white/[0.03]">
        <CardHeader>
          <CardTitle>Prompt groups (compact)</CardTitle>
          <CardDescription>Same prompts are grouped to save space</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          {(data?.groupedPrompts ?? []).map((grp, idx) => (
            <div key={`${grp.promptText}-${idx}`} className="rounded-xl border border-white/10 bg-white/5 p-3">
              <div className="flex items-center justify-between gap-2">
                <div className="font-medium line-clamp-1">{grp.promptText}</div>
                <div className="text-xs text-cyan-300">x{grp.count}</div>
              </div>
              <div className="mt-1 text-xs text-white/60">
                latest: {new Date(grp.latestAt).toLocaleString()} • grouped cost: {formatUsd(grp.totalCostUsd)}
              </div>
              <div className="mt-1 text-xs text-white/50">
                models: {Object.entries(grp.modelUsage).map(([m, c]) => `${m}(${c})`).join(" • ")}
              </div>
            </div>
          ))}
          {!loading && (data?.groupedPrompts?.length ?? 0) === 0 ? (
            <div className="rounded-xl border border-dashed border-white/15 bg-white/5 p-4 text-white/70">
              No real provider data yet. Submit prompts from dashboard after configuring provider API keys.
            </div>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>AI model comparison</CardTitle>
          <CardDescription>Compare model usage and effective cost per prompt</CardDescription>
        </CardHeader>
        <CardContent className="h-80">
          <ModelComparisonBars
            data={["PHI_3_MINI", "LLAMA_3", "GPT_4O"].map((model) => {
              const prompts = data?.modelUsage?.[model] ?? 0;
              const cost = data?.modelCostUsd?.[model] ?? 0;
              return {
                model,
                prompts,
                totalCost: cost,
                avgCost: prompts > 0 ? cost / prompts : 0,
              };
            })}
          />
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Performance Metrics</CardTitle>
            <CardDescription>Success rates and cache hits</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between">
              <span className="text-sm">Success Rate:</span>
              <span className="font-semibold">{data ? `${Math.round(data.successRate * 100)}%` : "—"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm">Cache Hit Rate:</span>
              <span className="font-semibold">{data ? `${Math.round(data.cacheHitRate * 100)}%` : "—"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm">Avg Response Time:</span>
              <span className="font-semibold">{data?.responseTimeStats?.avg ? `${Math.round(data.responseTimeStats.avg)}ms` : "—"}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Provider Usage</CardTitle>
            <CardDescription>AI provider distribution</CardDescription>
          </CardHeader>
          <CardContent>
            <ComplexityPills usage={data?.providerUsage ?? {}} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Error Analysis</CardTitle>
            <CardDescription>Fallback reasons</CardDescription>
          </CardHeader>
          <CardContent>
            {Object.keys(data?.fallbackUsage ?? {}).length > 0 ? (
              <ComplexityPills usage={data?.fallbackUsage ?? {}} />
            ) : (
              <div className="text-sm text-white/60">No errors in selected period</div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-5">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Model usage</CardTitle>
            <CardDescription>Pie distribution</CardDescription>
          </CardHeader>
          <CardContent className="h-72">
            <ModelUsagePie usage={data?.modelUsage ?? {}} />
          </CardContent>
        </Card>

        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle>Cost comparison</CardTitle>
            <CardDescription>Actual vs GPT‑4o baseline (recent)</CardDescription>
          </CardHeader>
          <CardContent className="h-72">
            <CostComparisonLine data={costSeries} />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Cost by model</CardTitle>
          <CardDescription>Actual routed spend split</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <MoneyPills usage={data?.modelCostUsd ?? {}} />
          <div className="text-sm text-white/60">Tokens by model</div>
          <ComplexityPills usage={data?.modelTokens ?? {}} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Complexity breakdown</CardTitle>
          <CardDescription>Classifier distribution</CardDescription>
        </CardHeader>
        <CardContent>
          <ComplexityPills usage={data?.complexityUsage ?? {}} />
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Strategy breakdown</CardTitle>
            <CardDescription>A/B routing strategy usage</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <ComplexityPills usage={data?.strategyUsage ?? {}} />
            <div className="text-sm text-white/60">
              Cache hit rate: {data ? `${Math.round((data.cacheHitRate ?? 0) * 100)}%` : "—"}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Fallback reasons</CardTitle>
            <CardDescription>When providers failed over</CardDescription>
          </CardHeader>
          <CardContent>
            <ComplexityPills usage={data?.fallbackUsage ?? {}} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

