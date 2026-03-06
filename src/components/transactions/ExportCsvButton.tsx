"use client";

import { Download } from "lucide-react";

import { Button } from "@/components/ui/button";

type ExportCsvButtonProps = {
  portfolioId?: string;
  assetId?: string;
  type?: string;
  from?: string;
  to?: string;
};

export function ExportCsvButton({ portfolioId, assetId, type, from, to }: ExportCsvButtonProps) {
  function handleExport() {
    const params = new URLSearchParams();
    if (portfolioId) params.set("portfolioId", portfolioId);
    if (assetId) params.set("assetId", assetId);
    if (type) params.set("type", type);
    if (from) params.set("from", from);
    if (to) params.set("to", to);

    const url = `/api/transactions/export?${params.toString()}`;
    window.location.href = url;
  }

  return (
    <Button variant="outline" size="sm" onClick={handleExport}>
      <Download className="mr-2 h-4 w-4" />
      Export CSV
    </Button>
  );
}
