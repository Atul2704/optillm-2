"use client";

import * as React from "react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
} from "recharts";
import { formatUsd } from "@/lib/costCalculator";

type ModelComparePoint = {
  model: string;
  prompts: number;
  totalCost: number;
  avgCost: number;
};

export function ModelComparisonBars({ data }: { data: ModelComparePoint[] }) {
  const safe = React.useMemo(() => data.filter((d) => d.prompts > 0), [data]);

  if (!safe.length) {
    return <div className="grid h-full min-h-[220px] place-items-center text-sm text-white/60">No model data yet</div>;
  }

  return (
    <div className="h-full min-h-[220px] w-full min-w-0">
      <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={220}>
        <BarChart data={safe} margin={{ top: 8, right: 10, left: 0, bottom: 0 }}>
          <CartesianGrid stroke="rgba(255,255,255,0.08)" strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="model" tick={{ fill: "rgba(255,255,255,0.65)", fontSize: 12 }} />
          <YAxis tick={{ fill: "rgba(255,255,255,0.65)", fontSize: 12 }} />
          <Tooltip
            contentStyle={{
              background: "rgba(0,0,0,0.85)",
              border: "1px solid rgba(255,255,255,0.12)",
              borderRadius: 12,
            }}
            formatter={(value: unknown, name: unknown) => {
              const n = typeof value === "number" ? value : Number(value);
              const key = String(name);
              if (key.toLowerCase().includes("cost")) return [formatUsd(n), String(name)];
              return [n, String(name)];
            }}
          />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          <Bar dataKey="prompts" name="Prompts" fill="#22d3ee" radius={[6, 6, 0, 0]} />
          <Bar dataKey="totalCost" name="Total cost" fill="#8b5cf6" radius={[6, 6, 0, 0]} />
          <Bar dataKey="avgCost" name="Avg cost/prompt" fill="#10b981" radius={[6, 6, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
