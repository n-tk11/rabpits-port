import { Decimal } from "@prisma/client/runtime/client";

import { Card, CardContent } from "@/components/ui/card";
import { db } from "@/lib/db";
import { annualizeReturn } from "@/lib/finance/annualized";
import { calculateSimpleReturn } from "@/lib/finance/simpleReturn";
import { calculateTWR } from "@/lib/finance/twr";
import { calculateXIRR, XirrConvergenceError, type CashFlow } from "@/lib/finance/xirr";
import { cn } from "@/lib/utils";

import { PeriodSelector } from "./PeriodSelector";

type Period = "1M" | "3M" | "6M" | "1Y" | "ALL";

type PerformancePanelProps = {
  portfolioId: string;
  period?: Period;
};

function getStartDate(period: Period): Date | null {
  if (period === "ALL") return null;
  const now = new Date();
  const date = new Date(now);
  if (period === "1M") date.setMonth(date.getMonth() - 1);
  else if (period === "3M") date.setMonth(date.getMonth() - 3);
  else if (period === "6M") date.setMonth(date.getMonth() - 6);
  else if (period === "1Y") date.setFullYear(date.getFullYear() - 1);
  return date;
}

function formatPercent(value: Decimal | null): string {
  if (value === null) return "—";
  const n = value.toNumber() * 100;
  const sign = n >= 0 ? "+" : "";
  return `${sign}${n.toFixed(2)}%`;
}

function formatCurrency(value: Decimal | null): string {
  if (value === null) return "—";
  const n = value.toNumber();
  const sign = n >= 0 ? "+" : "";
  return `${sign}$${Math.abs(n).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function valueColorClass(value: Decimal | null): string {
  if (value === null) return "text-muted-foreground";
  return value.greaterThanOrEqualTo(0) ? "text-green-600" : "text-red-600";
}

type MetricCardProps = {
  label: string;
  value: string;
  colorClass: string;
};

function MetricCard({ label, value, colorClass }: MetricCardProps) {
  return (
    <Card>
      <CardContent className="pb-4 pt-4">
        <p className="mb-1 text-xs text-muted-foreground">{label}</p>
        <p className={cn("text-xl font-bold", colorClass)}>{value}</p>
      </CardContent>
    </Card>
  );
}

export async function PerformancePanel({ portfolioId, period = "1Y" }: PerformancePanelProps) {
  const startDate = getStartDate(period);

  const [snapshots, transactions] = await Promise.all([
    db.snapshot.findMany({
      where: {
        portfolioId,
        ...(startDate ? { date: { gte: startDate } } : {}),
      },
      orderBy: { date: "asc" },
    }),
    db.transaction.findMany({
      where: {
        portfolioId,
        ...(startDate ? { date: { gte: startDate } } : {}),
        type: { in: ["BUY", "SELL", "FEE"] },
      },
      orderBy: { date: "asc" },
    }),
  ]);

  const hasEnough = snapshots.length >= 2;
  const firstSnapshot = hasEnough ? snapshots[0] : null;
  const lastSnapshot = hasEnough ? snapshots[snapshots.length - 1] : null;

  // Simple return
  const simpleReturn =
    firstSnapshot && lastSnapshot
      ? calculateSimpleReturn(
          firstSnapshot.totalValueBaseCurrency,
          lastSnapshot.totalValueBaseCurrency
        )
      : null;

  // TWR
  const twr = hasEnough
    ? calculateTWR(
        snapshots.map((s) => ({ date: s.date, value: s.totalValueBaseCurrency })),
        []
      )
    : null;

  // Annualized TWR
  const daysInPeriod =
    firstSnapshot && lastSnapshot
      ? (lastSnapshot.date.getTime() - firstSnapshot.date.getTime()) / 86_400_000
      : 0;

  const annualizedTwr =
    twr !== null && period !== "1M" && daysInPeriod > 30
      ? (() => {
          try {
            return annualizeReturn(twr, new Decimal(daysInPeriod / 365));
          } catch {
            return null;
          }
        })()
      : null;

  // XIRR
  let xirr: Decimal | null = null;
  if (transactions.length > 0 && lastSnapshot) {
    const cashFlows: CashFlow[] = transactions.map((tx) => {
      if (tx.type === "BUY") {
        return {
          date: tx.date,
          amount: tx.quantity.times(tx.unitPrice).plus(tx.fee).negated(),
        };
      } else if (tx.type === "SELL") {
        return {
          date: tx.date,
          amount: tx.quantity.times(tx.unitPrice).minus(tx.fee),
        };
      } else {
        // FEE
        return {
          date: tx.date,
          amount: tx.fee.negated(),
        };
      }
    });

    // Terminal value as final positive cash flow
    cashFlows.push({
      date: lastSnapshot.date,
      amount: lastSnapshot.totalValueBaseCurrency,
    });

    try {
      xirr = calculateXIRR(cashFlows);
    } catch (err) {
      if (!(err instanceof XirrConvergenceError)) throw err;
      xirr = null;
    }
  }

  // Total gain/loss
  const totalGainLoss =
    firstSnapshot && lastSnapshot
      ? lastSnapshot.totalValueBaseCurrency.minus(firstSnapshot.totalValueBaseCurrency)
      : null;

  const metrics = [
    {
      label: "Simple Return",
      value: formatPercent(simpleReturn),
      colorClass: valueColorClass(simpleReturn),
    },
    {
      label: "TWR",
      value: formatPercent(annualizedTwr ?? twr),
      colorClass: valueColorClass(annualizedTwr ?? twr),
    },
    {
      label: "XIRR (Ann.)",
      value: formatPercent(xirr),
      colorClass: valueColorClass(xirr),
    },
    {
      label: "Total Gain / Loss",
      value: formatCurrency(totalGainLoss),
      colorClass: valueColorClass(totalGainLoss),
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Performance</h2>
        <PeriodSelector activePeriod={period} />
      </div>
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {metrics.map((m) => (
          <MetricCard key={m.label} label={m.label} value={m.value} colorClass={m.colorClass} />
        ))}
      </div>
    </div>
  );
}
