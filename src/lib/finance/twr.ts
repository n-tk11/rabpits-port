import { Decimal } from "@prisma/client/runtime/client";

export function calculateTWR(
  snapshots: { date: Date; value: Decimal }[],
  cashFlows: { date: Date; amount: Decimal }[]
): Decimal {
  if (snapshots.length < 2) {
    return new Decimal(0);
  }

  const sorted = [...snapshots].sort((a, b) => a.date.getTime() - b.date.getTime());

  let twr = new Decimal(1);
  for (let i = 0; i < sorted.length - 1; i++) {
    const vStart = sorted[i].value;
    const vEnd = sorted[i + 1].value;
    // r_i = (V_end - V_start) / V_start
    const r = vEnd.minus(vStart).dividedBy(vStart);
    twr = twr.times(new Decimal(1).plus(r));
  }

  // Suppress unused parameter warning — cashFlows reserved for future Modified Dietz
  void cashFlows;

  return twr.minus(1);
}
