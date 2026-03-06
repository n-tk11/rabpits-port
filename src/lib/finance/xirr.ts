import { Decimal } from "@prisma/client/runtime/client";

export type CashFlow = { date: Date; amount: Decimal };

export class XirrConvergenceError extends Error {
  constructor() {
    super("XIRR did not converge within the maximum number of iterations");
    this.name = "XirrConvergenceError";
  }
}

export function calculateXIRR(cashFlows: CashFlow[]): Decimal {
  if (cashFlows.length < 2) {
    throw new XirrConvergenceError();
  }

  const hasPositive = cashFlows.some((cf) => cf.amount.greaterThan(0));
  if (!hasPositive) {
    throw new XirrConvergenceError();
  }

  const sorted = [...cashFlows].sort((a, b) => a.date.getTime() - b.date.getTime());
  const t0 = sorted[0].date.getTime();
  const MS_PER_DAY = 86_400_000;

  const flows = sorted.map((cf) => ({
    t: (cf.date.getTime() - t0) / MS_PER_DAY,
    cf: cf.amount.toNumber(),
  }));

  let r = 0.1;
  const MAX_ITER = 100;
  const TOLERANCE = 1e-7;

  for (let i = 0; i < MAX_ITER; i++) {
    let f = 0;
    let df = 0;

    for (const { t, cf } of flows) {
      const exp = t / 365;
      const denom = Math.pow(1 + r, exp);
      f += cf / denom;
      df -= (cf * exp) / (denom * (1 + r));
    }

    if (Math.abs(f) < TOLERANCE) {
      return new Decimal(r);
    }

    if (df === 0) {
      throw new XirrConvergenceError();
    }

    r = r - f / df;
  }

  throw new XirrConvergenceError();
}
