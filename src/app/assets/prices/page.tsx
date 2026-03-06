import { UpdatePricesForm } from "@/components/assets/UpdatePricesForm";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export type AssetPriceRow = {
  assetId: string;
  name: string;
  ticker: string;
  type: string;
  currentPrice: string;
  currency: string;
  lastUpdated: Date | null;
};

export default async function UpdatePricesPage() {
  const [assets, latestPriceRecord] = await Promise.all([
    db.asset.findMany({
      orderBy: [{ type: "asc" }, { name: "asc" }],
      include: {
        prices: {
          orderBy: { recordedAt: "desc" },
          take: 1,
        },
      },
    }),
    db.price.findFirst({ orderBy: { recordedAt: "desc" }, select: { recordedAt: true } }),
  ]);

  const rows: AssetPriceRow[] = assets.map((asset) => ({
    assetId: asset.id,
    name: asset.name,
    ticker: asset.tickerSymbol,
    type: asset.type,
    currentPrice: asset.prices[0]?.price.toString() ?? "",
    currency: asset.pricingCurrency,
    lastUpdated: asset.prices[0]?.recordedAt ?? null,
  }));

  // Default the date picker to the day after the latest existing price so
  // newly submitted prices are always the most recent in the DB.
  const latestDate = latestPriceRecord?.recordedAt ?? new Date();
  const defaultDate = new Date(latestDate);
  defaultDate.setUTCDate(defaultDate.getUTCDate() + 1);
  const defaultDateStr = defaultDate.toISOString().slice(0, 10);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Update Prices</h1>
        <p className="text-sm text-muted-foreground">
          Enter the current market price for each asset
        </p>
      </div>
      <UpdatePricesForm rows={rows} defaultDate={defaultDateStr} />
    </div>
  );
}
