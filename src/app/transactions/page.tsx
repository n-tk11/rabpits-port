import { TransactionType } from "@prisma/client";

import { TransactionFilters } from "@/components/transactions/TransactionFilters";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 25;

const TRANSACTION_TYPE_LABELS: Record<TransactionType, string> = {
  BUY: "Buy",
  SELL: "Sell",
  CONVERT: "Convert",
  FEE: "Fee",
  PRICE_ADJUST: "Price Adjust",
};

type SearchParams = {
  portfolioId?: string;
  assetId?: string;
  type?: string;
  dateFrom?: string;
  dateTo?: string;
  page?: string;
};

export default async function TransactionsPage({ searchParams }: { searchParams: SearchParams }) {
  const portfolioId = searchParams.portfolioId || undefined;
  const assetId = searchParams.assetId || undefined;
  const type = searchParams.type || undefined;
  const dateFrom = searchParams.dateFrom || undefined;
  const dateTo = searchParams.dateTo || undefined;
  const page = Math.max(1, parseInt(searchParams.page ?? "1", 10) || 1);
  const skip = (page - 1) * PAGE_SIZE;

  const where = {
    ...(portfolioId ? { portfolioId } : {}),
    ...(assetId ? { assetId } : {}),
    ...(type ? { type: type as TransactionType } : {}),
    ...(dateFrom || dateTo
      ? {
          date: {
            ...(dateFrom ? { gte: new Date(dateFrom) } : {}),
            ...(dateTo ? { lte: new Date(`${dateTo}T23:59:59.999Z`) } : {}),
          },
        }
      : {}),
  };

  const [transactions, total, portfolios, assets] = await Promise.all([
    db.transaction.findMany({
      where,
      select: {
        id: true,
        date: true,
        type: true,
        quantity: true,
        unitPrice: true,
        fee: true,
        notes: true,
        portfolio: { select: { name: true } },
        asset: { select: { name: true, tickerSymbol: true } },
      },
      orderBy: [{ date: "desc" }, { createdAt: "desc" }],
      skip,
      take: PAGE_SIZE,
    }),
    db.transaction.count({ where }),
    db.portfolio.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } }),
    db.asset.findMany({
      select: { id: true, name: true, tickerSymbol: true },
      orderBy: { name: "asc" },
    }),
  ]);

  const totalPages = Math.ceil(total / PAGE_SIZE);
  const from = total === 0 ? 0 : skip + 1;
  const to = Math.min(skip + PAGE_SIZE, total);

  const currentFilters = {
    portfolioId: searchParams.portfolioId,
    assetId: searchParams.assetId,
    type: searchParams.type,
    dateFrom: searchParams.dateFrom,
    dateTo: searchParams.dateTo,
  };

  function buildPageUrl(targetPage: number): string {
    const params = new URLSearchParams();
    if (portfolioId) params.set("portfolioId", portfolioId);
    if (assetId) params.set("assetId", assetId);
    if (type) params.set("type", type);
    if (dateFrom) params.set("dateFrom", dateFrom);
    if (dateTo) params.set("dateTo", dateTo);
    params.set("page", String(targetPage));
    return `/transactions?${params.toString()}`;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Transaction History</h1>
        <p className="text-sm text-muted-foreground">All transactions across your portfolios</p>
      </div>

      <TransactionFilters portfolios={portfolios} assets={assets} currentFilters={currentFilters} />

      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {total === 0
            ? "No transactions found"
            : `Showing ${from}–${to} of ${total} transaction${total !== 1 ? "s" : ""}`}
        </p>
      </div>

      {transactions.length === 0 ? (
        <div className="rounded-lg border border-dashed p-10 text-center">
          <p className="text-muted-foreground">No transactions match the current filters.</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="px-4 py-3 text-left font-medium">Date</th>
                <th className="px-4 py-3 text-left font-medium">Portfolio</th>
                <th className="px-4 py-3 text-left font-medium">Asset</th>
                <th className="px-4 py-3 text-left font-medium">Type</th>
                <th className="px-4 py-3 text-right font-medium">Qty</th>
                <th className="px-4 py-3 text-right font-medium">Unit Price</th>
                <th className="px-4 py-3 text-right font-medium">Fee</th>
                <th className="px-4 py-3 text-left font-medium">Notes</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {transactions.map((tx) => (
                <tr key={tx.id} className="hover:bg-muted/30">
                  <td className="px-4 py-3 font-mono text-xs">
                    {tx.date.toISOString().slice(0, 10)}
                  </td>
                  <td className="px-4 py-3">{tx.portfolio.name}</td>
                  <td className="px-4 py-3">
                    <span className="font-medium">{tx.asset.tickerSymbol}</span>
                    <span className="ml-1 text-xs text-muted-foreground">{tx.asset.name}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium">
                      {TRANSACTION_TYPE_LABELS[tx.type] ?? tx.type}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-xs">
                    {tx.quantity.toString()}
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-xs">
                    {tx.unitPrice.toString()}
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-xs">{tx.fee.toString()}</td>
                  <td className="max-w-xs truncate px-4 py-3 text-muted-foreground">
                    {tx.notes ?? "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <a
            href={page > 1 ? buildPageUrl(page - 1) : undefined}
            className={
              page > 1
                ? "rounded-md border px-4 py-2 text-sm hover:bg-muted"
                : "cursor-not-allowed rounded-md border px-4 py-2 text-sm opacity-40"
            }
            aria-disabled={page <= 1}
          >
            ← Previous
          </a>
          <span className="text-sm text-muted-foreground">
            Page {page} of {totalPages}
          </span>
          <a
            href={page < totalPages ? buildPageUrl(page + 1) : undefined}
            className={
              page < totalPages
                ? "rounded-md border px-4 py-2 text-sm hover:bg-muted"
                : "cursor-not-allowed rounded-md border px-4 py-2 text-sm opacity-40"
            }
            aria-disabled={page >= totalPages}
          >
            Next →
          </a>
        </div>
      )}
    </div>
  );
}
