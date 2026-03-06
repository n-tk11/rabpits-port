"use client";

import { useTransition, useState } from "react";

import type { AssetPriceRow } from "@/app/assets/prices/page";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { updatePrices } from "@/lib/actions/assets";

type UpdatePricesFormProps = {
  rows: AssetPriceRow[];
};

export function UpdatePricesForm({ rows }: UpdatePricesFormProps) {
  const [prices, setPrices] = useState<Map<string, string>>(
    () => new Map(rows.map((r) => [r.assetId, r.currentPrice]))
  );
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  function handleChange(assetId: string, value: string) {
    setPrices((prev) => new Map(prev).set(assetId, value));
  }

  function handleSubmit() {
    setMessage(null);
    const now = new Date().toISOString();

    const updates = rows
      .filter((r) => {
        const val = prices.get(r.assetId) ?? "";
        return val.trim() !== "";
      })
      .map((r) => ({
        assetId: r.assetId,
        price: prices.get(r.assetId)!,
        currency: r.currency,
        recordedAt: now,
      }));

    if (updates.length === 0) {
      setMessage({ type: "error", text: "No prices to save." });
      return;
    }

    startTransition(async () => {
      const result = await updatePrices(updates);
      if (result.success) {
        setMessage({ type: "success", text: "Prices saved successfully." });
      } else {
        setMessage({ type: "error", text: result.error });
      }
    });
  }

  return (
    <div className="space-y-4">
      {message && (
        <div
          className={cn(
            "rounded-md px-4 py-3 text-sm",
            message.type === "success"
              ? "bg-green-50 text-green-800 dark:bg-green-950 dark:text-green-200"
              : "bg-destructive/10 text-destructive"
          )}
        >
          {message.text}
        </div>
      )}

      <div className="overflow-hidden rounded-lg border">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr>
              <th className="px-4 py-3 text-left font-medium">Asset</th>
              <th className="px-4 py-3 text-left font-medium">Ticker</th>
              <th className="px-4 py-3 text-left font-medium">Type</th>
              <th className="px-4 py-3 text-left font-medium">Currency</th>
              <th className="px-4 py-3 text-left font-medium">Current Price</th>
              <th className="px-4 py-3 text-left font-medium">Last Updated</th>
              <th className="px-4 py-3 text-left font-medium">New Price</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {rows.map((row) => (
              <tr key={row.assetId}>
                <td className="px-4 py-3 font-medium">{row.name}</td>
                <td className="px-4 py-3 text-muted-foreground">{row.ticker}</td>
                <td className="px-4 py-3 text-muted-foreground">{row.type}</td>
                <td className="px-4 py-3 text-muted-foreground">{row.currency}</td>
                <td className="px-4 py-3">
                  {row.currentPrice !== "" ? (
                    <span>
                      {row.currentPrice} {row.currency}
                    </span>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </td>
                <td className="px-4 py-3 text-muted-foreground">
                  {row.lastUpdated ? row.lastUpdated.toLocaleDateString() : <span>—</span>}
                </td>
                <td className="px-4 py-3">
                  <Input
                    type="number"
                    step="any"
                    min="0"
                    value={prices.get(row.assetId) ?? ""}
                    onChange={(e) => handleChange(row.assetId, e.target.value)}
                    className="w-36"
                    disabled={isPending}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex justify-end">
        <Button onClick={handleSubmit} disabled={isPending}>
          {isPending ? "Saving…" : "Save All Prices"}
        </Button>
      </div>
    </div>
  );
}

function cn(...classes: (string | false | undefined | null)[]) {
  return classes.filter(Boolean).join(" ");
}
