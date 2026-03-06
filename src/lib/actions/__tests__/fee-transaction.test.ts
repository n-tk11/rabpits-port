import { Decimal } from "@prisma/client/runtime/client";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/db", () => ({
  db: {
    transaction: {
      create: vi.fn(),
    },
    asset: {
      findUnique: vi.fn(),
    },
  },
}));

import { createFeeTransaction } from "@/lib/actions/fee-transaction";
import { db } from "@/lib/db";
import { TransactionType } from "@/types";

type MockDb = {
  transaction: {
    create: ReturnType<typeof vi.fn>;
  };
  asset: {
    findUnique: ReturnType<typeof vi.fn>;
  };
};

const mockDb = db as unknown as MockDb;

const fakeAsset = { id: "asset1", pricingCurrency: "USD" };

const fakeFeeTransaction = {
  id: "tx-fee-1",
  portfolioId: "p1",
  assetId: "asset1",
  type: TransactionType.FEE,
  date: new Date("2024-06-01"),
  quantity: new Decimal("25"),
  unitPrice: new Decimal("1"),
  fee: new Decimal("0"),
  notes: null,
  conversionId: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const validFeeInput = {
  portfolioId: "p1",
  assetId: "asset1",
  date: "2024-06-01",
  amount: "25",
};

beforeEach(() => {
  vi.clearAllMocks();
  mockDb.asset.findUnique.mockResolvedValue(fakeAsset);
  mockDb.transaction.create.mockResolvedValue(fakeFeeTransaction);
});

describe("createFeeTransaction", () => {
  it("creates a fee transaction with valid input", async () => {
    const result = await createFeeTransaction(validFeeInput);
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.id).toBe("tx-fee-1");
  });

  it("transaction has type=FEE, quantity=amount, unitPrice=1", async () => {
    await createFeeTransaction(validFeeInput);
    expect(mockDb.transaction.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          type: TransactionType.FEE,
          quantity: new Decimal("25"),
          unitPrice: new Decimal("1"),
          fee: new Decimal("0"),
        }),
      })
    );
  });

  it("returns error when amount is zero", async () => {
    const result = await createFeeTransaction({ ...validFeeInput, amount: "0" });
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toMatch(/amount/i);
  });

  it("returns error when amount is negative", async () => {
    const result = await createFeeTransaction({ ...validFeeInput, amount: "-10" });
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toMatch(/amount/i);
  });

  it("returns error when portfolioId is missing", async () => {
    const result = await createFeeTransaction({ ...validFeeInput, portfolioId: "" });
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toMatch(/portfolio/i);
  });

  it("returns error when assetId is missing", async () => {
    const result = await createFeeTransaction({ ...validFeeInput, assetId: "" });
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toMatch(/asset/i);
  });

  it("returns error when asset not found", async () => {
    mockDb.asset.findUnique.mockResolvedValue(null);
    const result = await createFeeTransaction(validFeeInput);
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toMatch(/asset/i);
  });

  it("returns { success: false } when db.transaction.create throws", async () => {
    mockDb.transaction.create.mockRejectedValue(new Error("DB error"));
    const result = await createFeeTransaction(validFeeInput);
    expect(result.success).toBe(false);
  });
});
