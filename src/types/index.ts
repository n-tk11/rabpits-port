export enum AssetType {
  STOCK_ETF = "STOCK_ETF",
  CRYPTO = "CRYPTO",
  CASH = "CASH",
  BOND = "BOND",
  COMMODITY = "COMMODITY",
  MUTUAL_FUND = "MUTUAL_FUND",
}

export enum TransactionType {
  BUY = "BUY",
  SELL = "SELL",
  CONVERT = "CONVERT",
  FEE = "FEE",
  PRICE_ADJUST = "PRICE_ADJUST",
}

export enum PriceSource {
  MANUAL = "MANUAL",
  TRANSACTION = "TRANSACTION",
}

export type ActionResult<T> = { success: true; data: T } | { success: false; error: string };
