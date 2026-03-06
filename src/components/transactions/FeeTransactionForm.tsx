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
import { createFeeTransaction } from "@/lib/actions/fee-transaction";

type Asset = {
  id: string;
  name: string;
  tickerSymbol: string;
  pricingCurrency: string;
};

type FeeTransactionFormProps = {
  portfolioId: string;
  assets: Asset[];
  portfolioBaseCurrency: string;
};

export function FeeTransactionForm({
  portfolioId,
  assets,
  portfolioBaseCurrency,
}: FeeTransactionFormProps) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedAssetId, setSelectedAssetId] = useState<string>(assets[0]?.id ?? "");
  const [isPending, startTransition] = useTransition();

  const selectedAsset = assets.find((a) => a.id === selectedAssetId);
  const needsFx = selectedAsset ? selectedAsset.pricingCurrency !== portfolioBaseCurrency : false;

  function handleOpenChange(nextOpen: boolean) {
    setOpen(nextOpen);
    if (!nextOpen) setError(null);
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const formData = new FormData(e.currentTarget);

    const input = {
      portfolioId,
      assetId: selectedAssetId,
      date: formData.get("date") as string,
      amount: formData.get("amount") as string,
      notes: (formData.get("notes") as string) || undefined,
      fxRate: (formData.get("fxRate") as string) || undefined,
    };

    startTransition(async () => {
      const result = await createFeeTransaction(input);
      if (!result.success) {
        setError(result.error);
        return;
      }
      setOpen(false);
    });
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          Fee
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Record Fee</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label>Asset</Label>
            <Select value={selectedAssetId} onValueChange={setSelectedAssetId}>
              <SelectTrigger>
                <SelectValue placeholder="Select an asset" />
              </SelectTrigger>
              <SelectContent>
                {assets.map((asset) => (
                  <SelectItem key={asset.id} value={asset.id}>
                    {asset.tickerSymbol} — {asset.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="date">Date</Label>
            <Input id="date" name="date" type="date" required />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="amount">
              Amount{selectedAsset ? ` (${selectedAsset.pricingCurrency})` : ""}
            </Label>
            <Input
              id="amount"
              name="amount"
              type="number"
              step="any"
              min="0"
              placeholder="e.g. 25.00"
              required
            />
          </div>

          {needsFx && selectedAsset && (
            <div className="space-y-1.5">
              <Label htmlFor="fxRate">
                Exchange Rate — 1 {selectedAsset.pricingCurrency} ={" "}
                <span className="font-medium">? {portfolioBaseCurrency}</span>
              </Label>
              <Input
                id="fxRate"
                name="fxRate"
                type="number"
                step="any"
                min="0"
                placeholder="e.g. 0.028"
                required
              />
            </div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="notes">Notes (optional)</Label>
            <Textarea id="notes" name="notes" placeholder="e.g. Annual custody fee" rows={2} />
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <DialogFooter>
            <Button type="submit" disabled={isPending || assets.length === 0}>
              {isPending ? "Saving…" : "Add"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
