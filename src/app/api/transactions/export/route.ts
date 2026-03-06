import { TransactionType } from "@prisma/client";
import { NextRequest } from "next/server";

import { db } from "@/lib/db";

export async function GET(request: NextRequest): Promise<Response> {
  const params = request.nextUrl.searchParams;
  const portfolioId = params.get("portfolioId") ?? undefined;
  const assetId = params.get("assetId") ?? undefined;
  const type = params.get("type") ?? undefined;
  const from = params.get("from") ?? undefined;
  const to = params.get("to") ?? undefined;

  const where = {
    ...(portfolioId ? { portfolioId } : {}),
    ...(assetId ? { assetId } : {}),
    ...(type ? { type: type as TransactionType } : {}),
    ...(from || to
      ? {
          date: {
            ...(from ? { gte: new Date(from) } : {}),
            ...(to ? { lte: new Date(`${to}T23:59:59.999Z`) } : {}),
          },
        }
      : {}),
  };

  const transactions = await db.transaction.findMany({
    where,
    include: { portfolio: true, asset: true },
    orderBy: { date: "desc" },
  });

  const headers = "Date,Portfolio,Asset,Ticker,Type,Quantity,Unit Price,Fee,Total Value,Notes";

  const rows = transactions.map((tx) => {
    const date = tx.date.toISOString().slice(0, 10);
    const total = tx.quantity.mul(tx.unitPrice).toFixed(2);
    const notes = tx.notes
      ? tx.notes.includes(",")
        ? `"${tx.notes.replace(/"/g, '""')}"`
        : tx.notes
      : "";
    return [
      date,
      tx.portfolio.name,
      tx.asset.name,
      tx.asset.tickerSymbol,
      tx.type,
      tx.quantity.toString(),
      tx.unitPrice.toString(),
      tx.fee.toString(),
      total,
      notes,
    ].join(",");
  });

  const csv = [headers, ...rows].join("\n");
  const filename = `transactions-${new Date().toISOString().split("T")[0]}.csv`;

  return new Response(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
