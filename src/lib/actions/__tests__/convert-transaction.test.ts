import { Decimal } from "@prisma/client/runtime/client";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/db", () => ({
  db: {
    $transaction: vi.fn(),
    transaction: {
      create: vi.fn(),
      findMany: vi.fn(),
    },
    asset: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
    },
    portfolio: {
      findUnique: vi.fn(),
    },
    price: {
      create: vi.fn(),
    },
  },
}));

import { createConvertTransaction } from "@/lib/actions/convert-transaction";
import { db } from "@/lib/db";
import { TransactionType } from "@/types";

type MockTx = {
  transaction: { create: ReturnType<typeof vi.fn> };
  price: { create: ReturnType<typeof vi.fn> };
};

type MockDb = {
  $transaction: ReturnType<typeof vi.fn>;
  transaction: {
    create: ReturnType<typeof vi.fn>;
    findMany: ReturnType<typeof vi.fn>;
  };
  asset: {
    findUnique: ReturnType<typeof vi.fn>;
    findFirst: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
  };
  portfolio: {
    findUnique: ReturnType<typeof vi.fn>;
  };
  price: {
    create: ReturnType<typeof vi.fn>;
  };
};

const mockDb = db as unknown as MockDb;

const fakeFromAsset = { id: "asset-usd", pricingCurrency: "USD", tickerSymbol: "USD" };
const fakeToAsset = { id: "asset-eur", pricingCurrency: "EUR", tickerSymbol: "EUR" };

const fakeBuyTx = {
  id: "tx-buy",
  portfolioId: "p1",
  assetId: "asset-usd",
  type: TransactionType.BUY,
  date: new Date("2024-01-01"),
  quantity: new Decimal(100),
  unitPrice: new Decimal(1),
  fee: new Decimal(0),
  notes: null,
  conversionId: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const fakeSellLeg = {
  id: "tx-sell-leg",
  portfolioId: "p1",
  assetId: "asset-usd",
  type: TransactionType.SELL,
  date: new Date("2024-06-01"),
  quantity: new Decimal(50),
  unitPrice: new Decimal(0.9),
  fee: new Decimal(1),
  notes: null,
  conversionId: "conv-uuid",
  createdAt: new Date(),
  updatedAt: new Date(),
};

const fakeBuyLeg = {
  id: "tx-buy-leg",
  portfolioId: "p1",
  assetId: "asset-eur",
  type: TransactionType.BUY,
  date: new Date("2024-06-01"),
  quantity: new Decimal(45),
  unitPrice: new Decimal(1.11),
  fee: new Decimal(1),
  notes: null,
  conversionId: "conv-uuid",
  createdAt: new Date(),
  updatedAt: new Date(),
};

const validInput = {
  portfolioId: "p1",
  fromAssetId: "asset-usd",
  toAssetId: "asset-eur",
  date: "2024-06-01",
  fromQuantity: "50",
  toQuantity: "45",
  fee: "2",
  toFxRate: "1.1",
};

function setupHappyPath(mockTx: MockTx) {
  mockDb.asset.findUnique.mockImplementation(({ where }: { where: { id: string } }) => {
    if (where.id === "asset-usd") return Promise.resolve(fakeFromAsset);
    if (where.id === "asset-eur") return Promise.resolve(fakeToAsset);
    return Promise.resolve(null);
  });
  mockDb.portfolio.findUnique.mockResolvedValue({ baseCurrency: "USD" });
  mockDb.asset.findFirst.mockResolvedValue({ id: "cash-eur" });
  mockDb.price.create.mockResolvedValue({});
  mockDb.transaction.findMany.mockResolvedValue([fakeBuyTx]);
  mockTx.transaction.create.mockResolvedValueOnce(fakeSellLeg).mockResolvedValueOnce(fakeBuyLeg);
  mockTx.price.create.mockResolvedValue({});
  mockDb.$transaction.mockImplementation((fn: (tx: MockTx) => Promise<unknown>) => fn(mockTx));
}

beforeEach(() => {
  vi.clearAllMocks();
  mockDb.portfolio.findUnique.mockResolvedValue({ baseCurrency: "USD" });
  mockDb.asset.findFirst.mockResolvedValue({ id: "cash-eur" });
  mockDb.price.create.mockResolvedValue({});
});

describe("createConvertTransaction", () => {
  it("creates two linked transactions with the same conversionId", async () => {
    const mockTx: MockTx = {
      transaction: { create: vi.fn() },
      price: { create: vi.fn() },
    };
    setupHappyPath(mockTx);

    const result = await createConvertTransaction(validInput);

    expect(result.success).toBe(true);
    expect(mockTx.transaction.create).toHaveBeenCalledTimes(2);

    const firstCall = mockTx.transaction.create.mock.calls[0][0];
    const secondCall = mockTx.transaction.create.mock.calls[1][0];
    expect(firstCall.data.conversionId).toBe(secondCall.data.conversionId);
    expect(typeof firstCall.data.conversionId).toBe("string");
    expect(firstCall.data.conversionId.length).toBeGreaterThan(0);
  });

  it("SELL leg has type=SELL and fromAssetId", async () => {
    const mockTx: MockTx = {
      transaction: { create: vi.fn() },
      price: { create: vi.fn() },
    };
    setupHappyPath(mockTx);

    await createConvertTransaction(validInput);

    const sellCall = mockTx.transaction.create.mock.calls[0][0];
    expect(sellCall.data.type).toBe(TransactionType.SELL);
    expect(sellCall.data.assetId).toBe("asset-usd");
  });

  it("BUY leg has type=BUY and toAssetId", async () => {
    const mockTx: MockTx = {
      transaction: { create: vi.fn() },
      price: { create: vi.fn() },
    };
    setupHappyPath(mockTx);

    await createConvertTransaction(validInput);

    const buyCall = mockTx.transaction.create.mock.calls[1][0];
    expect(buyCall.data.type).toBe(TransactionType.BUY);
    expect(buyCall.data.assetId).toBe("asset-eur");
  });

  it("returns data with sellLeg and buyLeg on success", async () => {
    const mockTx: MockTx = {
      transaction: { create: vi.fn() },
      price: { create: vi.fn() },
    };
    setupHappyPath(mockTx);
    mockDb.$transaction.mockImplementation((fn: (tx: MockTx) => Promise<unknown>) => fn(mockTx));

    const result = await createConvertTransaction(validInput);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.sellLeg.id).toBe("tx-sell-leg");
      expect(result.data.buyLeg.id).toBe("tx-buy-leg");
    }
  });

  it("returns error when fromQuantity is zero", async () => {
    const result = await createConvertTransaction({ ...validInput, fromQuantity: "0" });
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toMatch(/fromQuantity|quantity/i);
  });

  it("returns error when fromQuantity is negative", async () => {
    const result = await createConvertTransaction({ ...validInput, fromQuantity: "-5" });
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toMatch(/fromQuantity|quantity/i);
  });

  it("returns error when toQuantity is zero", async () => {
    const result = await createConvertTransaction({ ...validInput, toQuantity: "0" });
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toMatch(/toQuantity|quantity/i);
  });

  it("returns error when toQuantity is negative", async () => {
    const result = await createConvertTransaction({ ...validInput, toQuantity: "-5" });
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toMatch(/toQuantity|quantity/i);
  });

  it("returns error when fromAssetId equals toAssetId", async () => {
    const result = await createConvertTransaction({
      ...validInput,
      toAssetId: validInput.fromAssetId,
    });
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toMatch(/same asset|differ/i);
  });

  it("returns error when fromAsset is not found", async () => {
    mockDb.asset.findUnique.mockResolvedValue(null);
    const result = await createConvertTransaction(validInput);
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toMatch(/asset.*not found|not found/i);
  });

  it("returns error when toAsset is not found", async () => {
    mockDb.asset.findUnique.mockImplementation(({ where }: { where: { id: string } }) => {
      if (where.id === "asset-usd") return Promise.resolve(fakeFromAsset);
      return Promise.resolve(null);
    });
    const result = await createConvertTransaction(validInput);
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toMatch(/asset.*not found|not found/i);
  });

  it("returns error when fromAsset has insufficient quantity (FIFO check)", async () => {
    mockDb.asset.findUnique.mockImplementation(({ where }: { where: { id: string } }) => {
      if (where.id === "asset-usd") return Promise.resolve(fakeFromAsset);
      if (where.id === "asset-eur") return Promise.resolve(fakeToAsset);
      return Promise.resolve(null);
    });
    // Only 10 units available but trying to sell 50
    mockDb.transaction.findMany.mockResolvedValue([{ ...fakeBuyTx, quantity: new Decimal(10) }]);

    const result = await createConvertTransaction(validInput); // fromQuantity = 50
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toMatch(/insufficient/i);
  });

  it("returns { success: false } when db.$transaction throws", async () => {
    mockDb.asset.findUnique.mockImplementation(({ where }: { where: { id: string } }) => {
      if (where.id === "asset-usd") return Promise.resolve(fakeFromAsset);
      if (where.id === "asset-eur") return Promise.resolve(fakeToAsset);
      return Promise.resolve(null);
    });
    mockDb.transaction.findMany.mockResolvedValue([fakeBuyTx]);
    mockDb.$transaction.mockRejectedValue(new Error("DB error"));

    const result = await createConvertTransaction(validInput);
    expect(result.success).toBe(false);
  });
});
