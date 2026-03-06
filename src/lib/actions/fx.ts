"use server";

import { Decimal } from "@prisma/client/runtime/client";

import { db } from "@/lib/db";
import { AssetType, PriceSource } from "@/types";

/**
 * Finds or auto-creates a CASH asset for `foreignCurrency`, then upserts
 * a Price record so the snapshot engine can convert it to `baseCurrency`.
 */
export async function upsertFxRate(
  foreignCurrency: string,
  baseCurrency: string,
  rate: Decimal,
  date: Date
): Promise<void> {
  let cashAsset = await db.asset.findFirst({
    where: { type: AssetType.CASH, pricingCurrency: foreignCurrency },
    select: { id: true },
  });

  if (!cashAsset) {
    cashAsset = await db.asset.create({
      data: {
        name: `${foreignCurrency} Cash`,
        type: AssetType.CASH,
        tickerSymbol: foreignCurrency,
        pricingCurrency: foreignCurrency,
      },
      select: { id: true },
    });
  }

  await db.price.create({
    data: {
      assetId: cashAsset.id,
      price: rate,
      currency: baseCurrency,
      recordedAt: date,
      source: PriceSource.MANUAL,
    },
  });
}
