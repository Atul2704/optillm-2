"use client";

import * as React from "react";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend,
} from "recharts";

const COLORS: Record<string, string> = {
  PHI_3_MINI: "#10b981",
  LLAMA_3: "#22d3ee",
  GPT_4O: "#8b5cf6",
};

function label(m: string) {
  if (m === "PHI_3_MINI") return "Phi‑3 Mini";
  if (m === "LLAMA_3") return "LLaMA 3";
  if (m === "GPT_4O") return "GPT‑4o";
  return m;
}

export function ModelUsagePie({ usage }: { usage: Record<string, number> }) {
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => {
    setMounted(true);
  }, []);

  const data = React.useMemo(
    () =>
      Object.entries(usage)
        .filter(([, v]) => v > 0)
        .map(([name, value]) => ({ name, label: label(name), value })),
    [usage],
  );

  if (!data.length) {
    return <div className="grid h-full place-items-center text-sm text-white/60">No data yet</div>;
  }

  if (!mounted) {
    return <div className="grid h-full min-h-[220px] place-items-center text-sm text-white/60">Loading chart…</div>;
  }

  return (
    <div className="h-full min-h-[220px] w-full min-w-0">
      <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={220}>
        <PieChart>
          <Pie data={data} dataKey="value" nameKey="label" innerRadius={55} outerRadius={85} paddingAngle={3}>
            {data.map((d) => (
              <Cell key={d.name} fill={COLORS[d.name] || "#94a3b8"} />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{
              background: "rgba(0,0,0,0.8)",
              border: "1px solid rgba(255,255,255,0.12)",
              borderRadius: 12,
            }}
            labelStyle={{ color: "rgba(255,255,255,0.8)" }}
            itemStyle={{ color: "white" }}
          />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}

