import { Decimal } from "@prisma/client/runtime/client";

import { applyFIFOSell, Lot } from "@/lib/finance/fifo";

export type Position = {
  assetId: string;
  quantity: Decimal;
  averageCostBasis: Decimal;
  totalCost: Decimal;
};

export type LedgerEntry = {
  assetId: string;
  type: "BUY" | "SELL" | "CONVERT" | "FEE";
  date: Date;
  quantity: Decimal;
  unitPrice: Decimal;
};

export function computePositions(entries: LedgerEntry[]): Position[] {
  const sorted = [...entries].sort((a, b) => a.date.getTime() - b.date.getTime());

  const lotsByAsset = new Map<string, Lot[]>();

  for (const entry of sorted) {
    if (entry.type === "FEE") continue;

    const { assetId, quantity, unitPrice, date } = entry;

    const isBuy = entry.type === "BUY" || (entry.type === "CONVERT" && quantity.greaterThan(0));
    const isSell = entry.type === "SELL" || (entry.type === "CONVERT" && quantity.lessThan(0));

    if (isBuy) {
      const lots = lotsByAsset.get(assetId) ?? [];
      lots.push({ quantity, unitPrice, date });
      lotsByAsset.set(assetId, lots);
    } else if (isSell) {
      const lots = lotsByAsset.get(assetId) ?? [];
      const sellQty = quantity.abs();
      const { remainingLots } = applyFIFOSell(lots, sellQty, unitPrice);
      lotsByAsset.set(assetId, remainingLots);
    }
  }

  const positions: Position[] = [];

  for (const [assetId, lots] of Array.from(lotsByAsset.entries())) {
    const totalQuantity = lots.reduce(
      (sum: Decimal, lot: Lot) => sum.plus(lot.quantity),
      new Decimal(0)
    );

    if (totalQuantity.lessThanOrEqualTo(0)) continue;

    const totalCost = lots.reduce(
      (sum: Decimal, lot: Lot) => sum.plus(lot.quantity.times(lot.unitPrice)),
      new Decimal(0)
    );

    const averageCostBasis = totalCost.dividedBy(totalQuantity);

    positions.push({ assetId, quantity: totalQuantity, averageCostBasis, totalCost });
  }

  return positions;
}
