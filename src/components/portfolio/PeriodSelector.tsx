"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const PERIODS = ["1M", "3M", "6M", "1Y", "ALL"] as const;

type PeriodSelectorProps = { activePeriod: string };

export function PeriodSelector({ activePeriod }: PeriodSelectorProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function handlePeriodChange(period: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("period", period);
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <div className="flex gap-1">
      {PERIODS.map((period) => (
        <Button
          key={period}
          variant={activePeriod === period ? "default" : "ghost"}
          size="sm"
          onClick={() => handlePeriodChange(period)}
          className={cn("min-w-[2.5rem]")}
        >
          {period}
        </Button>
      ))}
    </div>
  );
}
