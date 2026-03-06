import { AssetForm } from "@/components/asset/AssetForm";
import { Badge } from "@/components/ui/badge";
import { AssetType } from "@/types";

const ASSET_TYPE_LABELS: Record<AssetType, string> = {
  [AssetType.STOCK_ETF]: "Stock/ETF",
  [AssetType.CRYPTO]: "Crypto",
  [AssetType.CASH]: "Cash",
  [AssetType.BOND]: "Bond",
  [AssetType.COMMODITY]: "Commodity",
  [AssetType.MUTUAL_FUND]: "Mutual Fund",
};

type AssetRowProps = {
  asset: {
    id: string;
    name: string;
    type: AssetType;
    tickerSymbol: string;
    pricingCurrency: string;
    notes: string | null;
  };
};

export function AssetRow({ asset }: AssetRowProps) {
  return (
    <tr className="hover:bg-muted/30">
      <td className="px-4 py-3 font-medium">{asset.name}</td>
      <td className="px-4 py-3">
        <Badge variant="secondary">{ASSET_TYPE_LABELS[asset.type] ?? asset.type}</Badge>
      </td>
      <td className="px-4 py-3 font-mono text-xs">{asset.tickerSymbol}</td>
      <td className="px-4 py-3 font-mono text-xs">{asset.pricingCurrency}</td>
      <td className="max-w-xs truncate px-4 py-3 text-muted-foreground">{asset.notes ?? "—"}</td>
      <td className="px-4 py-3 text-right">
        <AssetForm mode="edit" asset={asset} />
      </td>
    </tr>
  );
}
