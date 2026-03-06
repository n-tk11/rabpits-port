"use client";

import { useTransition, useState } from "react";

import type { AssetPriceRow } from "@/app/assets/prices/page";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { updatePrices } from "@/lib/actions/assets";

type UpdatePricesFormProps = {
  rows: AssetPriceRow[];
  defaultDate: string;
};

export function UpdatePricesForm({ rows, defaultDate }: UpdatePricesFormProps) {
  const [prices, setPrices] = useState<Map<string, string>>(
    () => new Map(rows.map((r) => [r.assetId, ""]))
  );
  const [priceDate, setPriceDate] = useState<string>(defaultDate);
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  function handleChange(assetId: string, value: string) {
    setPrices((prev) => new Map(prev).set(assetId, value));
  }

  function handleSubmit() {
    setMessage(null);

    if (!priceDate) {
      setMessage({ type: "error", text: "Please select a date for the prices." });
      return;
    }

    const recordedAt = new Date(priceDate + "T00:00:00.000Z").toISOString();

    const updates = rows
      .filter((r) => {
        const val = prices.get(r.assetId) ?? "";
        return val.trim() !== "";
      })
      .map((r) => ({
        assetId: r.assetId,
        price: prices.get(r.assetId)!,
        currency: r.currency,
        recordedAt,
      }));

    if (updates.length === 0) {
      setMessage({ type: "error", text: "Enter at least one price before saving." });
      return;
    }

    startTransition(async () => {
      const result = await updatePrices(updates);
      if (result.success) {
        setMessage({ type: "success", text: `Saved ${updates.length} price(s) for ${priceDate}.` });
        setPrices(new Map(rows.map((r) => [r.assetId, ""])));
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

      <div className="flex items-center gap-3">
        <label htmlFor="priceDate" className="whitespace-nowrap text-sm font-medium">
          Price date
        </label>
        <Input
          id="priceDate"
          type="date"
          value={priceDate}
          onChange={(e) => setPriceDate(e.target.value)}
          className="w-44"
          disabled={isPending}
        />
        <p className="text-xs text-muted-foreground">
          All prices will be recorded on this date. Use today&apos;s date for current market prices.
        </p>
      </div>

      <div className="overflow-hidden rounded-lg border">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr>
              <th className="px-4 py-3 text-left font-medium">Asset</th>
              <th className="px-4 py-3 text-left font-medium">Ticker</th>
              <th className="px-4 py-3 text-left font-medium">Type</th>
              <th className="px-4 py-3 text-left font-medium">Currency</th>
              <th className="px-4 py-3 text-left font-medium">Latest Price</th>
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
                  {row.lastUpdated ? (
                    new Date(row.lastUpdated).toLocaleDateString()
                  ) : (
                    <span>—</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  <Input
                    type="number"
                    step="any"
                    min="0"
                    placeholder={row.currentPrice || "0.00"}
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
