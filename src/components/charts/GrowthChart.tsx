"use client";

import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

type GrowthDataPoint = {
  date: string;
  value: number;
};

type GrowthChartProps = {
  data: GrowthDataPoint[];
  baseCurrency: string;
  isLoading?: boolean;
};

type TooltipPayload = {
  value: number;
};

type CustomTooltipProps = {
  active?: boolean;
  payload?: TooltipPayload[];
  label?: string;
  baseCurrency: string;
};

function formatYAxis(value: number, currency: string): string {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M ${currency}`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}k ${currency}`;
  return `${value.toFixed(0)} ${currency}`;
}

function CustomTooltip({ active, payload, label, baseCurrency }: CustomTooltipProps) {
  if (!active || !payload?.length) return null;
  const value = payload[0].value;
  return (
    <div className="rounded-md border bg-background px-3 py-2 text-sm shadow-md">
      <p className="font-medium">{label}</p>
      <p className="text-muted-foreground">
        {value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}{" "}
        {baseCurrency}
      </p>
    </div>
  );
}

function GrowthChart({ data, baseCurrency, isLoading = false }: GrowthChartProps) {
  if (isLoading) {
    return <div className="h-[300px] w-full animate-pulse rounded-md bg-muted" />;
  }

  if (data.length === 0) {
    return (
      <div className="flex h-[300px] items-center justify-center text-center text-sm text-muted-foreground">
        No snapshot data yet. Prices and snapshots will appear after your first transaction.
      </div>
    );
  }

  const showDots = data.length <= 30;
  const xAxisInterval = data.length <= 12 ? 0 : Math.ceil(data.length / 12) - 1;

  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={data} margin={{ top: 4, right: 8, bottom: 0, left: 8 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--muted-foreground) / 0.2)" />
        <XAxis
          dataKey="date"
          tick={{ fontSize: 12 }}
          interval={xAxisInterval === 0 ? "preserveStartEnd" : xAxisInterval}
          tickLine={false}
          axisLine={false}
        />
        <YAxis
          tickFormatter={(v: number) => formatYAxis(v, baseCurrency)}
          tick={{ fontSize: 11 }}
          tickLine={false}
          axisLine={false}
          width={80}
        />
        <Tooltip content={<CustomTooltip baseCurrency={baseCurrency} />} />
        <Line
          type="monotone"
          dataKey="value"
          stroke="#3b82f6"
          strokeWidth={2}
          dot={showDots ? { r: 3, fill: "#3b82f6" } : false}
          activeDot={{ r: 5 }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}

export { GrowthChart };
export type { GrowthDataPoint, GrowthChartProps };
