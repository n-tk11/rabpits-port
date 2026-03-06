import { Decimal } from "@prisma/client/runtime/client";

import type { Position } from "@/lib/finance/positions";

export type PriceMap = Map<string, { price: Decimal; currency: string }>;
export type ExchangeRateMap = Map<string, Decimal>;

export type SnapshotResult = {
  totalValue: Decimal;
  breakdown: Record<string, Decimal>;
};

export function computePortfolioSnapshot(
  positions: Position[],
  latestPrices: PriceMap,
  baseCurrency: string,
  exchangeRates: ExchangeRateMap
): SnapshotResult {
  let totalValue = new Decimal(0);
  const breakdown: Record<string, Decimal> = {};

  for (const position of positions) {
    if (position.quantity.lessThanOrEqualTo(0)) continue;

    const priceEntry = latestPrices.get(position.assetId);
    if (!priceEntry) continue;

    const { price, currency } = priceEntry;
    const valueInPricingCurrency = position.quantity.times(price);

    let valueInBaseCurrency: Decimal;

    if (currency === baseCurrency) {
      valueInBaseCurrency = valueInPricingCurrency;
    } else {
      const rate = exchangeRates.get(currency);
      if (!rate) continue;
      valueInBaseCurrency = valueInPricingCurrency.times(rate);
    }

    breakdown[position.assetId] = valueInBaseCurrency;
    totalValue = totalValue.plus(valueInBaseCurrency);
  }

  return { totalValue, breakdown };
}
