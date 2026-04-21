"use client";

import * as React from "react";
import dynamic from "next/dynamic";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatUsd } from "@/lib/costCalculator";
const CostComparisonLine = dynamic(
  () => import("@/components/charts/CostComparisonLine").then((m) => m.CostComparisonLine),
  { ssr: false, loading: () => <div className="grid h-full place-items-center text-sm text-white/60">Loading chart…</div> },
);

type HealthResponse = {
  status: string;
  at: string;
  providers: { model: string; failures: number; circuitOpen: boolean; retryAt: number | null; configured: boolean }[];
};

type Analytics = {
  totalPrompts: number;
  totalTokens: number;
  modelUsage: Record<string, number>;
  complexityUsage: Record<string, number>;
  strategyUsage: Record<string, number>;
  fallbackUsage: Record<string, number>;
  cacheHitRate: number;
  totalActualCostUsd: number;
  latestActualCostUsd: number;
  avgActualCostUsd: number;
  totalGpt4oCostUsd: number;
  totalSavingsUsd: number;
  totalSavingsPercent: number;
  savingsSeries: { day: string; actual: number; gpt4o: number; savings: number }[];
};

type TopUser = { email: string; tokens: number; costUsd: number; prompts: number };

export default function AdminOverviewPage() {
  const [health, setHealth] = React.useState<HealthResponse | null>(null);
  const [analytics, setAnalytics] = React.useState<Analytics | null>(null);
  const [topUsers, setTopUsers] = React.useState<TopUser[]>([]);
  const [error, setError] = React.useState<string | null>(null);
  const [topUsersAccessDenied, setTopUsersAccessDenied] = React.useState(false);
  const [loading, setLoading] = React.useState(true);
  const [liveMode, setLiveMode] = React.useState(true);
  const [lastUpdatedAt, setLastUpdatedAt] = React.useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const [h, a, t] = await Promise.all([
        fetch("/api/health", { cache: "no-store" }),
        fetch("/api/analytics", { cache: "no-store" }),
        fetch("/api/admin/top-users", { cache: "no-store" }),
      ]);
      const hj = await h.json();
      if (!h.ok) throw new Error(hj?.error || "Failed to load health");
      const aj = await a.json();
      if (!a.ok) throw new Error(aj?.error || "Failed to load analytics");
      const tj = await t.json();

      setHealth(hj as HealthResponse);
      setAnalytics(aj as Analytics);
      if (t.ok) {
        setTopUsers((tj?.users ?? []) as TopUser[]);
        setTopUsersAccessDenied(false);
      } else if (t.status === 401 || t.status === 403) {
        setTopUsers([]);
        setTopUsersAccessDenied(true);
      } else {
        throw new Error(tj?.error || "Failed to load top users");
      }
      setLastUpdatedAt(new Date().toISOString());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }

  React.useEffect(() => {
    void load();
  }, []);

  React.useEffect(() => {
    if (!liveMode) return;
    const id = window.setInterval(() => {
      void load();
    }, 10000);
    return () => window.clearInterval(id);
  }, [liveMode]);

  return (
    <div className="space-y-8">
      <div className="flex items-end justify-between gap-4 rounded-2xl border border-white/10 bg-white/[0.03] p-5">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Admin overview</h1>
          <p className="mt-1 text-sm text-white/70">Health, costs, and top users.</p>
          <p className="mt-1 text-xs text-white/50">
            Costs are estimated API usage charges (token-based), not flat consumer subscriptions.
          </p>
          <p className="mt-1 text-xs text-white/50">
            {lastUpdatedAt ? `Last updated: ${new Date(lastUpdatedAt).toLocaleTimeString()}` : "Not loaded yet"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant={liveMode ? "default" : "outline"} size="sm" onClick={() => setLiveMode((v) => !v)}>
            {liveMode ? "Live: ON" : "Live: OFF"}
          </Button>
          <Button variant="outline" size="sm" onClick={load} disabled={loading}>
            {loading ? "Refreshing…" : "Refresh"}
          </Button>
        </div>
      </div>

      {error ? <div className="text-sm text-red-300">{error}</div> : null}

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader>
            <CardTitle>Total prompts</CardTitle>
            <CardDescription>Current user scope</CardDescription>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">{analytics?.totalPrompts ?? "—"}</CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Actual cost</CardTitle>
            <CardDescription>Routed</CardDescription>
          </CardHeader>
          <CardContent className="space-y-1">
            <div className="text-2xl font-semibold">{analytics ? formatUsd(analytics.totalActualCostUsd) : "—"}</div>
            <div className="text-xs text-white/60">
              latest: {analytics ? formatUsd(analytics.latestActualCostUsd) : "—"} • avg/prompt:{" "}
              {analytics ? formatUsd(analytics.avgActualCostUsd) : "—"}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Savings</CardTitle>
            <CardDescription>Vs GPT‑4o</CardDescription>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">
            {analytics ? formatUsd(analytics.totalSavingsUsd) : "—"}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Cache hit rate</CardTitle>
            <CardDescription>Recent requests</CardDescription>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">
            {analytics ? `${Math.round((analytics.cacheHitRate ?? 0) * 100)}%` : "—"}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-5">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Provider health</CardTitle>
            <CardDescription>Circuit breaker status</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {(health?.providers ?? []).map((p) => (
              <div key={p.model} className="rounded-xl border border-white/10 bg-white/5 p-3">
                <div className="flex items-center justify-between">
                  <div className="font-medium">{p.model}</div>
                  <div className="text-white/60">{p.configured ? "configured" : "not configured"}</div>
                </div>
                <div className="mt-1 text-xs text-white/60">
                  failures: {p.failures} • circuit: {p.circuitOpen ? "open" : "closed"}
                </div>
              </div>
            ))}
            {!loading && !health ? <div className="text-white/60">No health data.</div> : null}
          </CardContent>
        </Card>

        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle>Top users</CardTitle>
            <CardDescription>
              {topUsersAccessDenied ? "Admin allowlist required for cross-user view" : "By estimated cost (recent)"}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {topUsers.map((u) => (
              <div key={u.email} className="rounded-xl border border-white/10 bg-white/5 p-3">
                <div className="flex items-center justify-between gap-4">
                  <div className="font-medium">{u.email}</div>
                  <div className="text-white/70">{formatUsd(u.costUsd)}</div>
                </div>
                <div className="mt-1 text-xs text-white/60">
                  prompts: {u.prompts} • tokens: {u.tokens}
                </div>
              </div>
            ))}
            {!loading && topUsersAccessDenied ? (
              <div className="text-amber-200/90">
                Top users is restricted. Add your email to <code>ADMIN_EMAILS</code> to enable this panel.
              </div>
            ) : null}
            {!loading && topUsers.length === 0 && !topUsersAccessDenied ? (
              <div className="text-white/60">No user data yet.</div>
            ) : null}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Cost trend</CardTitle>
          <CardDescription>Actual vs GPT-4o baseline over recent activity</CardDescription>
        </CardHeader>
        <CardContent className="h-72">
          <CostComparisonLine data={(analytics?.savingsSeries ?? []).slice(-30)} />
        </CardContent>
      </Card>
    </div>
  );
}

