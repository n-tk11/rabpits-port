import { Decimal } from "@prisma/client/runtime/client";

export function calculateSimpleReturn(startValue: Decimal, endValue: Decimal): Decimal {
  if (startValue.equals(0)) {
    return new Decimal(0);
  }
  return endValue.minus(startValue).div(startValue);
}
