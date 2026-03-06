import { Decimal } from "@prisma/client/runtime/client";
import { describe, expect, it } from "vitest";

import { applyFIFOSell, InsufficientQuantityError } from "@/lib/finance/fifo";
import type { Lot } from "@/lib/finance/fifo";

const d = (v: string | number) => new Decimal(v);

describe("applyFIFOSell", () => {
  // Case 1 — Simple sell, no gain
  it("simple sell with no gain", () => {
    const lots: Lot[] = [{ quantity: d(10), unitPrice: d(100), date: new Date("2024-01-01") }];
    const result = applyFIFOSell(lots, d(3), d(100));

    expect(result.costBasisSold.equals(d(300))).toBe(true);
    expect(result.realizedGain.equals(d(0))).toBe(true);
    expect(result.remainingLots).toHaveLength(1);
    expect(result.remainingLots[0].quantity.equals(d(7))).toBe(true);
    expect(result.remainingLots[0].unitPrice.equals(d(100))).toBe(true);
  });

  // Case 2 — Simple sell with gain
  it("simple sell with gain", () => {
    const lots: Lot[] = [{ quantity: d(10), unitPrice: d(100), date: new Date("2024-01-01") }];
    const result = applyFIFOSell(lots, d(5), d(150));

    expect(result.costBasisSold.equals(d(500))).toBe(true);
    expect(result.realizedGain.equals(d(250))).toBe(true);
    expect(result.remainingLots).toHaveLength(1);
    expect(result.remainingLots[0].quantity.equals(d(5))).toBe(true);
  });

  // Case 3 — FIFO across multiple lots
  it("FIFO across multiple lots depletes oldest first", () => {
    const lots: Lot[] = [
      { quantity: d(5), unitPrice: d(100), date: new Date("2024-01-01") },
      { quantity: d(5), unitPrice: d(200), date: new Date("2024-02-01") },
    ];
    const result = applyFIFOSell(lots, d(8), d(250));

    expect(result.costBasisSold.equals(d(1100))).toBe(true); // (5×100) + (3×200)
    expect(result.realizedGain.equals(d(900))).toBe(true); // (8×250) - 1100
    expect(result.remainingLots).toHaveLength(1);
    expect(result.remainingLots[0].quantity.equals(d(2))).toBe(true);
    expect(result.remainingLots[0].unitPrice.equals(d(200))).toBe(true);
  });

  // Case 4 — Sell exact total quantity (close position)
  it("sells exact total quantity and closes position", () => {
    const lots: Lot[] = [
      { quantity: d(3), unitPrice: d(100), date: new Date("2024-01-01") },
      { quantity: d(3), unitPrice: d(150), date: new Date("2024-02-01") },
    ];
    const result = applyFIFOSell(lots, d(6), d(200));

    expect(result.costBasisSold.equals(d(750))).toBe(true); // (3×100) + (3×150)
    expect(result.realizedGain.equals(d(450))).toBe(true); // (6×200) - 750
    expect(result.remainingLots).toHaveLength(0);
  });

  // Case 5 — Sell more than available
  it("throws InsufficientQuantityError when selling more than available", () => {
    const lots: Lot[] = [{ quantity: d(5), unitPrice: d(100), date: new Date("2024-01-01") }];
    expect(() => applyFIFOSell(lots, d(10), d(150))).toThrow(InsufficientQuantityError);
  });

  // Case 6 — Fractional quantities (crypto precision)
  it("handles fractional crypto quantities with full Decimal precision", () => {
    const lots: Lot[] = [
      { quantity: d("1.00000000"), unitPrice: d("50000.00"), date: new Date("2024-01-01") },
    ];
    const result = applyFIFOSell(lots, d("0.00000001"), d("60000.00"));

    expect(result.costBasisSold.equals(d("0.00050000"))).toBe(true);
    expect(result.realizedGain.equals(d("0.00010000"))).toBe(true);
    expect(result.remainingLots[0].quantity.equals(d("0.99999999"))).toBe(true);
  });

  // Case 7 — Sell from many lots (20 lots, sell 15)
  it("correctly depletes 15 of 20 lots in FIFO order", () => {
    const lots: Lot[] = Array.from({ length: 20 }, (_, i) => ({
      quantity: d(1),
      unitPrice: d(i + 1), // prices $1 through $20
      date: new Date(`2024-01-${String(i + 1).padStart(2, "0")}`),
    }));
    const result = applyFIFOSell(lots, d(15), d(25));

    // costBasisSold = 1+2+...+15 = 120
    expect(result.costBasisSold.equals(d(120))).toBe(true);
    // realizedGain = (15×25) - 120 = 375 - 120 = 255
    expect(result.realizedGain.equals(d(255))).toBe(true);
    // remainingLots = lots with prices $16–$20
    expect(result.remainingLots).toHaveLength(5);
    expect(result.remainingLots[0].unitPrice.equals(d(16))).toBe(true);
    expect(result.remainingLots[4].unitPrice.equals(d(20))).toBe(true);
  });

  // Case 8 — Empty lots
  it("throws InsufficientQuantityError when no lots exist", () => {
    expect(() => applyFIFOSell([], d(1), d(100))).toThrow(InsufficientQuantityError);
  });
});
