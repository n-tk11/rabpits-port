import { Decimal } from "@prisma/client/runtime/client";

import { db } from "@/lib/db";
import { computePositions, LedgerEntry } from "@/lib/finance/positions";
import { computePortfolioSnapshot, ExchangeRateMap, PriceMap } from "@/lib/finance/snapshot";
import { AssetType } from "@/types";

export async function triggerSnapshot(portfolioId: string): Promise<void> {
  const portfolio = await db.portfolio.findUnique({
    where: { id: portfolioId },
    select: { baseCurrency: true },
  });
  if (!portfolio) return;

  const { baseCurrency } = portfolio;

  const transactions = await db.transaction.findMany({
    where: { portfolioId },
    orderBy: { date: "asc" },
    include: { asset: { select: { type: true, pricingCurrency: true } } },
  });

  const entries: LedgerEntry[] = transactions.map((tx) => ({
    assetId: tx.assetId,
    type: tx.type as LedgerEntry["type"],
    date: tx.date,
    quantity: new Decimal(tx.quantity.toString()),
    unitPrice: new Decimal(tx.unitPrice.toString()),
  }));

  const positions = computePositions(entries);

  const priceMap: PriceMap = new Map();
  await Promise.all(
    positions.map(async ({ assetId }) => {
      const latest = await db.price.findFirst({
        where: { assetId },
        orderBy: { recordedAt: "desc" },
      });
      if (latest) {
        priceMap.set(assetId, {
          price: new Decimal(latest.price.toString()),
          currency: latest.currency,
        });
      }
    })
  );

  const exchangeRates: ExchangeRateMap = new Map();
  const uniqueCurrencies = new Set(
    Array.from(priceMap.values())
      .map((p) => p.currency)
      .filter((c) => c !== baseCurrency)
  );

  if (uniqueCurrencies.size > 0) {
    const cashAssets = await db.asset.findMany({
      where: { type: AssetType.CASH },
      select: { id: true, pricingCurrency: true },
    });

    await Promise.all(
      Array.from(uniqueCurrencies).map(async (currency) => {
        const cashAsset = cashAssets.find((a) => a.pricingCurrency === currency);
        if (!cashAsset) {
          console.warn(`[snapshot] No CASH asset found for currency ${currency}; skipping FX rate`);
          return;
        }

        const latest = await db.price.findFirst({
          where: { assetId: cashAsset.id },
          orderBy: { recordedAt: "desc" },
        });

        if (latest) {
          exchangeRates.set(currency, new Decimal(latest.price.toString()));
        } else {
          console.warn(`[snapshot] No price record for CASH asset ${cashAsset.id} (${currency})`);
        }
      })
    );
  }

  const { totalValue, breakdown } = computePortfolioSnapshot(
    positions,
    priceMap,
    baseCurrency,
    exchangeRates
  );

  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);

  const serialisedBreakdown: Record<string, string> = {};
  for (const [assetId, value] of Object.entries(breakdown)) {
    serialisedBreakdown[assetId] = value.toString();
  }

  const existing = await db.snapshot.findFirst({
    where: { portfolioId, date: today },
    select: { id: true },
  });

  if (existing) {
    await db.snapshot.update({
      where: { id: existing.id },
      data: {
        totalValueBaseCurrency: totalValue,
        breakdown: serialisedBreakdown,
      },
    });
  } else {
    await db.snapshot.create({
      data: {
        portfolioId,
        date: today,
        totalValueBaseCurrency: totalValue,
        breakdown: serialisedBreakdown,
      },
    });
  }
}
