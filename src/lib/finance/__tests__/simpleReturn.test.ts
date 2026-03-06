import { Decimal } from "@prisma/client/runtime/client";
import { describe, it, expect } from "vitest";

import { calculateSimpleReturn } from "@/lib/finance/simpleReturn";

describe("calculateSimpleReturn", () => {
  it("calculates a positive return (10%)", () => {
    const result = calculateSimpleReturn(new Decimal("1000"), new Decimal("1100"));
    expect(result.toNumber()).toBeCloseTo(0.1, 4);
  });

  it("calculates a negative return (-20%)", () => {
    const result = calculateSimpleReturn(new Decimal("1000"), new Decimal("800"));
    expect(result.toNumber()).toBeCloseTo(-0.2, 4);
  });

  it("returns zero for a flat return", () => {
    const result = calculateSimpleReturn(new Decimal("1000"), new Decimal("1000"));
    expect(result.toNumber()).toBe(0);
  });

  it("returns zero when startValue is zero (no division by zero)", () => {
    const result = calculateSimpleReturn(new Decimal("0"), new Decimal("500"));
    expect(result.toNumber()).toBe(0);
  });
});
