"use client";

import {
  ResponsiveContainer,
  LineChart,
  Line,
  Tooltip,
  XAxis,
  YAxis,
  CartesianGrid,
  Legend,
} from "recharts";
import { formatUsd } from "@/lib/costCalculator";

export function CostComparisonLine({
  data,
}: {
  data: { day: string; actual: number; gpt4o: number; savings: number }[];
}) {
  const safeData =
    data.length >= 2
      ? data
      : data.length === 1
        ? [
            { ...data[0], day: `${data[0].day}-a` },
            { ...data[0], day: `${data[0].day}-b` },
          ]
        : [];

  if (!safeData.length) {
    return <div className="grid h-full min-h-[180px] place-items-center text-sm text-white/60">No chart data yet</div>;
  }

  return (
    <ResponsiveContainer width="100%" height={288} minWidth={0} minHeight={0}>
      <LineChart data={safeData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="chartBg" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#0ea5e9" stopOpacity={0.08} />
            <stop offset="100%" stopColor="#0ea5e9" stopOpacity={0.01} />
          </linearGradient>
        </defs>
        <CartesianGrid stroke="rgba(255,255,255,0.08)" strokeDasharray="3 3" />
        <rect x={0} y={0} width="100%" height="100%" fill="url(#chartBg)" />
        <XAxis
          dataKey="day"
          tick={{ fill: "rgba(255,255,255,0.6)", fontSize: 12 }}
          tickFormatter={(value) => String(value).slice(5)}
        />
        <YAxis
          tick={{ fill: "rgba(255,255,255,0.6)", fontSize: 12 }}
          tickFormatter={(v) => formatUsd(Number(v))}
        />
        <Tooltip
          contentStyle={{
            background: "rgba(0,0,0,0.8)",
            border: "1px solid rgba(255,255,255,0.12)",
            borderRadius: 12,
          }}
          formatter={(v: unknown, n: unknown) => {
            const val = typeof v === "number" ? v : Number(v);
            return [formatUsd(val), String(n)];
          }}
          labelFormatter={(label) => `Date: ${label}`}
        />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        <Line
          type="monotoneX"
          name="GPT-4o baseline"
          dataKey="gpt4o"
          stroke="#8b5cf6"
          strokeWidth={3}
          dot={false}
          activeDot={{ r: 5, fill: "#8b5cf6" }}
        />
        <Line
          type="monotoneX"
          name="Actual cost"
          dataKey="actual"
          stroke="#22d3ee"
          strokeWidth={3}
          dot={false}
          activeDot={{ r: 5, fill: "#22d3ee" }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}

