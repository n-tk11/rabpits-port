import { Prisma } from "@prisma/client";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/db", () => ({
  db: {
    portfolio: {
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
  },
}));

import { createPortfolio, deletePortfolio, updatePortfolio } from "@/lib/actions/portfolios";
import { db } from "@/lib/db";

const mockDb = db as unknown as {
  portfolio: {
    create: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
    delete: ReturnType<typeof vi.fn>;
  };
};

const fakePortfolio = {
  id: "p1",
  name: "My Portfolio",
  description: null,
  baseCurrency: "USD",
  createdAt: new Date(),
  updatedAt: new Date(),
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe("createPortfolio", () => {
  it("creates a portfolio with valid input", async () => {
    mockDb.portfolio.create.mockResolvedValue(fakePortfolio);
    const result = await createPortfolio({ name: "My Portfolio", baseCurrency: "USD" });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.id).toBe("p1");
  });

  it("returns error when name is missing", async () => {
    const result = await createPortfolio({ name: "", baseCurrency: "USD" });
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toMatch(/name/i);
  });

  it("returns error when baseCurrency is missing", async () => {
    const result = await createPortfolio({ name: "Test", baseCurrency: "" });
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toMatch(/currency/i);
  });

  it("returns error when baseCurrency is not 3 characters", async () => {
    const result = await createPortfolio({ name: "Test", baseCurrency: "US" });
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toMatch(/3-character/i);
  });

  it("returns error when db throws", async () => {
    mockDb.portfolio.create.mockRejectedValue(new Error("DB error"));
    const result = await createPortfolio({ name: "Test", baseCurrency: "USD" });
    expect(result.success).toBe(false);
  });
});

describe("updatePortfolio", () => {
  it("updates a portfolio with valid input", async () => {
    mockDb.portfolio.update.mockResolvedValue({ ...fakePortfolio, name: "Updated" });
    const result = await updatePortfolio("p1", { name: "Updated", baseCurrency: "EUR" });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.name).toBe("Updated");
  });

  it("returns error when id is missing", async () => {
    const result = await updatePortfolio("", { name: "Updated", baseCurrency: "EUR" });
    expect(result.success).toBe(false);
  });

  it("returns error on db failure (non-existent id)", async () => {
    mockDb.portfolio.update.mockRejectedValue(new Error("Not found"));
    const result = await updatePortfolio("nonexistent", { name: "Updated", baseCurrency: "EUR" });
    expect(result.success).toBe(false);
  });
});

describe("deletePortfolio", () => {
  it("deletes a portfolio successfully", async () => {
    mockDb.portfolio.delete.mockResolvedValue(fakePortfolio);
    const result = await deletePortfolio("p1");
    expect(result.success).toBe(true);
    expect(mockDb.portfolio.delete).toHaveBeenCalledWith({ where: { id: "p1" } });
  });

  it("returns friendly error when portfolio has transactions (FK constraint P2003)", async () => {
    const fkError = new Prisma.PrismaClientKnownRequestError("FK violation", {
      code: "P2003",
      clientVersion: "0.0.0",
    });
    mockDb.portfolio.delete.mockRejectedValue(fkError);
    const result = await deletePortfolio("p1");
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toMatch(/transactions/i);
  });

  it("returns generic error on unexpected db failure", async () => {
    mockDb.portfolio.delete.mockRejectedValue(new Error("unexpected"));
    const result = await deletePortfolio("p1");
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toMatch(/failed/i);
  });

  it("returns error when id is missing", async () => {
    const result = await deletePortfolio("");
    expect(result.success).toBe(false);
  });
});
