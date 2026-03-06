import { Decimal } from "@prisma/client/runtime/client";
import Link from "next/link";

import { AllocationChart } from "@/components/charts/AllocationChart";
import type { AllocationItem } from "@/components/charts/AllocationChart";
import { GrowthChartWrapper } from "@/components/charts/GrowthChartWrapper";
import { PerformancePanel } from "@/components/portfolio/PerformancePanel";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { db } from "@/lib/db";
import { computePositions } from "@/lib/finance/positions";
import type { LedgerEntry } from "@/lib/finance/positions";
import { cn } from "@/lib/utils";

type Period = "1M" | "3M" | "6M" | "1Y" | "ALL";

const VALID_PERIODS: Period[] = ["1M", "3M", "6M", "1Y", "ALL"];

type HomePageProps = {
  searchParams: { portfolioId?: string; period?: string };
};

export const dynamic = "force-dynamic";

export default async function HomePage({ searchParams }: HomePageProps) {
  const portfolios = await db.portfolio.findMany({ orderBy: { createdAt: "asc" } });

  if (portfolios.length === 0) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 text-center">
        <h1 className="text-2xl font-bold tracking-tight">Welcome to Portfolio Tracker</h1>
        <p className="text-muted-foreground">You don&apos;t have any portfolios yet.</p>
        <Link
          href="/portfolios"
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          Create your first portfolio
        </Link>
      </div>
    );
  }

  const activePortfolioId =
    portfolios.find((p) => p.id === searchParams.portfolioId)?.id ?? portfolios[0].id;
  const activePortfolio = portfolios.find((p) => p.id === activePortfolioId)!;
  const activePeriod: Period = VALID_PERIODS.includes(searchParams.period as Period)
    ? (searchParams.period as Period)
    : "1Y";

  // Latest snapshot for current value
  const latestSnapshot = await db.snapshot.findFirst({
    where: { portfolioId: activePortfolioId },
    orderBy: { date: "desc" },
  });

  // Transactions for allocation
  const transactions = await db.transaction.findMany({
    where: { portfolioId: activePortfolioId },
    include: { asset: true },
    orderBy: { date: "asc" },
  });

  const ledgerEntries: LedgerEntry[] = transactions.map((tx) => ({
    assetId: tx.assetId,
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

  // Compute values per position
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

  const allocationItems: AllocationItem[] = positionValues
    .filter(({ value }) => value.greaterThan(0))
    .map(({ pos, value }) => {
      const tx = transactions.find((t) => t.assetId === pos.assetId);
      const asset = tx?.asset;
      const pct = totalValue.greaterThan(0)
        ? value.dividedBy(totalValue).times(100)
        : new Decimal(0);
      return {
        assetId: pos.assetId,
        name: asset?.name ?? pos.assetId,
        ticker: asset?.tickerSymbol ?? "?",
        type: asset?.type ?? "STOCK",
        value,
        quantity: pos.quantity,
        pct,
      };
    });

  function fmt(val: Decimal) {
    return `${activePortfolio.baseCurrency} ${val.toNumber().toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }

  return (
    <div className="space-y-6">
      {/* Portfolio selector */}
      {portfolios.length > 1 && (
        <div className="flex flex-wrap gap-2">
          {portfolios.map((p) => (
            <Link
              key={p.id}
              href={`/?portfolioId=${p.id}&period=${activePeriod}`}
              className={cn(
                "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                p.id === activePortfolioId
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground"
              )}
            >
              {p.name}
            </Link>
          ))}
        </div>
      )}

      {/* Portfolio header + stat cards */}
      <div className="space-y-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{activePortfolio.name}</h1>
          <p className="text-xs text-muted-foreground">Base: {activePortfolio.baseCurrency}</p>
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
              <p className="text-xl font-bold">{totalCost.greaterThan(0) ? fmt(totalCost) : "—"}</p>
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

      {/* Performance panel */}
      <PerformancePanel portfolioId={activePortfolioId} period={activePeriod} />

      {/* Charts row */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">NAV Growth</CardTitle>
          </CardHeader>
          <CardContent>
            <GrowthChartWrapper
              portfolioId={activePortfolioId}
              period={activePeriod}
              baseCurrency={activePortfolio.baseCurrency}
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
              baseCurrency={activePortfolio.baseCurrency}
              totalValue={totalValue}
            />
          </CardContent>
        </Card>
      </div>

      {/* Action links */}
      <div className="flex gap-4">
        <Link
          href={`/portfolios/${activePortfolioId}/transactions`}
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          → View Transactions
        </Link>
        <Link
          href={`/portfolios/${activePortfolioId}`}
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          → Manage Assets
        </Link>
      </div>
    </div>
  );
}
