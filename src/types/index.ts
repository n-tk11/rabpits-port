// Re-export Prisma-generated enums so app code uses a single source of truth
export { AssetType, PriceSource, TransactionType } from "@prisma/client";

export type ActionResult<T> = { success: true; data: T } | { success: false; error: string };
