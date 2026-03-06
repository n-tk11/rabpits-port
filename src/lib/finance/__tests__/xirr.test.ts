import { Decimal } from "@prisma/client/runtime/client";
import { describe, expect, it } from "vitest";

import { calculateXIRR, XirrConvergenceError } from "@/lib/finance/xirr";
import type { CashFlow } from "@/lib/finance/xirr";

const d = (v: string | number) => new Decimal(v);

describe("calculateXIRR", () => {
  // Case 1 — Simple 1-year, 10% return
  // 2020 is a leap year (366 days), so XIRR = 1.1^(365/366) - 1 ≈ 9.971%
  it("computes ~10% for a simple 1-year investment", () => {
    const cashFlows: CashFlow[] = [
      { date: new Date("2020-01-01"), amount: d("-1000") },
      { date: new Date("2021-01-01"), amount: d("1100") },
    ];
    const result = calculateXIRR(cashFlows);
    expect(result.greaterThan(d("0.0994"))).toBe(true);
    expect(result.lessThan(d("0.1001"))).toBe(true);
  });

  // Case 2 — Two investments with a mid-year top-up
  // 2020-07-01 is 182 days in (leap year), 2021-01-01 is 366 days in.
  // Actual XIRR ≈ 8.00% (investing 15 000, receiving 16 000).
  it("converges for a two-investment scenario (~8.00%)", () => {
    const cashFlows: CashFlow[] = [
      { date: new Date("2020-01-01"), amount: d("-10000") },
      { date: new Date("2020-07-01"), amount: d("-5000") },
      { date: new Date("2021-01-01"), amount: d("16000") },
    ];
    const result = calculateXIRR(cashFlows);
    expect(result.greaterThan(d("0.0798"))).toBe(true);
    expect(result.lessThan(d("0.0802"))).toBe(true);
  });

  // Case 3 — Short holding < 1 year (~10.25% annualized)
  it("annualizes correctly for sub-year holding period", () => {
    const cashFlows: CashFlow[] = [
      { date: new Date("2020-01-01"), amount: d("-1000") },
      { date: new Date("2020-07-01"), amount: d("1050") },
    ];
    const result = calculateXIRR(cashFlows);
    expect(result.greaterThan(d("0.1015"))).toBe(true);
    expect(result.lessThan(d("0.1035"))).toBe(true);
  });

  // Case 4 — Loss scenario
  // 2020 is a leap year (366 days), so XIRR = 0.9^(365/366) - 1 ≈ -9.974%
  it("returns negative XIRR for a loss scenario", () => {
    const cashFlows: CashFlow[] = [
      { date: new Date("2020-01-01"), amount: d("-1000") },
      { date: new Date("2021-01-01"), amount: d("900") },
    ];
    const result = calculateXIRR(cashFlows);
    expect(result.greaterThan(d("-0.1001"))).toBe(true);
    expect(result.lessThan(d("-0.0994"))).toBe(true);
  });

  // Case 5 — Multiple buys, single exit (positive return)
  it("returns positive XIRR when total received exceeds total invested", () => {
    const cashFlows: CashFlow[] = [
      { date: new Date("2020-01-01"), amount: d("-1000") },
      { date: new Date("2020-04-01"), amount: d("-1000") },
      { date: new Date("2020-07-01"), amount: d("-1000") },
      { date: new Date("2021-01-01"), amount: d("3600") },
    ];
    const result = calculateXIRR(cashFlows);
    expect(result.greaterThan(d("0"))).toBe(true);
  });

  // Case 6 — No positive cash flow (error)
  it("throws XirrConvergenceError when all cash flows are negative", () => {
    const cashFlows: CashFlow[] = [
      { date: new Date("2020-01-01"), amount: d("-1000") },
      { date: new Date("2020-06-01"), amount: d("-500") },
    ];
    expect(() => calculateXIRR(cashFlows)).toThrow(XirrConvergenceError);
  });

  // Case 7 — Too few cash flows (error)
  it("throws XirrConvergenceError when fewer than 2 cash flows provided", () => {
    const cashFlows: CashFlow[] = [{ date: new Date("2020-01-01"), amount: d("-1000") }];
    expect(() => calculateXIRR(cashFlows)).toThrow(XirrConvergenceError);
  });
});
