import { AssetForm } from "@/components/asset/AssetForm";
import { AssetRow } from "@/components/asset/AssetRow";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function AssetsPage() {
  const assets = await db.asset.findMany({
    select: {
      id: true,
      name: true,
      type: true,
      tickerSymbol: true,
      pricingCurrency: true,
      notes: true,
    },
    orderBy: { name: "asc" },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Assets</h1>
          <p className="text-sm text-muted-foreground">
            Manage the assets available across your portfolios
          </p>
        </div>
        <AssetForm mode="create" />
      </div>

      {assets.length === 0 ? (
        <div className="rounded-lg border border-dashed p-10 text-center">
          <p className="text-muted-foreground">No assets yet. Add one to get started.</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="px-4 py-3 text-left font-medium">Name</th>
                <th className="px-4 py-3 text-left font-medium">Type</th>
                <th className="px-4 py-3 text-left font-medium">Ticker</th>
                <th className="px-4 py-3 text-left font-medium">Currency</th>
                <th className="px-4 py-3 text-left font-medium">Notes</th>
                <th className="px-4 py-3 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {assets.map((asset) => (
                <AssetRow key={asset.id} asset={asset} />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
