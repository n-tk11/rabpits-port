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
  const assets = await db.asset.findMany({
    orderBy: [{ type: "asc" }, { name: "asc" }],
    include: {
      prices: {
        orderBy: { recordedAt: "desc" },
        take: 1,
      },
    },
  });

  const rows: AssetPriceRow[] = assets.map((asset) => ({
    assetId: asset.id,
    name: asset.name,
    ticker: asset.tickerSymbol,
    type: asset.type,
    currentPrice: asset.prices[0]?.price.toString() ?? "",
    currency: asset.pricingCurrency,
    lastUpdated: asset.prices[0]?.recordedAt ?? null,
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Update Prices</h1>
        <p className="text-sm text-muted-foreground">
          Enter the current market price for each asset
        </p>
      </div>
      <UpdatePricesForm rows={rows} />
    </div>
  );
}
