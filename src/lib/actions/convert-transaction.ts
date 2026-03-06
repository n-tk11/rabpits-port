"use server";

import { Decimal } from "@prisma/client/runtime/client";
import { revalidatePath } from "next/cache";

import { upsertFxRate } from "@/lib/actions/fx";
import { triggerSnapshot } from "@/lib/actions/snapshot";
import { db } from "@/lib/db";
import { applyFIFOSell, InsufficientQuantityError, type Lot } from "@/lib/finance/fifo";
import { PriceSource, TransactionType } from "@/types";
import type { ActionResult } from "@/types";

type CreateConvertTransactionInput = {
  portfolioId: string;
  fromAssetId: string;
  toAssetId: string;
  date: string;
  fromQuantity: string;
  toQuantity: string;
  fee?: string;
  notes?: string;
  fromFxRate?: string;
  toFxRate?: string;
};

type Transaction = {
  id: string;
  portfolioId: string;
  assetId: string;
  type: TransactionType;
  date: Date;
  quantity: Decimal;
  unitPrice: Decimal;
  fee: Decimal;
  notes: string | null;
  conversionId: string | null;
  createdAt: Date;
  updatedAt: Date;
};

type ConvertTransactionResult = {
  sellLeg: Transaction;
  buyLeg: Transaction;
};

export async function createConvertTransaction(
  input: CreateConvertTransactionInput
): Promise<ActionResult<ConvertTransactionResult>> {
  const fromQuantity = new Decimal(input.fromQuantity);
  const toQuantity = new Decimal(input.toQuantity);
  const totalFee = input.fee ? new Decimal(input.fee) : new Decimal(0);
  const halfFee = totalFee.dividedBy(2);

  if (fromQuantity.lessThanOrEqualTo(0)) {
    return { success: false, error: "fromQuantity must be positive" };
  }
  if (toQuantity.lessThanOrEqualTo(0)) {
    return { success: false, error: "toQuantity must be positive" };
  }
  if (input.fromAssetId === input.toAssetId) {
    return { success: false, error: "From and To assets must differ" };
  }

  const [fromAsset, toAsset, portfolio] = await Promise.all([
    db.asset.findUnique({ where: { id: input.fromAssetId }, select: { pricingCurrency: true } }),
    db.asset.findUnique({ where: { id: input.toAssetId }, select: { pricingCurrency: true } }),
    db.portfolio.findUnique({ where: { id: input.portfolioId }, select: { baseCurrency: true } }),
  ]);

  if (!fromAsset) return { success: false, error: "From asset not found" };
  if (!toAsset) return { success: false, error: "To asset not found" };
  if (!portfolio) return { success: false, error: "Portfolio not found" };

  if (fromAsset.pricingCurrency !== portfolio.baseCurrency && !input.fromFxRate) {
    return {
      success: false,
      error: `Exchange rate required for From asset (1 ${fromAsset.pricingCurrency} → ${portfolio.baseCurrency})`,
    };
  }
  if (
    toAsset.pricingCurrency !== portfolio.baseCurrency &&
    toAsset.pricingCurrency !== fromAsset.pricingCurrency &&
    !input.toFxRate
  ) {
    return {
      success: false,
      error: `Exchange rate required for To asset (1 ${toAsset.pricingCurrency} → ${portfolio.baseCurrency})`,
    };
  }

  // FIFO validation: check fromAsset has sufficient quantity
  const priorTxs = await db.transaction.findMany({
    where: { portfolioId: input.portfolioId, assetId: input.fromAssetId },
    orderBy: { date: "asc" },
  });

  let lots: Lot[] = [];
  for (const tx of priorTxs) {
    if (tx.type === TransactionType.BUY) {
      lots.push({
        quantity: new Decimal(tx.quantity.toString()),
        unitPrice: new Decimal(tx.unitPrice.toString()),
        date: tx.date,
      });
    } else if (tx.type === TransactionType.SELL) {
      const result = applyFIFOSell(
        lots,
        new Decimal(tx.quantity.toString()),
        new Decimal(tx.unitPrice.toString())
      );
      lots = result.remainingLots;
    }
  }

  try {
    applyFIFOSell(lots, fromQuantity, toQuantity.dividedBy(fromQuantity));
  } catch (e) {
    if (e instanceof InsufficientQuantityError) {
      return { success: false, error: "Insufficient quantity available to sell" };
    }
    throw e;
  }

  const conversionId = crypto.randomUUID();
  const date = new Date(input.date);
  const sellUnitPrice = toQuantity.dividedBy(fromQuantity);
  const buyUnitPrice = fromQuantity.dividedBy(toQuantity);
  const notes = input.notes?.trim() ?? null;

  try {
    const result = await db.$transaction(async (tx) => {
      const sellLeg = await tx.transaction.create({
        data: {
          portfolioId: input.portfolioId,
          assetId: input.fromAssetId,
          type: TransactionType.SELL,
          date,
          quantity: fromQuantity,
          unitPrice: sellUnitPrice,
          fee: halfFee,
          notes,
          conversionId,
        },
      });

      const buyLeg = await tx.transaction.create({
        data: {
          portfolioId: input.portfolioId,
          assetId: input.toAssetId,
          type: TransactionType.BUY,
          date,
          quantity: toQuantity,
          unitPrice: buyUnitPrice,
          fee: halfFee,
          notes,
          conversionId,
        },
      });

      await tx.price.create({
        data: {
          assetId: input.fromAssetId,
          price: sellUnitPrice,
          currency: fromAsset.pricingCurrency,
          recordedAt: date,
          source: PriceSource.TRANSACTION,
        },
      });

      await tx.price.create({
        data: {
          assetId: input.toAssetId,
          price: buyUnitPrice,
          currency: toAsset.pricingCurrency,
          recordedAt: date,
          source: PriceSource.TRANSACTION,
        },
      });

      return { sellLeg: sellLeg as Transaction, buyLeg: buyLeg as Transaction };
    });

    revalidatePath(`/portfolios/${input.portfolioId}`);
    revalidatePath("/transactions");

    if (fromAsset.pricingCurrency !== portfolio.baseCurrency && input.fromFxRate) {
      await upsertFxRate(
        fromAsset.pricingCurrency,
        portfolio.baseCurrency,
        new Decimal(input.fromFxRate),
        date
      );
    }
    if (
      toAsset.pricingCurrency !== portfolio.baseCurrency &&
      toAsset.pricingCurrency !== fromAsset.pricingCurrency &&
      input.toFxRate
    ) {
      await upsertFxRate(
        toAsset.pricingCurrency,
        portfolio.baseCurrency,
        new Decimal(input.toFxRate),
        date
      );
    } else if (
      toAsset.pricingCurrency !== portfolio.baseCurrency &&
      toAsset.pricingCurrency === fromAsset.pricingCurrency &&
      input.fromFxRate
    ) {
      // same currency as fromAsset — already handled above
    }

    try {
      await triggerSnapshot(input.portfolioId);
    } catch (e) {
      console.error("[snapshot] Failed to trigger snapshot:", e);
    }

    return { success: true, data: result };
  } catch (e) {
    console.error(e);
    return { success: false, error: "Failed to create convert transaction" };
  }
}
