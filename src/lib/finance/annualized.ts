import { Decimal } from "@prisma/client/runtime/client";

export class DivisionByZeroError extends Error {
  constructor(message: string = "Cannot annualize return over zero years") {
    super(message);
    this.name = "DivisionByZeroError";
  }
}

export function annualizeReturn(totalReturn: Decimal, years: Decimal): Decimal {
  if (years.lessThanOrEqualTo(0)) {
    throw new DivisionByZeroError();
  }
  const base = totalReturn.toNumber() + 1;
  const exponent = 1 / years.toNumber();
  return new Decimal(Math.pow(base, exponent) - 1);
}
