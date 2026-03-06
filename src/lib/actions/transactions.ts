"use server";

import { Decimal } from "@prisma/client/runtime/client";
import { revalidatePath } from "next/cache";

import { upsertFxRate } from "@/lib/actions/fx";
import { triggerSnapshot } from "@/lib/actions/snapshot";
import { db } from "@/lib/db";
import { applyFIFOSell, InsufficientQuantityError, type Lot } from "@/lib/finance/fifo";
import { PriceSource, TransactionType } from "@/types";
import type { ActionResult } from "@/types";

type BuySellType = "BUY" | "SELL";

type CreateTransactionInput = {
  portfolioId: string;
  assetId: string;
  type: BuySellType;
  date: string;
  quantity: string;
  unitPrice: string;
  fee?: string;
  notes?: string;
  fxRate?: string;
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

export async function createTransaction(
  input: CreateTransactionInput
): Promise<ActionResult<Transaction>> {
  if (!input.portfolioId) return { success: false, error: "Portfolio ID is required" };
  if (!input.assetId) return { success: false, error: "Asset ID is required" };

  const quantity = new Decimal(input.quantity);
  const unitPrice = new Decimal(input.unitPrice);
  const fee = input.fee ? new Decimal(input.fee) : new Decimal(0);

  if (quantity.lessThanOrEqualTo(0)) {
    return { success: false, error: "Quantity must be positive" };
  }
  if (unitPrice.lessThanOrEqualTo(0)) {
    return { success: false, error: "Unit price must be positive" };
  }

  const asset = await db.asset.findUnique({
    where: { id: input.assetId },
    select: { pricingCurrency: true },
  });
  if (!asset) return { success: false, error: "Asset not found" };

  const portfolio = await db.portfolio.findUnique({
    where: { id: input.portfolioId },
    select: { baseCurrency: true },
  });
  if (!portfolio) return { success: false, error: "Portfolio not found" };

  const needsFx = asset.pricingCurrency !== portfolio.baseCurrency;
  if (needsFx && !input.fxRate) {
    return {
      success: false,
      error: `Exchange rate is required (1 ${asset.pricingCurrency} → ${portfolio.baseCurrency})`,
    };
  }

  if (input.type === TransactionType.SELL) {
    const priorTxs = await db.transaction.findMany({
      where: { portfolioId: input.portfolioId, assetId: input.assetId },
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
      applyFIFOSell(lots, quantity, unitPrice);
    } catch (e) {
      if (e instanceof InsufficientQuantityError) {
        return { success: false, error: "Insufficient quantity available to sell" };
      }
      throw e;
    }
  }

  try {
    const transaction = await db.transaction.create({
      data: {
        portfolioId: input.portfolioId,
        assetId: input.assetId,
        type: input.type,
        date: new Date(input.date),
        quantity,
        unitPrice,
        fee,
        notes: input.notes?.trim() ?? null,
      },
    });

    await db.price.create({
      data: {
        assetId: input.assetId,
        price: unitPrice,
        currency: asset.pricingCurrency,
        recordedAt: new Date(input.date),
        source: PriceSource.TRANSACTION,
      },
    });

    if (needsFx && input.fxRate) {
      await upsertFxRate(
        asset.pricingCurrency,
        portfolio.baseCurrency,
        new Decimal(input.fxRate),
        new Date(input.date)
      );
    }

    try {
      await triggerSnapshot(input.portfolioId);
    } catch (e) {
      console.error("[snapshot] Failed to trigger snapshot:", e);
    }

    revalidatePath(`/portfolios/${input.portfolioId}`);
    revalidatePath("/transactions");

    return { success: true, data: transaction as Transaction };
  } catch (e) {
    console.error(e);
    return { success: false, error: "Failed to create transaction" };
  }
}
