import { notFound } from "next/navigation";

import { ConvertTransactionForm } from "@/components/transactions/ConvertTransactionForm";
import { FeeTransactionForm } from "@/components/transactions/FeeTransactionForm";
import { TransactionForm } from "@/components/transactions/TransactionForm";
import { Badge } from "@/components/ui/badge";
import { db } from "@/lib/db";
import { TransactionType } from "@/types";

export const dynamic = "force-dynamic";

const TRANSACTION_TYPE_LABELS: Record<TransactionType, string> = {
  [TransactionType.BUY]: "Buy",
  [TransactionType.SELL]: "Sell",
  [TransactionType.CONVERT]: "Convert",
  [TransactionType.FEE]: "Fee",
  [TransactionType.PRICE_ADJUST]: "Price Adjust",
};

const TRANSACTION_TYPE_VARIANTS: Record<
  TransactionType,
  "default" | "secondary" | "destructive" | "outline"
> = {
  [TransactionType.BUY]: "default",
  [TransactionType.SELL]: "destructive",
  [TransactionType.CONVERT]: "secondary",
  [TransactionType.FEE]: "outline",
  [TransactionType.PRICE_ADJUST]: "outline",
};

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function PortfolioDetailPage({ params }: PageProps) {
  const { id } = await params;

  const [portfolio, transactions, assets] = await Promise.all([
    db.portfolio.findUnique({
      where: { id },
      select: { id: true, name: true, baseCurrency: true, description: true },
    }),
    db.transaction.findMany({
      where: { portfolioId: id },
      orderBy: { date: "desc" },
      select: {
        id: true,
        type: true,
        date: true,
        quantity: true,
        unitPrice: true,
        fee: true,
        notes: true,
        asset: { select: { id: true, name: true, tickerSymbol: true } },
      },
    }),
    db.asset.findMany({
      select: { id: true, name: true, tickerSymbol: true, pricingCurrency: true },
      orderBy: { name: "asc" },
    }),
  ]);

  if (!portfolio) notFound();

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight">{portfolio.name}</h1>
            <span className="rounded-full bg-muted px-2 py-0.5 font-mono text-xs text-muted-foreground">
              {portfolio.baseCurrency}
            </span>
          </div>
          {portfolio.description && (
            <p className="mt-1 text-sm text-muted-foreground">{portfolio.description}</p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <TransactionForm portfolioId={id} assets={assets} />
          <ConvertTransactionForm portfolioId={id} assets={assets} />
          <FeeTransactionForm portfolioId={id} assets={assets} />
        </div>
      </div>

      <div>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Transactions
        </h2>

        {transactions.length === 0 ? (
          <div className="rounded-lg border border-dashed p-10 text-center">
            <p className="text-muted-foreground">
              No transactions yet. Add one to start tracking your holdings.
            </p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-lg border">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="px-4 py-3 text-left font-medium">Date</th>
                  <th className="px-4 py-3 text-left font-medium">Asset</th>
                  <th className="px-4 py-3 text-left font-medium">Type</th>
                  <th className="px-4 py-3 text-right font-medium">Quantity</th>
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
                    <td className="px-4 py-3">
                      <span className="font-medium">{tx.asset.tickerSymbol}</span>
                      <span className="ml-1.5 text-xs text-muted-foreground">{tx.asset.name}</span>
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={TRANSACTION_TYPE_VARIANTS[tx.type]}>
                        {TRANSACTION_TYPE_LABELS[tx.type]}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-right font-mono">
                      {Number(tx.quantity).toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-right font-mono">
                      {Number(tx.unitPrice).toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 8,
                      })}
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-muted-foreground">
                      {Number(tx.fee) > 0
                        ? Number(tx.fee).toLocaleString(undefined, {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 8,
                          })
                        : "—"}
                    </td>
                    <td className="max-w-xs truncate px-4 py-3 text-muted-foreground">
                      {tx.notes ?? "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
