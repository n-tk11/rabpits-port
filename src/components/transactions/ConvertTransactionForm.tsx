"use client";

import { useMemo, useState, useTransition } from "react";

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
import { createConvertTransaction } from "@/lib/actions/convert-transaction";

type Asset = {
  id: string;
  name: string;
  tickerSymbol: string;
  pricingCurrency: string;
};

type ConvertTransactionFormProps = {
  portfolioId: string;
  assets: Asset[];
  portfolioBaseCurrency: string;
};

export function ConvertTransactionForm({
  portfolioId,
  assets,
  portfolioBaseCurrency,
}: ConvertTransactionFormProps) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fromAssetId, setFromAssetId] = useState<string>(assets[0]?.id ?? "");
  const [toAssetId, setToAssetId] = useState<string>(assets[1]?.id ?? assets[0]?.id ?? "");
  const [fromQuantity, setFromQuantity] = useState("");
  const [toQuantity, setToQuantity] = useState("");
  const [isPending, startTransition] = useTransition();

  const fromAsset = assets.find((a) => a.id === fromAssetId);
  const toAsset = assets.find((a) => a.id === toAssetId);
  const fromTicker = fromAsset?.tickerSymbol ?? "";
  const toTicker = toAsset?.tickerSymbol ?? "";

  const fromNeedsFx = fromAsset ? fromAsset.pricingCurrency !== portfolioBaseCurrency : false;
  const toNeedsFx =
    toAsset && toAsset.pricingCurrency !== portfolioBaseCurrency
      ? toAsset.pricingCurrency !== (fromAsset?.pricingCurrency ?? "")
      : false;

  const impliedRate = useMemo(() => {
    const from = parseFloat(fromQuantity);
    const to = parseFloat(toQuantity);
    if (!from || !to || from <= 0 || to <= 0) return null;
    return (to / from).toFixed(6);
  }, [fromQuantity, toQuantity]);

  function handleOpenChange(nextOpen: boolean) {
    setOpen(nextOpen);
    if (!nextOpen) {
      setError(null);
      setFromQuantity("");
      setToQuantity("");
    }
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const formData = new FormData(e.currentTarget);

    const input = {
      portfolioId,
      fromAssetId,
      toAssetId,
      date: formData.get("date") as string,
      fromQuantity,
      toQuantity,
      fee: (formData.get("fee") as string) || undefined,
      notes: (formData.get("notes") as string) || undefined,
      fromFxRate: (formData.get("fromFxRate") as string) || undefined,
      toFxRate: (formData.get("toFxRate") as string) || undefined,
    };

    startTransition(async () => {
      const result = await createConvertTransaction(input);
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
          Convert
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Convert Asset</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>From Asset</Label>
              <Select value={fromAssetId} onValueChange={setFromAssetId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select asset to sell" />
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
              <Label>To Asset</Label>
              <Select value={toAssetId} onValueChange={setToAssetId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select asset to buy" />
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
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="date">Date</Label>
            <Input id="date" name="date" type="date" required />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="fromQuantity">From Quantity</Label>
              <Input
                id="fromQuantity"
                name="fromQuantity"
                type="number"
                step="any"
                min="0"
                placeholder="e.g. 100"
                value={fromQuantity}
                onChange={(e) => setFromQuantity(e.target.value)}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="toQuantity">To Quantity</Label>
              <Input
                id="toQuantity"
                name="toQuantity"
                type="number"
                step="any"
                min="0"
                placeholder="e.g. 90"
                value={toQuantity}
                onChange={(e) => setToQuantity(e.target.value)}
                required
              />
            </div>
          </div>

          {impliedRate && fromTicker && toTicker && (
            <p className="text-sm text-muted-foreground">
              Rate: 1 {fromTicker} = {impliedRate} {toTicker}
            </p>
          )}

          {fromNeedsFx && fromAsset && (
            <div className="space-y-1.5">
              <Label htmlFor="fromFxRate">
                From Exchange Rate — 1 {fromAsset.pricingCurrency} ={" "}
                <span className="font-medium">? {portfolioBaseCurrency}</span>
              </Label>
              <Input
                id="fromFxRate"
                name="fromFxRate"
                type="number"
                step="any"
                min="0"
                placeholder="e.g. 0.028"
                required
              />
            </div>
          )}

          {toNeedsFx && toAsset && (
            <div className="space-y-1.5">
              <Label htmlFor="toFxRate">
                To Exchange Rate — 1 {toAsset.pricingCurrency} ={" "}
                <span className="font-medium">? {portfolioBaseCurrency}</span>
              </Label>
              <Input
                id="toFxRate"
                name="toFxRate"
                type="number"
                step="any"
                min="0"
                placeholder="e.g. 0.013"
                required
              />
            </div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="fee">Fee (optional)</Label>
            <Input id="fee" name="fee" type="number" step="any" min="0" placeholder="e.g. 2.00" />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="notes">Notes (optional)</Label>
            <Textarea id="notes" name="notes" placeholder="Any additional notes" rows={2} />
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <DialogFooter>
            <Button type="submit" disabled={isPending || assets.length < 2}>
              {isPending ? "Saving…" : "Convert"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
