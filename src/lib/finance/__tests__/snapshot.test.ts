import { Decimal } from "@prisma/client/runtime/client";
import { describe, expect, it } from "vitest";

import type { Position } from "../positions";
import { computePortfolioSnapshot, ExchangeRateMap, PriceMap } from "../snapshot";

function d(value: string | number): Decimal {
  return new Decimal(value);
}

function pos(assetId: string, quantity: string): Position {
  return {
    assetId,
    quantity: d(quantity),
    averageCostBasis: d("0"),
    totalCost: d("0"),
  };
}

describe("computePortfolioSnapshot", () => {
  it("Case 1 — single asset priced in base currency", () => {
    const positions: Position[] = [pos("A", "10")];
    const prices: PriceMap = new Map([["A", { price: d("150"), currency: "USD" }]]);
    const exchangeRates: ExchangeRateMap = new Map();

    const result = computePortfolioSnapshot(positions, prices, "USD", exchangeRates);

    expect(result.totalValue.toString()).toBe("1500");
    expect(result.breakdown["A"].toString()).toBe("1500");
  });

  it("Case 2 — multi-asset with FX conversion", () => {
    const positions: Position[] = [pos("A", "10"), pos("B", "5")];
    const prices: PriceMap = new Map([
      ["A", { price: d("100"), currency: "USD" }],
      ["B", { price: d("200"), currency: "EUR" }],
    ]);
    const exchangeRates: ExchangeRateMap = new Map([["EUR", d("1.10")]]);

    const result = computePortfolioSnapshot(positions, prices, "USD", exchangeRates);

    expect(result.breakdown["A"].toString()).toBe("1000");
    expect(result.breakdown["B"].toString()).toBe("1100");
    expect(result.totalValue.toString()).toBe("2100");
  });

  it("Case 3 — position with zero quantity is excluded", () => {
    const positions: Position[] = [pos("A", "0")];
    const prices: PriceMap = new Map([["A", { price: d("100"), currency: "USD" }]]);
    const exchangeRates: ExchangeRateMap = new Map();

    const result = computePortfolioSnapshot(positions, prices, "USD", exchangeRates);

    expect(result.totalValue.toString()).toBe("0");
    expect(result.breakdown).toEqual({});
  });

  it("Case 4 — no positions returns zero total and empty breakdown", () => {
    const result = computePortfolioSnapshot([], new Map(), "USD", new Map());

    expect(result.totalValue.toString()).toBe("0");
    expect(result.breakdown).toEqual({});
  });

  it("Case 5 — asset with no price record is skipped", () => {
    const positions: Position[] = [pos("A", "10")];
    const prices: PriceMap = new Map();
    const exchangeRates: ExchangeRateMap = new Map();

    const result = computePortfolioSnapshot(positions, prices, "USD", exchangeRates);

    expect(result.totalValue.toString()).toBe("0");
    expect(result.breakdown).toEqual({});
  });

  it("Case 6 — asset with missing exchange rate is skipped", () => {
    const positions: Position[] = [pos("A", "10")];
    const prices: PriceMap = new Map([["A", { price: d("100"), currency: "EUR" }]]);
    const exchangeRates: ExchangeRateMap = new Map();

    const result = computePortfolioSnapshot(positions, prices, "USD", exchangeRates);

    expect(result.totalValue.toString()).toBe("0");
    expect(result.breakdown).toEqual({});
  });
});
