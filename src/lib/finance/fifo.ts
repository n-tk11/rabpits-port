import { Decimal } from "@prisma/client/runtime/client";

export type Lot = {
  quantity: Decimal;
  unitPrice: Decimal;
  date: Date;
};

export type FIFOResult = {
  remainingLots: Lot[];
  realizedGain: Decimal;
  costBasisSold: Decimal;
};

export class InsufficientQuantityError extends Error {
  constructor(available: Decimal, requested: Decimal) {
    super(
      `Insufficient quantity: requested ${requested.toString()}, available ${available.toString()}`
    );
    this.name = "InsufficientQuantityError";
  }
}

export class InvalidQuantityError extends Error {
  constructor(quantity: Decimal) {
    super(`Sell quantity must be positive, got ${quantity.toString()}`);
    this.name = "InvalidQuantityError";
  }
}

/**
 * Applies a FIFO sell against an ordered list of buy lots.
 * Lots must be ordered oldest-first (FIFO order).
 * Returns remaining lots, cost basis sold, and realized gain.
 */
export function applyFIFOSell(lots: Lot[], sellQuantity: Decimal, sellPrice: Decimal): FIFOResult {
  if (sellQuantity.lessThanOrEqualTo(0)) {
    throw new InvalidQuantityError(sellQuantity);
  }

  const totalAvailable = lots.reduce((sum, lot) => sum.plus(lot.quantity), new Decimal(0));
  if (totalAvailable.lessThan(sellQuantity)) {
    throw new InsufficientQuantityError(totalAvailable, sellQuantity);
  }

  const remainingLots: Lot[] = [];
  let quantityToSell = sellQuantity;
  let costBasisSold = new Decimal(0);

  for (const lot of lots) {
    if (quantityToSell.isZero()) {
      remainingLots.push(lot);
      continue;
    }

    if (lot.quantity.lessThanOrEqualTo(quantityToSell)) {
      // Consume this lot entirely
      costBasisSold = costBasisSold.plus(lot.quantity.times(lot.unitPrice));
      quantityToSell = quantityToSell.minus(lot.quantity);
    } else {
      // Partially consume this lot
      costBasisSold = costBasisSold.plus(quantityToSell.times(lot.unitPrice));
      remainingLots.push({
        ...lot,
        quantity: lot.quantity.minus(quantityToSell),
      });
      quantityToSell = new Decimal(0);
    }
  }

  const saleProceeds = sellQuantity.times(sellPrice);
  const realizedGain = saleProceeds.minus(costBasisSold);

  return { remainingLots, realizedGain, costBasisSold };
}
