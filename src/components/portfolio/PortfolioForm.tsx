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
import { Textarea } from "@/components/ui/textarea";
import { createPortfolio, updatePortfolio } from "@/lib/actions/portfolios";

type Portfolio = {
  id: string;
  name: string;
  description: string | null;
  baseCurrency: string;
};

type PortfolioFormProps = { mode: "create" } | { mode: "edit"; portfolio: Portfolio };

export function PortfolioForm(props: PortfolioFormProps) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const isEdit = props.mode === "edit";
  const portfolio = isEdit ? props.portfolio : null;

  function handleSubmit(formData: FormData) {
    setError(null);
    const input = {
      name: formData.get("name") as string,
      description: (formData.get("description") as string) || undefined,
      baseCurrency: formData.get("baseCurrency") as string,
    };

    startTransition(async () => {
      const result = isEdit
        ? await updatePortfolio(portfolio!.id, input)
        : await createPortfolio(input);

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
          <Button size="sm">New Portfolio</Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Portfolio" : "New Portfolio"}</DialogTitle>
        </DialogHeader>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSubmit(new FormData(e.currentTarget));
          }}
          className="space-y-4"
        >
          <div className="space-y-1.5">
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              name="name"
              defaultValue={portfolio?.name ?? ""}
              placeholder="e.g. Retirement Fund"
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="baseCurrency">Base Currency</Label>
            <Input
              id="baseCurrency"
              name="baseCurrency"
              defaultValue={portfolio?.baseCurrency ?? ""}
              placeholder="e.g. USD"
              maxLength={3}
              className="uppercase"
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="description">Description (optional)</Label>
            <Textarea
              id="description"
              name="description"
              defaultValue={portfolio?.description ?? ""}
              placeholder="Brief description of this portfolio"
              rows={2}
            />
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <DialogFooter>
            <Button type="submit" disabled={isPending}>
              {isPending ? "Saving…" : isEdit ? "Save changes" : "Create"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
