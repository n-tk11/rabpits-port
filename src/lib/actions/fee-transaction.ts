"use server";

import { Decimal } from "@prisma/client/runtime/client";
import { revalidatePath } from "next/cache";

import { db } from "@/lib/db";
import { TransactionType } from "@/types";
import type { ActionResult } from "@/types";

type CreateFeeTransactionInput = {
  portfolioId: string;
  assetId: string;
  date: string;
  amount: string;
  notes?: string;
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

export async function createFeeTransaction(
  input: CreateFeeTransactionInput
): Promise<ActionResult<Transaction>> {
  if (!input.portfolioId) return { success: false, error: "Portfolio ID is required" };
  if (!input.assetId) return { success: false, error: "Asset ID is required" };

  const amount = new Decimal(input.amount);

  if (amount.lessThanOrEqualTo(0)) {
    return { success: false, error: "Amount must be positive" };
  }

  const asset = await db.asset.findUnique({ where: { id: input.assetId } });
  if (!asset) return { success: false, error: "Asset not found" };

  try {
    const transaction = await db.transaction.create({
      data: {
        portfolioId: input.portfolioId,
        assetId: input.assetId,
        type: TransactionType.FEE,
        date: new Date(input.date),
        quantity: amount,
        unitPrice: new Decimal("1"),
        fee: new Decimal("0"),
        notes: input.notes?.trim() ?? null,
      },
    });

    revalidatePath(`/portfolios/${input.portfolioId}`);
    revalidatePath("/transactions");

    return { success: true, data: transaction as Transaction };
  } catch (e) {
    console.error(e);
    return { success: false, error: "Failed to create fee transaction" };
  }
}
