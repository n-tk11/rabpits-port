"use client";

import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { createAsset, updateAsset } from "@/lib/actions/assets";
import { AssetType } from "@/types";

const ASSET_TYPE_OPTIONS: { value: AssetType; label: string }[] = [
  { value: AssetType.STOCK_ETF, label: "Stock / ETF" },
  { value: AssetType.CRYPTO, label: "Cryptocurrency" },
  { value: AssetType.CASH, label: "Cash / Fiat" },
  { value: AssetType.BOND, label: "Bond / Fixed Income" },
  { value: AssetType.COMMODITY, label: "Commodity" },
  { value: AssetType.MUTUAL_FUND, label: "Mutual Fund" },
];

type Asset = {
  id: string;
  name: string;
  type: AssetType;
  tickerSymbol: string;
  pricingCurrency: string;
  notes: string | null;
};

type AssetFormProps = { mode: "create" } | { mode: "edit"; asset: Asset };

export function AssetForm(props: AssetFormProps) {
  const isEdit = props.mode === "edit";
  const asset = isEdit ? props.asset : null;

  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedType, setSelectedType] = useState<AssetType>(asset?.type ?? AssetType.STOCK_ETF);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(formData: FormData) {
    setError(null);
    const input = {
      name: formData.get("name") as string,
      type: selectedType,
      tickerSymbol: formData.get("tickerSymbol") as string,
      pricingCurrency: formData.get("pricingCurrency") as string,
      notes: (formData.get("notes") as string) || undefined,
    };

    startTransition(async () => {
      const result = isEdit ? await updateAsset(asset!.id, input) : await createAsset(input);
      if (!result.success) {
        setError(result.error);
        return;
      }
      setOpen(false);
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {isEdit ? (
          <Button variant="outline" size="sm">
            Edit
          </Button>
        ) : (
          <Button size="sm">Add Asset</Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Asset" : "Add Asset"}</DialogTitle>
        </DialogHeader>
        <form action={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              name="name"
              defaultValue={asset?.name ?? ""}
              placeholder="e.g. Apple Inc."
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label>Type</Label>
            <Select value={selectedType} onValueChange={(v) => setSelectedType(v as AssetType)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ASSET_TYPE_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="tickerSymbol">Ticker / Symbol</Label>
              <Input
                id="tickerSymbol"
                name="tickerSymbol"
                defaultValue={asset?.tickerSymbol ?? ""}
                placeholder="e.g. AAPL"
                className="uppercase"
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="pricingCurrency">Pricing Currency</Label>
              <Input
                id="pricingCurrency"
                name="pricingCurrency"
                defaultValue={asset?.pricingCurrency ?? ""}
                placeholder="e.g. USD"
                maxLength={3}
                className="uppercase"
                required
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="notes">Notes (optional)</Label>
            <Textarea
              id="notes"
              name="notes"
              defaultValue={asset?.notes ?? ""}
              placeholder="Any additional notes"
              rows={2}
            />
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <DialogFooter>
            <Button type="submit" disabled={isPending}>
              {isPending ? "Saving…" : isEdit ? "Save changes" : "Add Asset"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
