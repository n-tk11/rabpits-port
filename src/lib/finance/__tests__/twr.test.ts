import { Decimal } from "@prisma/client/runtime/client";
import { describe, expect, it } from "vitest";

import { calculateTWR } from "@/lib/finance/twr";

const d = (v: string | number) => new Decimal(v);

describe("calculateTWR", () => {
  // Case 1 — No cash flows, simple growth
  it("single sub-period 10% growth", () => {
    const result = calculateTWR(
      [
        { date: new Date("2024-01-01"), value: d(1000) },
        { date: new Date("2024-12-31"), value: d(1100) },
      ],
      []
    );
    expect(result.equals(d("0.10"))).toBe(true);
  });

  // Case 2 — Two periods: +10% then -5% => 4.5%
  it("two sub-periods compounded", () => {
    const result = calculateTWR(
      [
        { date: new Date("2024-01-01"), value: d(1000) },
        { date: new Date("2024-07-01"), value: d(1100) },
        { date: new Date("2024-12-31"), value: d(1045) },
      ],
      []
    );
    // (1.10)(0.95) - 1 = 0.045
    expect(result.equals(d("0.045"))).toBe(true);
  });

  // Case 3 — Single snapshot, no period
  it("single snapshot returns 0", () => {
    const result = calculateTWR([{ date: new Date("2024-01-01"), value: d(1000) }], []);
    expect(result.equals(d(0))).toBe(true);
  });

  // Case 4 — Flat portfolio
  it("flat portfolio returns 0", () => {
    const result = calculateTWR(
      [
        { date: new Date("2024-01-01"), value: d(1000) },
        { date: new Date("2024-12-31"), value: d(1000) },
      ],
      []
    );
    expect(result.equals(d(0))).toBe(true);
  });

  // Case 5 — Negative return
  it("negative return -20%", () => {
    const result = calculateTWR(
      [
        { date: new Date("2024-01-01"), value: d(1000) },
        { date: new Date("2024-12-31"), value: d(800) },
      ],
      []
    );
    expect(result.equals(d("-0.20"))).toBe(true);
  });

  // Case 6 — Empty snapshots
  it("empty snapshots returns 0", () => {
    const result = calculateTWR([], []);
    expect(result.equals(d(0))).toBe(true);
  });

  // Branch coverage: unsorted snapshots should still produce correct result
  it("unsorted snapshots are sorted chronologically", () => {
    const result = calculateTWR(
      [
        { date: new Date("2024-12-31"), value: d(1100) },
        { date: new Date("2024-01-01"), value: d(1000) },
      ],
      []
    );
    expect(result.equals(d("0.10"))).toBe(true);
  });

  // cashFlows param is accepted (unused in snapshot-based TWR)
  it("accepts cash flows without changing result", () => {
    const result = calculateTWR(
      [
        { date: new Date("2024-01-01"), value: d(1000) },
        { date: new Date("2024-12-31"), value: d(1100) },
      ],
      [{ date: new Date("2024-06-01"), amount: d(500) }]
    );
    expect(result.equals(d("0.10"))).toBe(true);
  });
});
