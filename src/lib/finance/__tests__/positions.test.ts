import { Decimal } from "@prisma/client/runtime/client";
import { describe, expect, it } from "vitest";

import { computePositions, LedgerEntry } from "../positions";

function d(value: string | number): Decimal {
  return new Decimal(value);
}

describe("computePositions", () => {
  it("returns [] for an empty ledger", () => {
    expect(computePositions([])).toEqual([]);
  });

  it("single BUY produces one position with correct qty, avgCost, totalCost", () => {
    const entries: LedgerEntry[] = [
      {
        assetId: "AAPL",
        type: "BUY",
        date: new Date("2024-01-01"),
        quantity: d("10"),
        unitPrice: d("100"),
      },
    ];

    const result = computePositions(entries);

    expect(result).toHaveLength(1);
    expect(result[0].assetId).toBe("AAPL");
    expect(result[0].quantity.toString()).toBe("10");
    expect(result[0].totalCost.toString()).toBe("1000");
    expect(result[0].averageCostBasis.toString()).toBe("100");
  });

  it("BUY then partial SELL reduces qty via FIFO depletion", () => {
    const entries: LedgerEntry[] = [
      {
        assetId: "AAPL",
        type: "BUY",
        date: new Date("2024-01-01"),
        quantity: d("10"),
        unitPrice: d("100"),
      },
      {
        assetId: "AAPL",
        type: "SELL",
        date: new Date("2024-01-02"),
        quantity: d("4"),
        unitPrice: d("120"),
      },
    ];

    const result = computePositions(entries);

    expect(result).toHaveLength(1);
    expect(result[0].assetId).toBe("AAPL");
    expect(result[0].quantity.toString()).toBe("6");
    expect(result[0].totalCost.toString()).toBe("600");
    expect(result[0].averageCostBasis.toString()).toBe("100");
  });

  it("BUY then full SELL returns [] (position filtered out)", () => {
    const entries: LedgerEntry[] = [
      {
        assetId: "AAPL",
        type: "BUY",
        date: new Date("2024-01-01"),
        quantity: d("10"),
        unitPrice: d("100"),
      },
      {
        assetId: "AAPL",
        type: "SELL",
        date: new Date("2024-01-02"),
        quantity: d("10"),
        unitPrice: d("150"),
      },
    ];

    expect(computePositions(entries)).toEqual([]);
  });

  it("multiple BUYs then SELL across lots uses FIFO correctly", () => {
    const entries: LedgerEntry[] = [
      {
        assetId: "MSFT",
        type: "BUY",
        date: new Date("2024-01-01"),
        quantity: d("5"),
        unitPrice: d("200"),
      },
      {
        assetId: "MSFT",
        type: "BUY",
        date: new Date("2024-01-02"),
        quantity: d("5"),
        unitPrice: d("220"),
      },
      {
        assetId: "MSFT",
        type: "SELL",
        date: new Date("2024-01-03"),
        quantity: d("7"),
        unitPrice: d("250"),
      },
    ];

    const result = computePositions(entries);

    // After FIFO sell of 7: first lot (5@200) fully consumed, second lot 2 remain (3@220 remain)
    expect(result).toHaveLength(1);
    expect(result[0].assetId).toBe("MSFT");
    expect(result[0].quantity.toString()).toBe("3");
    // totalCost = 3 * 220 = 660
    expect(result[0].totalCost.toString()).toBe("660");
    // averageCostBasis = 660 / 3 = 220
    expect(result[0].averageCostBasis.toString()).toBe("220");
  });

  it("multiple assets produce separate positions", () => {
    const entries: LedgerEntry[] = [
      {
        assetId: "AAPL",
        type: "BUY",
        date: new Date("2024-01-01"),
        quantity: d("10"),
        unitPrice: d("100"),
      },
      {
        assetId: "GOOG",
        type: "BUY",
        date: new Date("2024-01-01"),
        quantity: d("2"),
        unitPrice: d("500"),
      },
    ];

    const result = computePositions(entries);
    const byAsset = Object.fromEntries(result.map((p) => [p.assetId, p]));

    expect(result).toHaveLength(2);
    expect(byAsset["AAPL"].quantity.toString()).toBe("10");
    expect(byAsset["GOOG"].quantity.toString()).toBe("2");
    expect(byAsset["AAPL"].totalCost.toString()).toBe("1000");
    expect(byAsset["GOOG"].totalCost.toString()).toBe("1000");
  });

  it("FEE entry does not affect position quantity or cost basis", () => {
    const entries: LedgerEntry[] = [
      {
        assetId: "AAPL",
        type: "BUY",
        date: new Date("2024-01-01"),
        quantity: d("10"),
        unitPrice: d("100"),
      },
      {
        assetId: "AAPL",
        type: "FEE",
        date: new Date("2024-01-02"),
        quantity: d("1"),
        unitPrice: d("0"),
      },
    ];

    const result = computePositions(entries);

    expect(result).toHaveLength(1);
    expect(result[0].quantity.toString()).toBe("10");
    expect(result[0].totalCost.toString()).toBe("1000");
  });

  it("entries out of date order are processed in date order", () => {
    const entries: LedgerEntry[] = [
      {
        assetId: "TSLA",
        type: "SELL",
        date: new Date("2024-01-03"),
        quantity: d("3"),
        unitPrice: d("300"),
      },
      {
        assetId: "TSLA",
        type: "BUY",
        date: new Date("2024-01-01"),
        quantity: d("10"),
        unitPrice: d("200"),
      },
    ];

    const result = computePositions(entries);

    // BUY processed first (date order), then SELL → 7 remain
    expect(result).toHaveLength(1);
    expect(result[0].quantity.toString()).toBe("7");
    expect(result[0].totalCost.toString()).toBe("1400");
    expect(result[0].averageCostBasis.toString()).toBe("200");
  });
});
