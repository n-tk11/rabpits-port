"use client";

import { Decimal } from "@prisma/client/runtime/client";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";

import { cn } from "@/lib/utils";

const COLORS = [
  "#3b82f6",
  "#10b981",
  "#f59e0b",
  "#ef4444",
  "#8b5cf6",
  "#06b6d4",
  "#f97316",
  "#6366f1",
];

type AllocationItem = {
  assetId: string;
  name: string;
  ticker: string;
  type: string;
  value: Decimal;
  quantity: Decimal;
  pct: Decimal;
};

type AllocationChartProps = {
  items: AllocationItem[];
  baseCurrency: string;
  totalValue: Decimal;
};

type TooltipPayloadEntry = {
  name: string;
  value: number;
  payload: { name: string; pct: number };
};

type CustomTooltipProps = {
  active?: boolean;
  payload?: TooltipPayloadEntry[];
};

function CustomTooltip({ active, payload }: CustomTooltipProps) {
  if (!active || !payload?.length) return null;
  const entry = payload[0];
  return (
    <div className="rounded-md border bg-background px-3 py-2 text-sm shadow-md">
      <p className="font-medium">{entry.payload.name}</p>
      <p className="text-muted-foreground">
        {entry.value.toFixed(2)} · {entry.payload.pct.toFixed(2)}%
      </p>
    </div>
  );
}

function formatQuantity(quantity: Decimal, type: string): string {
  const num = Number(quantity);
  return type === "CRYPTO" ? num.toFixed(8) : num.toFixed(4);
}

function AllocationChart({ items, baseCurrency, totalValue }: AllocationChartProps) {
  if (items.length === 0) {
    return (
      <div className="flex items-center justify-center py-16 text-muted-foreground">
        No positions found
      </div>
    );
  }

  const sorted = [...items].sort((a, b) => Number(b.value) - Number(a.value));

  const chartData = sorted.map((item) => ({
    name: item.name,
    value: Number(item.value),
    pct: Number(item.pct),
  }));

  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
      {/* Donut chart */}
      <div className="flex items-center justify-center">
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie
              data={chartData}
              dataKey="value"
              nameKey="name"
              innerRadius="60%"
              outerRadius="100%"
              strokeWidth={1}
            >
              {chartData.map((_, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
          </PieChart>
        </ResponsiveContainer>
      </div>

      {/* Holdings table */}
      <div className="overflow-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-left text-muted-foreground">
              <th className="pb-2 pr-3 font-medium">Asset</th>
              <th className="pb-2 pr-3 font-medium">Ticker</th>
              <th className="pb-2 pr-3 font-medium">Type</th>
              <th className="pb-2 pr-3 text-right font-medium">Quantity</th>
              <th className="pb-2 pr-3 text-right font-medium">Value</th>
              <th className="pb-2 text-right font-medium">%</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((item, index) => (
              <tr key={item.assetId} className={cn("border-b last:border-0")}>
                <td className="py-2 pr-3">
                  <span className="flex items-center gap-2">
                    <span
                      className="inline-block h-2.5 w-2.5 shrink-0 rounded-full"
                      style={{ backgroundColor: COLORS[index % COLORS.length] }}
                    />
                    {item.name}
                  </span>
                </td>
                <td className="py-2 pr-3 font-mono text-xs text-muted-foreground">{item.ticker}</td>
                <td className="py-2 pr-3 text-muted-foreground">{item.type}</td>
                <td className="py-2 pr-3 text-right font-mono text-xs">
                  {formatQuantity(item.quantity, item.type)}
                </td>
                <td className="py-2 pr-3 text-right font-mono">
                  {Number(item.value).toFixed(2)} {baseCurrency}
                </td>
                <td className="py-2 text-right font-mono">{Number(item.pct).toFixed(2)}%</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t font-medium">
              <td colSpan={4} className="pr-3 pt-2 text-muted-foreground">
                Total
              </td>
              <td className="pr-3 pt-2 text-right font-mono">
                {Number(totalValue).toFixed(2)} {baseCurrency}
              </td>
              <td className="pt-2 text-right font-mono">100.00%</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}

export { AllocationChart };
export type { AllocationItem, AllocationChartProps };
