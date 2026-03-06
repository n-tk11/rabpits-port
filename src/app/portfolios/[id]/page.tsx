import { Decimal } from "@prisma/client/runtime/client";
import { notFound } from "next/navigation";

import { AllocationChart } from "@/components/charts/AllocationChart";
import type { AllocationItem } from "@/components/charts/AllocationChart";
import { GrowthChartWrapper } from "@/components/charts/GrowthChartWrapper";
import { PerformancePanel } from "@/components/portfolio/PerformancePanel";
import { ConvertTransactionForm } from "@/components/transactions/ConvertTransactionForm";
import { FeeTransactionForm } from "@/components/transactions/FeeTransactionForm";
import { TransactionForm } from "@/components/transactions/TransactionForm";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { db } from "@/lib/db";
import { computePositions } from "@/lib/finance/positions";
import type { LedgerEntry } from "@/lib/finance/positions";
import { cn } from "@/lib/utils";
import { TransactionType } from "@/types";

export const dynamic = "force-dynamic";

type Period = "1M" | "3M" | "6M" | "1Y" | "ALL";
const VALID_PERIODS: Period[] = ["1M", "3M", "6M", "1Y", "ALL"];

const TRANSACTION_TYPE_LABELS: Record<TransactionType, string> = {
  [TransactionType.BUY]: "Buy",
  [TransactionType.SELL]: "Sell",
  [TransactionType.CONVERT]: "Convert",
  [TransactionType.FEE]: "Fee",
  [TransactionType.PRICE_ADJUST]: "Price Adjust",
};

const TRANSACTION_TYPE_VARIANTS: Record<
  TransactionType,
  "default" | "secondary" | "destructive" | "outline"
> = {
  [TransactionType.BUY]: "default",
  [TransactionType.SELL]: "destructive",
  [TransactionType.CONVERT]: "secondary",
  [TransactionType.FEE]: "outline",
  [TransactionType.PRICE_ADJUST]: "outline",
};

type PageProps = {
  params: Promise<{ id: string }>;
  searchParams: { period?: string };
};

export default async function PortfolioDetailPage({ params, searchParams }: PageProps) {
  const { id } = await params;

  const activePeriod: Period = VALID_PERIODS.includes(searchParams.period as Period)
    ? (searchParams.period as Period)
    : "1Y";

  const [portfolio, transactions, assets] = await Promise.all([
    db.portfolio.findUnique({
      where: { id },
      select: { id: true, name: true, baseCurrency: true, description: true },
    }),
    db.transaction.findMany({
      where: { portfolioId: id },
      orderBy: { date: "desc" },
      select: {
        id: true,
        type: true,
        date: true,
        quantity: true,
        unitPrice: true,
        fee: true,
        notes: true,
        asset: { select: { id: true, name: true, tickerSymbol: true, pricingCurrency: true } },
      },
    }),
    db.asset.findMany({
      select: { id: true, name: true, tickerSymbol: true, pricingCurrency: true },
      orderBy: { name: "asc" },
    }),
  ]);

  if (!portfolio) notFound();
  const port = portfolio;

  // --- Dashboard data (same logic as home page, scoped to this portfolio) ---
  const latestSnapshot = await db.snapshot.findFirst({
    where: { portfolioId: id },
    orderBy: { date: "desc" },
  });

  const ledgerEntries: LedgerEntry[] = [...transactions]
    .sort((a, b) => a.date.getTime() - b.date.getTime())
    .map((tx) => ({
      assetId: tx.asset.id,
      type: tx.type as "BUY" | "SELL" | "CONVERT" | "FEE",
      date: tx.date,
      quantity: tx.quantity,
      unitPrice: tx.unitPrice,
    }));

  const positions = computePositions(ledgerEntries).filter((p) => p.quantity.greaterThan(0));

  const latestPrices = await Promise.all(
    positions.map((p) =>
      db.price.findFirst({
        where: { assetId: p.assetId },
        orderBy: { recordedAt: "desc" },
        include: { asset: true },
      })
    )
  );

  const positionValues = positions.map((pos, i) => {
    const priceRecord = latestPrices[i];
    const price = priceRecord?.price ?? pos.averageCostBasis;
    return { pos, price, value: pos.quantity.times(price) };
  });

  const totalValue =
    latestSnapshot?.totalValueBaseCurrency ??
    positionValues.reduce((sum, { value }) => sum.plus(value), new Decimal(0));

  const totalCost = positions.reduce((sum, pos) => sum.plus(pos.totalCost), new Decimal(0));
  const totalGainLoss = totalValue.minus(totalCost);
  const hasValue = totalValue.greaterThan(0);

  function fmt(val: Decimal) {
    return `${port.baseCurrency} ${val.toNumber().toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }

  const allocationItems: AllocationItem[] = positionValues
    .filter(({ value }) => value.greaterThan(0))
    .map(({ pos, value }) => {
      const tx = transactions.find((t) => t.asset.id === pos.assetId);
      const asset = tx?.asset;
      const pct = totalValue.greaterThan(0)
        ? value.dividedBy(totalValue).times(100)
        : new Decimal(0);
      return {
        assetId: pos.assetId,
        name: asset?.name ?? pos.assetId,
        ticker: asset?.tickerSymbol ?? "?",
        type: asset ? "STOCK" : "STOCK",
        value,
        quantity: pos.quantity,
        pct,
      };
    });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="space-y-3">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight">{port.name}</h1>
              <span className="rounded-full bg-muted px-2 py-0.5 font-mono text-xs text-muted-foreground">
                {port.baseCurrency}
              </span>
            </div>
            {port.description && (
              <p className="mt-1 text-sm text-muted-foreground">{port.description}</p>
            )}
          </div>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <Card>
              <CardContent className="pb-4 pt-4">
                <p className="mb-1 text-xs text-muted-foreground">Current Value</p>
                <p className="text-xl font-bold">{hasValue ? fmt(totalValue) : "—"}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pb-4 pt-4">
                <p className="mb-1 text-xs text-muted-foreground">Total Cost</p>
                <p className="text-xl font-bold">
                  {totalCost.greaterThan(0) ? fmt(totalCost) : "—"}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pb-4 pt-4">
                <p className="mb-1 text-xs text-muted-foreground">Gain / Loss</p>
                <p
                  className={cn(
                    "text-xl font-bold",
                    hasValue && totalCost.greaterThan(0)
                      ? totalGainLoss.greaterThanOrEqualTo(0)
                        ? "text-green-600"
                        : "text-red-600"
                      : "text-muted-foreground"
                  )}
                >
                  {hasValue && totalCost.greaterThan(0)
                    ? `${totalGainLoss.greaterThanOrEqualTo(0) ? "+" : ""}${fmt(totalGainLoss)}`
                    : "—"}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pb-4 pt-4">
                <p className="mb-1 text-xs text-muted-foreground">Return %</p>
                <p
                  className={cn(
                    "text-xl font-bold",
                    hasValue && totalCost.greaterThan(0)
                      ? totalGainLoss.greaterThanOrEqualTo(0)
                        ? "text-green-600"
                        : "text-red-600"
                      : "text-muted-foreground"
                  )}
                >
                  {hasValue && totalCost.greaterThan(0)
                    ? `${totalGainLoss.greaterThanOrEqualTo(0) ? "+" : ""}${totalGainLoss.dividedBy(totalCost).times(100).toFixed(2)}%`
                    : "—"}
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <TransactionForm
            portfolioId={id}
            assets={assets}
            portfolioBaseCurrency={port.baseCurrency}
          />
          <ConvertTransactionForm
            portfolioId={id}
            assets={assets}
            portfolioBaseCurrency={port.baseCurrency}
          />
          <FeeTransactionForm
            portfolioId={id}
            assets={assets}
            portfolioBaseCurrency={port.baseCurrency}
          />
        </div>
      </div>

      {/* Performance metrics */}
      <PerformancePanel portfolioId={id} period={activePeriod} />

      {/* Charts */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">NAV Growth</CardTitle>
          </CardHeader>
          <CardContent>
            <GrowthChartWrapper
              portfolioId={id}
              period={activePeriod}
              baseCurrency={port.baseCurrency}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Allocation</CardTitle>
          </CardHeader>
          <CardContent>
            <AllocationChart
              items={allocationItems}
              baseCurrency={port.baseCurrency}
              totalValue={totalValue}
            />
          </CardContent>
        </Card>
      </div>

      {/* Transaction table */}
      <div>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Transactions
        </h2>

        {transactions.length === 0 ? (
          <div className="rounded-lg border border-dashed p-10 text-center">
            <p className="text-muted-foreground">
              No transactions yet. Add one to start tracking your holdings.
            </p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-lg border">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="px-4 py-3 text-left font-medium">Date</th>
                  <th className="px-4 py-3 text-left font-medium">Asset</th>
                  <th className="px-4 py-3 text-left font-medium">Type</th>
                  <th className="px-4 py-3 text-right font-medium">Quantity</th>
                  <th className="px-4 py-3 text-right font-medium">Unit Price</th>
                  <th className="px-4 py-3 text-right font-medium">Fee</th>
                  <th className="px-4 py-3 text-left font-medium">Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {transactions.map((tx) => (
                  <tr key={tx.id} className="hover:bg-muted/30">
                    <td className="px-4 py-3 font-mono text-xs">
                      {tx.date.toISOString().slice(0, 10)}
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-medium">{tx.asset.tickerSymbol}</span>
                      <span className="ml-1.5 text-xs text-muted-foreground">{tx.asset.name}</span>
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={TRANSACTION_TYPE_VARIANTS[tx.type]}>
                        {TRANSACTION_TYPE_LABELS[tx.type]}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-right font-mono">
                      {Number(tx.quantity).toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-right font-mono">
                      {Number(tx.unitPrice).toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 8,
                      })}{" "}
                      <span className="text-xs text-muted-foreground">
                        {tx.asset.pricingCurrency}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-muted-foreground">
                      {Number(tx.fee) > 0 ? (
                        <>
                          {Number(tx.fee).toLocaleString(undefined, {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 8,
                          })}{" "}
                          <span className="text-xs">{tx.asset.pricingCurrency}</span>
                        </>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="max-w-xs truncate px-4 py-3 text-muted-foreground">
                      {tx.notes ?? "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
