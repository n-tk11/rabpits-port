import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/db", () => ({
  db: {
    asset: {
      create: vi.fn(),
      update: vi.fn(),
    },
  },
}));

import { createAsset, updateAsset } from "@/lib/actions/assets";
import { db } from "@/lib/db";
import { AssetType } from "@/types";

const mockDb = db as unknown as {
  asset: {
    create: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
  };
};

const fakeAsset = {
  id: "a1",
  name: "Apple Inc.",
  type: AssetType.STOCK_ETF,
  tickerSymbol: "AAPL",
  pricingCurrency: "USD",
  notes: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const validInput = {
  name: "Apple Inc.",
  type: AssetType.STOCK_ETF,
  tickerSymbol: "AAPL",
  pricingCurrency: "USD",
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe("createAsset", () => {
  it("creates an asset with valid input", async () => {
    mockDb.asset.create.mockResolvedValue(fakeAsset);
    const result = await createAsset(validInput);
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.id).toBe("a1");
  });

  it("returns error when name is missing", async () => {
    const result = await createAsset({ ...validInput, name: "" });
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toMatch(/name/i);
  });

  it("returns error when tickerSymbol is missing", async () => {
    const result = await createAsset({ ...validInput, tickerSymbol: "" });
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toMatch(/ticker/i);
  });

  it("returns error when pricingCurrency is missing", async () => {
    const result = await createAsset({ ...validInput, pricingCurrency: "" });
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toMatch(/currency/i);
  });

  it("returns error when type is invalid", async () => {
    const result = await createAsset({ ...validInput, type: "INVALID" as AssetType });
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toMatch(/type/i);
  });

  it("returns error when db throws", async () => {
    mockDb.asset.create.mockRejectedValue(new Error("DB error"));
    const result = await createAsset(validInput);
    expect(result.success).toBe(false);
  });
});

describe("updateAsset", () => {
  it("updates an asset with valid input", async () => {
    mockDb.asset.update.mockResolvedValue({ ...fakeAsset, name: "Apple Updated" });
    const result = await updateAsset("a1", { ...validInput, name: "Apple Updated" });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.name).toBe("Apple Updated");
  });

  it("returns error when id is missing", async () => {
    const result = await updateAsset("", validInput);
    expect(result.success).toBe(false);
  });

  it("returns error on db failure (non-existent id)", async () => {
    mockDb.asset.update.mockRejectedValue(new Error("Not found"));
    const result = await updateAsset("nonexistent", validInput);
    expect(result.success).toBe(false);
  });
});
