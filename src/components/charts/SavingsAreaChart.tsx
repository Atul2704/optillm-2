"use client";

import * as React from "react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  Tooltip,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";
import { formatUsd } from "@/lib/costCalculator";

export function SavingsAreaChart({
  data,
}: {
  data: { day: string; actual: number; gpt4o: number; savings: number }[];
}) {
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => {
    setMounted(true);
  }, []);
  const safe = React.useMemo(() => {
    const recent = data.slice(-30);
    if (recent.length >= 2) return recent;
    if (recent.length === 1) {
      return [
        { ...recent[0], day: `${recent[0].day}-a` },
        { ...recent[0], day: `${recent[0].day}-b` },
      ];
    }
    return [];
  }, [data]);

  if (!mounted) {
    return <div className="grid h-full min-h-[120px] place-items-center text-sm text-white/60">Loading chart…</div>;
  }

  if (!safe.length) {
    return <div className="grid h-full min-h-[120px] place-items-center text-sm text-white/60">No chart data yet</div>;
  }

  return (
    <div className="h-full min-h-[120px] w-full min-w-0">
      <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={120}>
        <AreaChart data={safe} margin={{ left: 0, right: 0, top: 8, bottom: 0 }}>
          <defs>
            <linearGradient id="savingsFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#22d3ee" stopOpacity={0.5} />
              <stop offset="100%" stopColor="#22d3ee" stopOpacity={0.04} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="rgba(255,255,255,0.08)" strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="day" tick={{ fill: "rgba(255,255,255,0.55)", fontSize: 11 }} tickFormatter={(v) => String(v).slice(5)} />
          <YAxis tick={{ fill: "rgba(255,255,255,0.55)", fontSize: 11 }} tickFormatter={(v) => formatUsd(Number(v))} />
          <Tooltip
            contentStyle={{
              background: "rgba(0,0,0,0.8)",
              border: "1px solid rgba(255,255,255,0.12)",
              borderRadius: 12,
            }}
            formatter={(v: unknown, n: unknown) => {
              const val = typeof v === "number" ? v : Number(v);
              const name = String(n);
              return [formatUsd(val), name];
            }}
            labelFormatter={(label) => `Date: ${label}`}
          />
          <Area
            type="monotoneX"
            dataKey="savings"
            name="Savings"
            stroke="#22d3ee"
            fill="url(#savingsFill)"
            strokeWidth={3}
            activeDot={{ r: 5, fill: "#22d3ee" }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

