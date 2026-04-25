"use client";

import * as React from "react";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

type AdminUserRow = {
  id: string;
  email: string;
  role: "ADMIN" | "USER";
  createdAt: string;
  monthlyBudgetUsd: number | null;
  monthlyTokenLimit: number | null;
  prompts: number;
};

type Config = {
  abTestEnabled: boolean;
  abWeightCostAware: number;
  abWeightAlwaysGpt4o: number;
  abWeightConservative: number;
  rateLimitPerMinute: number;
  cacheTtlMs: number;
  defaultMonthlyBudgetUsd: number;
  defaultMonthlyTokenLimit: number;
  gpt4oInputPer1m: number;
  gpt4oOutputPer1m: number;
  llama3InputPer1m: number;
  llama3OutputPer1m: number;
  phi3InputPer1m: number;
  phi3OutputPer1m: number;
  claudeInputPer1m: number;
  claudeOutputPer1m: number;
  claudeHaikuInputPer1m: number;
  claudeHaikuOutputPer1m: number;
  geminiProInputPer1m: number;
  geminiProOutputPer1m: number;
  geminiFlashInputPer1m: number;
  geminiFlashOutputPer1m: number;
  mistralLargeInputPer1m: number;
  mistralLargeOutputPer1m: number;
  mistralMediumInputPer1m: number;
  mistralMediumOutputPer1m: number;
  mistralSmallInputPer1m: number;
  mistralSmallOutputPer1m: number;
  slackWebhookUrl: string | null;
  dailySpendAlertUsd: number | null;
  fallbackRateAlertPercent: number | null;
};

export default function AdminSettingsPage() {
  const [users, setUsers] = React.useState<AdminUserRow[]>([]);
  const [config, setConfig] = React.useState<Config | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [liveMode, setLiveMode] = React.useState(true);
  const [lastUpdatedAt, setLastUpdatedAt] = React.useState<string | null>(null);
  const [savingId, setSavingId] = React.useState<string | null>(null);
  const [savingConfig, setSavingConfig] = React.useState(false);
  const [refreshingPricing, setRefreshingPricing] = React.useState(false);
  const usdToInr = Number(process.env.NEXT_PUBLIC_USD_TO_INR ?? 83);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const [u, c] = await Promise.all([
        fetch("/api/admin/users", { cache: "no-store" }),
        fetch("/api/admin/config", { cache: "no-store" }),
      ]);
      const uj = await u.json();
      if (!u.ok) throw new Error(uj?.error || "Failed to load users");
      const cj = await c.json();
      if (!c.ok) throw new Error(cj?.error || "Failed to load config");

      setUsers((uj?.users ?? []) as AdminUserRow[]);
      setConfig((cj?.config ?? null) as Config | null);
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
    }, 15000);
    return () => window.clearInterval(id);
  }, [liveMode]);

  async function saveUser(user: AdminUserRow) {
    setSavingId(user.id);
    setError(null);
    try {
      const res = await fetch(`/api/admin/users/${user.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          monthlyBudgetUsd: user.monthlyBudgetUsd,
          monthlyTokenLimit: user.monthlyTokenLimit,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "Save failed");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setSavingId(null);
    }
  }

  async function saveConfig() {
    if (!config) return;
    setSavingConfig(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/config", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(config),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "Save failed");
      setConfig((json?.config ?? null) as Config | null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setSavingConfig(false);
    }
  }

  async function refreshOfficialPricing() {
    setRefreshingPricing(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/pricing/refresh", { method: "POST" });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "Refresh pricing failed");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setRefreshingPricing(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Admin settings</h1>
          <p className="mt-1 text-sm text-white/70">
            Global router config + per-user budgets.{" "}
            <Link className="text-white/80 underline" href="/admin/overview">
              Overview
            </Link>
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

      <Card>
        <CardHeader>
          <CardTitle>Global router config</CardTitle>
          <CardDescription>Stored in DB and applied automatically.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {config ? (
            <>
              <div className="grid gap-3 md:grid-cols-3">
                <div className="rounded-xl border border-white/10 bg-white/5 p-3">
                  <div className="text-xs text-white/60">A/B enabled (1=true)</div>
                  <Input
                    value={config.abTestEnabled ? "1" : "0"}
                    onChange={(e) =>
                      setConfig((p) => (p ? { ...p, abTestEnabled: e.target.value.trim() === "1" } : p))
                    }
                  />
                </div>
                <div className="rounded-xl border border-white/10 bg-white/5 p-3">
                  <div className="text-xs text-white/60">Rate limit / minute</div>
                  <Input
                    value={String(config.rateLimitPerMinute)}
                    onChange={(e) =>
                      setConfig((p) => (p ? { ...p, rateLimitPerMinute: Number(e.target.value) } : p))
                    }
                  />
                </div>
                <div className="rounded-xl border border-white/10 bg-white/5 p-3">
                  <div className="text-xs text-white/60">Cache TTL (ms)</div>
                  <Input
                    value={String(config.cacheTtlMs)}
                    onChange={(e) =>
                      setConfig((p) => (p ? { ...p, cacheTtlMs: Number(e.target.value) } : p))
                    }
                  />
                </div>
              </div>

              <div className="grid gap-3 md:grid-cols-3">
                <div className="rounded-xl border border-white/10 bg-white/5 p-3">
                  <div className="text-xs text-white/60">Default monthly budget (INR display)</div>
                  <Input
                    value={String(config.defaultMonthlyBudgetUsd)}
                    onChange={(e) =>
                      setConfig((p) => (p ? { ...p, defaultMonthlyBudgetUsd: Number(e.target.value) } : p))
                    }
                  />
                </div>
                <div className="rounded-xl border border-white/10 bg-white/5 p-3">
                  <div className="text-xs text-white/60">Default monthly token limit</div>
                  <Input
                    value={String(config.defaultMonthlyTokenLimit)}
                    onChange={(e) =>
                      setConfig((p) => (p ? { ...p, defaultMonthlyTokenLimit: Number(e.target.value) } : p))
                    }
                  />
                </div>
                <div className="rounded-xl border border-white/10 bg-white/5 p-3">
                  <div className="text-xs text-white/60">Slack webhook URL</div>
                  <Input
                    value={config.slackWebhookUrl ?? ""}
                    onChange={(e) =>
                      setConfig((p) => (p ? { ...p, slackWebhookUrl: e.target.value.trim() || null } : p))
                    }
                    placeholder="https://hooks.slack.com/services/…"
                  />
                </div>
              </div>

              <div className="grid gap-3 md:grid-cols-3">
                <div className="rounded-xl border border-white/10 bg-white/5 p-3">
                  <div className="text-xs text-white/60">Daily spend alert (INR display)</div>
                  <Input
                    value={config.dailySpendAlertUsd ?? ""}
                    onChange={(e) => {
                      const v = e.target.value.trim();
                      setConfig((p) => (p ? { ...p, dailySpendAlertUsd: v === "" ? null : Number(v) } : p));
                    }}
                  />
                </div>
                <div className="rounded-xl border border-white/10 bg-white/5 p-3">
                  <div className="text-xs text-white/60">Fallback rate alert %</div>
                  <Input
                    value={config.fallbackRateAlertPercent ?? ""}
                    onChange={(e) => {
                      const v = e.target.value.trim();
                      setConfig((p) =>
                        p ? { ...p, fallbackRateAlertPercent: v === "" ? null : Number(v) } : p,
                      );
                    }}
                  />
                </div>
                <div className="rounded-xl border border-white/10 bg-white/5 p-3">
                  <div className="text-xs text-white/60">A/B weights (cost / always / cons)</div>
                  <div className="grid grid-cols-3 gap-2">
                    <Input
                      value={String(config.abWeightCostAware)}
                      onChange={(e) =>
                        setConfig((p) => (p ? { ...p, abWeightCostAware: Number(e.target.value) } : p))
                      }
                    />
                    <Input
                      value={String(config.abWeightAlwaysGpt4o)}
                      onChange={(e) =>
                        setConfig((p) => (p ? { ...p, abWeightAlwaysGpt4o: Number(e.target.value) } : p))
                      }
                    />
                    <Input
                      value={String(config.abWeightConservative)}
                      onChange={(e) =>
                        setConfig((p) => (p ? { ...p, abWeightConservative: Number(e.target.value) } : p))
                      }
                    />
                  </div>
                </div>
              </div>

              <div className="grid gap-3 md:grid-cols-3">
                <div className="rounded-xl border border-white/10 bg-white/5 p-3">
                  <div className="text-xs text-white/60">GPT-4o (input/output per 1M tokens)</div>
                  <div className="grid grid-cols-2 gap-2">
                    <Input
                      value={String(config.gpt4oInputPer1m)}
                      onChange={(e) =>
                        setConfig((p) => (p ? { ...p, gpt4oInputPer1m: Number(e.target.value) } : p))
                      }
                    />
                    <Input
                      value={String(config.gpt4oOutputPer1m)}
                      onChange={(e) =>
                        setConfig((p) => (p ? { ...p, gpt4oOutputPer1m: Number(e.target.value) } : p))
                      }
                    />
                  </div>
                </div>
                <div className="rounded-xl border border-white/10 bg-white/5 p-3">
                  <div className="text-xs text-white/60">LLaMA 3 (input/output per 1M tokens)</div>
                  <div className="grid grid-cols-2 gap-2">
                    <Input
                      value={String(config.llama3InputPer1m)}
                      onChange={(e) =>
                        setConfig((p) => (p ? { ...p, llama3InputPer1m: Number(e.target.value) } : p))
                      }
                    />
                    <Input
                      value={String(config.llama3OutputPer1m)}
                      onChange={(e) =>
                        setConfig((p) => (p ? { ...p, llama3OutputPer1m: Number(e.target.value) } : p))
                      }
                    />
                  </div>
                </div>
                <div className="rounded-xl border border-white/10 bg-white/5 p-3">
                  <div className="text-xs text-white/60">Phi-3 route (input/output per 1M tokens)</div>
                  <div className="grid grid-cols-2 gap-2">
                    <Input
                      value={String(config.phi3InputPer1m)}
                      onChange={(e) =>
                        setConfig((p) => (p ? { ...p, phi3InputPer1m: Number(e.target.value) } : p))
                      }
                    />
                    <Input
                      value={String(config.phi3OutputPer1m)}
                      onChange={(e) =>
                        setConfig((p) => (p ? { ...p, phi3OutputPer1m: Number(e.target.value) } : p))
                      }
                    />
                  </div>
                </div>
              </div>

              <div className="text-xs font-medium text-white/70">Multi-provider reference pricing (per 1M tokens, INR shown below)</div>
              <div className="grid gap-3 md:grid-cols-3">
                <div className="rounded-xl border border-white/10 bg-white/5 p-3">
                  <div className="text-xs text-white/60">Claude Sonnet (GPT-4o tier)</div>
                  <div className="grid grid-cols-2 gap-2">
                    <Input
                      value={String(config.claudeInputPer1m)}
                      onChange={(e) =>
                        setConfig((p) => (p ? { ...p, claudeInputPer1m: Number(e.target.value) } : p))
                      }
                    />
                    <Input
                      value={String(config.claudeOutputPer1m)}
                      onChange={(e) =>
                        setConfig((p) => (p ? { ...p, claudeOutputPer1m: Number(e.target.value) } : p))
                      }
                    />
                  </div>
                </div>
                <div className="rounded-xl border border-white/10 bg-white/5 p-3">
                  <div className="text-xs text-white/60">Claude Haiku (Phi tier)</div>
                  <div className="grid grid-cols-2 gap-2">
                    <Input
                      value={String(config.claudeHaikuInputPer1m)}
                      onChange={(e) =>
                        setConfig((p) => (p ? { ...p, claudeHaikuInputPer1m: Number(e.target.value) } : p))
                      }
                    />
                    <Input
                      value={String(config.claudeHaikuOutputPer1m)}
                      onChange={(e) =>
                        setConfig((p) => (p ? { ...p, claudeHaikuOutputPer1m: Number(e.target.value) } : p))
                      }
                    />
                  </div>
                </div>
                <div className="rounded-xl border border-white/10 bg-white/5 p-3">
                  <div className="text-xs text-white/60">Gemini Pro (LLaMA+ tier)</div>
                  <div className="grid grid-cols-2 gap-2">
                    <Input
                      value={String(config.geminiProInputPer1m)}
                      onChange={(e) =>
                        setConfig((p) => (p ? { ...p, geminiProInputPer1m: Number(e.target.value) } : p))
                      }
                    />
                    <Input
                      value={String(config.geminiProOutputPer1m)}
                      onChange={(e) =>
                        setConfig((p) => (p ? { ...p, geminiProOutputPer1m: Number(e.target.value) } : p))
                      }
                    />
                  </div>
                </div>
                <div className="rounded-xl border border-white/10 bg-white/5 p-3">
                  <div className="text-xs text-white/60">Gemini Flash (Phi tier)</div>
                  <div className="grid grid-cols-2 gap-2">
                    <Input
                      value={String(config.geminiFlashInputPer1m)}
                      onChange={(e) =>
                        setConfig((p) => (p ? { ...p, geminiFlashInputPer1m: Number(e.target.value) } : p))
                      }
                    />
                    <Input
                      value={String(config.geminiFlashOutputPer1m)}
                      onChange={(e) =>
                        setConfig((p) => (p ? { ...p, geminiFlashOutputPer1m: Number(e.target.value) } : p))
                      }
                    />
                  </div>
                </div>
                <div className="rounded-xl border border-white/10 bg-white/5 p-3">
                  <div className="text-xs text-white/60">Mistral Large (GPT-4o tier)</div>
                  <div className="grid grid-cols-2 gap-2">
                    <Input
                      value={String(config.mistralLargeInputPer1m)}
                      onChange={(e) =>
                        setConfig((p) => (p ? { ...p, mistralLargeInputPer1m: Number(e.target.value) } : p))
                      }
                    />
                    <Input
                      value={String(config.mistralLargeOutputPer1m)}
                      onChange={(e) =>
                        setConfig((p) => (p ? { ...p, mistralLargeOutputPer1m: Number(e.target.value) } : p))
                      }
                    />
                  </div>
                </div>
                <div className="rounded-xl border border-white/10 bg-white/5 p-3">
                  <div className="text-xs text-white/60">Mistral Medium (LLaMA tier)</div>
                  <div className="grid grid-cols-2 gap-2">
                    <Input
                      value={String(config.mistralMediumInputPer1m)}
                      onChange={(e) =>
                        setConfig((p) => (p ? { ...p, mistralMediumInputPer1m: Number(e.target.value) } : p))
                      }
                    />
                    <Input
                      value={String(config.mistralMediumOutputPer1m)}
                      onChange={(e) =>
                        setConfig((p) => (p ? { ...p, mistralMediumOutputPer1m: Number(e.target.value) } : p))
                      }
                    />
                  </div>
                </div>
                <div className="rounded-xl border border-white/10 bg-white/5 p-3">
                  <div className="text-xs text-white/60">Mistral Small (Phi tier)</div>
                  <div className="grid grid-cols-2 gap-2">
                    <Input
                      value={String(config.mistralSmallInputPer1m)}
                      onChange={(e) =>
                        setConfig((p) => (p ? { ...p, mistralSmallInputPer1m: Number(e.target.value) } : p))
                      }
                    />
                    <Input
                      value={String(config.mistralSmallOutputPer1m)}
                      onChange={(e) =>
                        setConfig((p) => (p ? { ...p, mistralSmallOutputPer1m: Number(e.target.value) } : p))
                      }
                    />
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                <Button onClick={saveConfig} disabled={savingConfig}>
                  {savingConfig ? "Saving…" : "Save global config"}
                </Button>
                <Button variant="outline" onClick={refreshOfficialPricing} disabled={refreshingPricing}>
                  {refreshingPricing ? "Refreshing pricing…" : "Refresh official pricing"}
                </Button>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <div className="text-sm font-medium text-white/90">Pricing interpretation (read-only)</div>
                <div className="mt-1 text-xs text-white/60">
                  INR is shown for business readability. Core rates are token-based API prices, not flat subscriptions.
                </div>
                <div className="mt-3 grid gap-3 md:grid-cols-3">
                  <div className="rounded-xl border border-white/10 bg-black/20 p-3 text-xs text-white/70">
                    <div className="font-medium text-white/90">GPT-4o effective</div>
                    <div className="mt-1">
                      ~₹
                      {((((config.gpt4oInputPer1m * 0.65) + (config.gpt4oOutputPer1m * 0.35)) / 1000) * usdToInr).toFixed(4)}
                      {" "} | $
                      {(((config.gpt4oInputPer1m * 0.65) + (config.gpt4oOutputPer1m * 0.35)) / 1000).toFixed(6)}
                      {" "}per 1K tokens (65/35 mix)
                    </div>
                    <div className="mt-1">
                      Input/Output: ₹{(config.gpt4oInputPer1m * usdToInr).toFixed(2)} / ₹{(config.gpt4oOutputPer1m * usdToInr).toFixed(2)} per 1M
                    </div>
                  </div>
                  <div className="rounded-xl border border-white/10 bg-black/20 p-3 text-xs text-white/70">
                    <div className="font-medium text-white/90">LLaMA tier effective</div>
                    <div className="mt-1">
                      ~₹
                      {((((config.llama3InputPer1m * 0.65) + (config.llama3OutputPer1m * 0.35)) / 1000) * usdToInr).toFixed(4)}
                      {" "} | $
                      {(((config.llama3InputPer1m * 0.65) + (config.llama3OutputPer1m * 0.35)) / 1000).toFixed(6)}
                      {" "}per 1K tokens (65/35 mix)
                    </div>
                    <div className="mt-1">
                      Input/Output: ₹{(config.llama3InputPer1m * usdToInr).toFixed(2)} / ₹{(config.llama3OutputPer1m * usdToInr).toFixed(2)} per 1M
                    </div>
                  </div>
                  <div className="rounded-xl border border-white/10 bg-black/20 p-3 text-xs text-white/70">
                    <div className="font-medium text-white/90">Phi tier effective</div>
                    <div className="mt-1">
                      ~₹
                      {((((config.phi3InputPer1m * 0.65) + (config.phi3OutputPer1m * 0.35)) / 1000) * usdToInr).toFixed(4)}
                      {" "} | $
                      {(((config.phi3InputPer1m * 0.65) + (config.phi3OutputPer1m * 0.35)) / 1000).toFixed(6)}
                      {" "}per 1K tokens (65/35 mix)
                    </div>
                    <div className="mt-1">
                      Input/Output: ₹{(config.phi3InputPer1m * usdToInr).toFixed(2)} / ₹{(config.phi3OutputPer1m * usdToInr).toFixed(2)} per 1M
                    </div>
                  </div>
                </div>
                <div className="mt-2 text-[11px] text-white/50">USD→INR rate used: {usdToInr}</div>
              </div>
            </>
          ) : (
            <div className="text-sm text-white/60">{loading ? "Loading…" : "No config found."}</div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Users</CardTitle>
          <CardDescription>
            Per-user overrides. Leave blank to fall back to defaults.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {users.map((u) => (
            <div
              key={u.id}
              className="grid gap-3 rounded-2xl border border-white/10 bg-white/5 p-4 md:grid-cols-12 md:items-end"
            >
              <div className="md:col-span-4">
                <div className="flex items-center gap-2">
                  <div className="text-sm font-medium text-white/90">{u.email}</div>
                  <Badge variant="outline" className={u.role === "ADMIN" ? "border-cyan-400/40 text-cyan-300" : ""}>
                    {u.role}
                  </Badge>
                </div>
                <div className="text-xs text-white/60">
                  prompts: {u.prompts} • created: {new Date(u.createdAt).toLocaleString()}
                </div>
              </div>
              <div className="md:col-span-3">
                <div className="text-xs text-white/60">Monthly budget (INR display)</div>
                <Input
                  value={u.monthlyBudgetUsd ?? ""}
                  onChange={(e) => {
                    const v = e.target.value.trim();
                    setUsers((prev) =>
                      prev.map((x) =>
                        x.id === u.id ? { ...x, monthlyBudgetUsd: v === "" ? null : Number(v) } : x,
                      ),
                    );
                  }}
                  placeholder="e.g. 5"
                />
              </div>
              <div className="md:col-span-3">
                <div className="text-xs text-white/60">Monthly token limit</div>
                <Input
                  value={u.monthlyTokenLimit ?? ""}
                  onChange={(e) => {
                    const v = e.target.value.trim();
                    setUsers((prev) =>
                      prev.map((x) =>
                        x.id === u.id ? { ...x, monthlyTokenLimit: v === "" ? null : Number(v) } : x,
                      ),
                    );
                  }}
                  placeholder="e.g. 200000"
                />
              </div>
              <div className="md:col-span-2">
                <Button onClick={() => saveUser(u)} disabled={savingId === u.id}>
                  {savingId === u.id ? "Saving…" : "Save"}
                </Button>
              </div>
            </div>
          ))}

          {loading ? <div className="text-sm text-white/60">Loading…</div> : null}
          {!loading && users.length === 0 ? <div className="text-sm text-white/60">No users found.</div> : null}
        </CardContent>
      </Card>
    </div>
  );
}

