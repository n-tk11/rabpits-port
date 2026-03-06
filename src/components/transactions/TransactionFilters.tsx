"use client";

import { TransactionType } from "@prisma/client";

const TRANSACTION_TYPE_LABELS: Record<TransactionType, string> = {
  BUY: "Buy",
  SELL: "Sell",
  CONVERT: "Convert",
  FEE: "Fee",
  PRICE_ADJUST: "Price Adjust",
};

type TransactionFiltersProps = {
  portfolios: { id: string; name: string }[];
  assets: { id: string; name: string; tickerSymbol: string }[];
  currentFilters: {
    portfolioId?: string;
    assetId?: string;
    type?: string;
    dateFrom?: string;
    dateTo?: string;
  };
};

export function TransactionFilters({
  portfolios,
  assets,
  currentFilters,
}: TransactionFiltersProps) {
  return (
    <form method="get" action="/transactions" className="flex flex-wrap items-end gap-3">
      <div className="flex flex-col gap-1">
        <label htmlFor="portfolioId" className="text-xs font-medium text-muted-foreground">
          Portfolio
        </label>
        <select
          id="portfolioId"
          name="portfolioId"
          defaultValue={currentFilters.portfolioId ?? ""}
          className="h-9 rounded-md border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        >
          <option value="">All portfolios</option>
          {portfolios.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="assetId" className="text-xs font-medium text-muted-foreground">
          Asset
        </label>
        <select
          id="assetId"
          name="assetId"
          defaultValue={currentFilters.assetId ?? ""}
          className="h-9 rounded-md border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        >
          <option value="">All assets</option>
          {assets.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name} ({a.tickerSymbol})
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="type" className="text-xs font-medium text-muted-foreground">
          Type
        </label>
        <select
          id="type"
          name="type"
          defaultValue={currentFilters.type ?? ""}
          className="h-9 rounded-md border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        >
          <option value="">All types</option>
          {Object.entries(TRANSACTION_TYPE_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="dateFrom" className="text-xs font-medium text-muted-foreground">
          Date From
        </label>
        <input
          id="dateFrom"
          name="dateFrom"
          type="date"
          defaultValue={currentFilters.dateFrom ?? ""}
          className="h-9 rounded-md border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        />
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="dateTo" className="text-xs font-medium text-muted-foreground">
          Date To
        </label>
        <input
          id="dateTo"
          name="dateTo"
          type="date"
          defaultValue={currentFilters.dateTo ?? ""}
          className="h-9 rounded-md border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        />
      </div>

      <button
        type="submit"
        className="h-9 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90"
      >
        Apply
      </button>
    </form>
  );
}
