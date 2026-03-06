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
import { createTransaction } from "@/lib/actions/transactions";
import { TransactionType } from "@/types";

type Asset = {
  id: string;
  name: string;
  tickerSymbol: string;
  pricingCurrency: string;
};

type TransactionFormProps = {
  portfolioId: string;
  assets: Asset[];
  portfolioBaseCurrency: string;
};

type BuySellType = "BUY" | "SELL";

const TRANSACTION_TYPE_OPTIONS: { value: BuySellType; label: string }[] = [
  { value: TransactionType.BUY, label: "Buy" },
  { value: TransactionType.SELL, label: "Sell" },
];

export function TransactionForm({
  portfolioId,
  assets,
  portfolioBaseCurrency,
}: TransactionFormProps) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedAssetId, setSelectedAssetId] = useState<string>(assets[0]?.id ?? "");
  const [selectedType, setSelectedType] = useState<BuySellType>(TransactionType.BUY);
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
      type: selectedType,
      date: formData.get("date") as string,
      quantity: formData.get("quantity") as string,
      unitPrice: formData.get("unitPrice") as string,
      fee: (formData.get("fee") as string) || undefined,
      notes: (formData.get("notes") as string) || undefined,
      fxRate: (formData.get("fxRate") as string) || undefined,
    };

    startTransition(async () => {
      const result = await createTransaction(input);
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
        <Button size="sm">Add Transaction</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Add Transaction</DialogTitle>
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
            <Label>Type</Label>
            <Select value={selectedType} onValueChange={(v) => setSelectedType(v as BuySellType)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TRANSACTION_TYPE_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="date">Date</Label>
            <Input id="date" name="date" type="date" required />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="quantity">Quantity</Label>
              <Input
                id="quantity"
                name="quantity"
                type="number"
                step="any"
                min="0"
                placeholder="e.g. 10"
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="unitPrice">
                Unit Price{selectedAsset ? ` (${selectedAsset.pricingCurrency})` : ""}
              </Label>
              <Input
                id="unitPrice"
                name="unitPrice"
                type="number"
                step="any"
                min="0"
                placeholder="e.g. 150.00"
                required
              />
            </div>
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
                placeholder={`e.g. 0.028`}
                required
              />
            </div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="fee">Fee (optional)</Label>
            <Input id="fee" name="fee" type="number" step="any" min="0" placeholder="e.g. 5.00" />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="notes">Notes (optional)</Label>
            <Textarea id="notes" name="notes" placeholder="Any additional notes" rows={2} />
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
