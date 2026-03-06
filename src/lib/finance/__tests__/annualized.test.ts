import { Decimal } from "@prisma/client/runtime/client";
import { describe, it, expect } from "vitest";

import { annualizeReturn, DivisionByZeroError } from "@/lib/finance/annualized";

describe("annualizeReturn", () => {
  it("returns totalReturn unchanged when years = 1", () => {
    const result = annualizeReturn(new Decimal("0.10"), new Decimal("1"));
    expect(result.toNumber()).toBeCloseTo(0.1, 4);
  });

  it("annualizes a 2-year return correctly (~10% per year)", () => {
    const result = annualizeReturn(new Decimal("0.21"), new Decimal("2"));
    expect(result.toNumber()).toBeCloseTo(0.1, 4);
  });

  it("annualizes a sub-year return correctly (0.5 years → ~10.25%)", () => {
    const result = annualizeReturn(new Decimal("0.05"), new Decimal("0.5"));
    expect(result.toNumber()).toBeCloseTo(0.1025, 4);
  });

  it("annualizes a negative return correctly (~-10% per year)", () => {
    const result = annualizeReturn(new Decimal("-0.19"), new Decimal("2"));
    expect(result.toNumber()).toBeCloseTo(-0.1, 4);
  });

  it("throws DivisionByZeroError when years = 0", () => {
    expect(() => annualizeReturn(new Decimal("0.10"), new Decimal("0"))).toThrow(
      DivisionByZeroError
    );
  });

  it("throws DivisionByZeroError when years is negative", () => {
    expect(() => annualizeReturn(new Decimal("0.10"), new Decimal("-1"))).toThrow(
      DivisionByZeroError
    );
  });
});
