import { Decimal } from "@prisma/client/runtime/client";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/db", () => ({
  db: {
    transaction: {
      create: vi.fn(),
      findMany: vi.fn(),
    },
    asset: {
      findUnique: vi.fn(),
    },
    portfolio: {
      findUnique: vi.fn(),
    },
    price: {
      create: vi.fn(),
    },
  },
}));

import { createTransaction } from "@/lib/actions/transactions";
import { db } from "@/lib/db";
import { TransactionType } from "@/types";

type MockDb = {
  transaction: {
    create: ReturnType<typeof vi.fn>;
    findMany: ReturnType<typeof vi.fn>;
  };
  asset: {
    findUnique: ReturnType<typeof vi.fn>;
  };
  portfolio: {
    findUnique: ReturnType<typeof vi.fn>;
  };
  price: {
    create: ReturnType<typeof vi.fn>;
  };
};

const mockDb = db as unknown as MockDb;

const fakeAsset = { id: "asset1", pricingCurrency: "USD" };

const fakeBuyTx = {
  id: "tx1",
  portfolioId: "p1",
  assetId: "asset1",
  type: TransactionType.BUY,
  date: new Date("2024-01-01"),
  quantity: new Decimal(10),
  unitPrice: new Decimal(100),
  fee: new Decimal(0),
  notes: null,
  conversionId: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const validBuyInput = {
  portfolioId: "p1",
  assetId: "asset1",
  type: TransactionType.BUY,
  date: "2024-06-01",
  quantity: "10",
  unitPrice: "150",
  fee: "5",
};

const validSellInput = {
  portfolioId: "p1",
  assetId: "asset1",
  type: TransactionType.SELL,
  date: "2024-06-01",
  quantity: "5",
  unitPrice: "200",
};

beforeEach(() => {
  vi.clearAllMocks();
  mockDb.asset.findUnique.mockResolvedValue(fakeAsset);
  mockDb.portfolio.findUnique.mockResolvedValue({ baseCurrency: "USD" });
  mockDb.price.create.mockResolvedValue({});
});

describe("createTransaction — BUY", () => {
  it("creates a buy transaction with valid input", async () => {
    mockDb.transaction.create.mockResolvedValue(fakeBuyTx);
    const result = await createTransaction(validBuyInput);
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.id).toBe("tx1");
  });

  it("calls db.transaction.create with correct data", async () => {
    mockDb.transaction.create.mockResolvedValue(fakeBuyTx);
    await createTransaction(validBuyInput);
    expect(mockDb.transaction.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          portfolioId: "p1",
          assetId: "asset1",
          type: TransactionType.BUY,
        }),
      })
    );
  });

  it("returns error when quantity is zero", async () => {
    const result = await createTransaction({ ...validBuyInput, quantity: "0" });
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toMatch(/quantity/i);
  });

  it("returns error when quantity is negative", async () => {
    const result = await createTransaction({ ...validBuyInput, quantity: "-5" });
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toMatch(/quantity/i);
  });

  it("returns error when unit price is zero", async () => {
    const result = await createTransaction({ ...validBuyInput, unitPrice: "0" });
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toMatch(/price/i);
  });

  it("returns error when unit price is negative", async () => {
    const result = await createTransaction({ ...validBuyInput, unitPrice: "-10" });
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toMatch(/price/i);
  });

  it("returns error when asset is not found", async () => {
    mockDb.asset.findUnique.mockResolvedValue(null);
    const result = await createTransaction(validBuyInput);
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toMatch(/asset/i);
  });

  it("returns error when portfolioId is missing", async () => {
    const result = await createTransaction({ ...validBuyInput, portfolioId: "" });
    expect(result.success).toBe(false);
  });

  it("returns error when assetId is missing", async () => {
    const result = await createTransaction({ ...validBuyInput, assetId: "" });
    expect(result.success).toBe(false);
  });

  it("returns { success: false } when db throws", async () => {
    mockDb.transaction.create.mockRejectedValue(new Error("DB error"));
    const result = await createTransaction(validBuyInput);
    expect(result.success).toBe(false);
  });
});

describe("createTransaction — SELL", () => {
  it("creates a sell transaction when sufficient quantity is available", async () => {
    mockDb.transaction.findMany.mockResolvedValue([fakeBuyTx]);
    mockDb.transaction.create.mockResolvedValue({
      ...fakeBuyTx,
      id: "tx2",
      type: TransactionType.SELL,
      quantity: new Decimal(5),
    });
    const result = await createTransaction(validSellInput);
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.id).toBe("tx2");
  });

  it("returns error when selling more than available quantity", async () => {
    mockDb.transaction.findMany.mockResolvedValue([fakeBuyTx]); // only 10 units
    const result = await createTransaction({ ...validSellInput, quantity: "15" });
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toMatch(/insufficient/i);
  });

  it("returns error when there are no prior buy lots", async () => {
    mockDb.transaction.findMany.mockResolvedValue([]);
    const result = await createTransaction(validSellInput);
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toMatch(/insufficient/i);
  });

  it("accounts for prior sells when validating available quantity", async () => {
    // 10 bought, then sold 8 → only 2 remaining; selling 5 should fail
    const priorSell = {
      ...fakeBuyTx,
      id: "tx-sell",
      type: TransactionType.SELL,
      quantity: new Decimal(8),
    };
    mockDb.transaction.findMany.mockResolvedValue([fakeBuyTx, priorSell]);
    const result = await createTransaction({ ...validSellInput, quantity: "5" });
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toMatch(/insufficient/i);
  });

  it("succeeds when selling exactly the remaining quantity", async () => {
    mockDb.transaction.findMany.mockResolvedValue([fakeBuyTx]); // 10 units
    mockDb.transaction.create.mockResolvedValue({
      ...fakeBuyTx,
      id: "tx-sell-all",
      type: TransactionType.SELL,
      quantity: new Decimal(10),
    });
    const result = await createTransaction({ ...validSellInput, quantity: "10" });
    expect(result.success).toBe(true);
  });
});
