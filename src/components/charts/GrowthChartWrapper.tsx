import { db } from "@/lib/db";

import { GrowthChart } from "./GrowthChart";
import type { GrowthDataPoint } from "./GrowthChart";

type Period = "1M" | "3M" | "6M" | "1Y" | "ALL";

type GrowthChartWrapperProps = {
  portfolioId: string;
  period?: Period;
  baseCurrency: string;
};

function computeStartDate(period: Period): Date | null {
  if (period === "ALL") return null;
  const now = new Date();
  if (period === "1M") return new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
  if (period === "3M") return new Date(now.getFullYear(), now.getMonth() - 3, now.getDate());
  if (period === "6M") return new Date(now.getFullYear(), now.getMonth() - 6, now.getDate());
  // 1Y
  return new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
}

function formatDate(date: Date, period: Period): string {
  if (period === "1M" || period === "3M") {
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  }
  return date.toLocaleDateString("en-US", { month: "short", year: "numeric" });
}

async function GrowthChartWrapper({
  portfolioId,
  period = "1Y",
  baseCurrency,
}: GrowthChartWrapperProps) {
  const startDate = computeStartDate(period);

  const snapshots = await db.snapshot.findMany({
    where: {
      portfolioId,
      ...(startDate ? { date: { gte: startDate } } : {}),
    },
    orderBy: { date: "asc" },
  });

  const data: GrowthDataPoint[] = snapshots.map((s) => ({
    date: formatDate(s.date, period),
    value: s.totalValueBaseCurrency.toNumber(),
  }));

  return <GrowthChart data={data} baseCurrency={baseCurrency} />;
}

export { GrowthChartWrapper };
export type { GrowthChartWrapperProps };
