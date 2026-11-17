"use client";

import { useSearchParams } from "next/navigation";
import { PriceSearch } from "@/components/price-search";

export function PricePage() {
  const params = useSearchParams();
  const q = params.get("q") ?? "";
  const page = Number(params.get("page") ?? "1");

  return (
    <div className="grid gap-6">
      <PriceSearch
        key={`${q}:${Number.isFinite(page) && page > 0 ? page : 1}`}
        initialQuery={q}
        initialPage={Number.isFinite(page) && page > 0 ? Math.floor(page) : 1}
        auto={q.trim().length >= 2}
      />
    </div>
  );
}
