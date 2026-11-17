"use client";

import { useSearchParams } from "next/navigation";
import { PriceSearch } from "@/components/price-search";

export function PricePage() {
  const params = useSearchParams();
  const q = params.get("q") ?? "";

  return (
    <div className="grid gap-6">
      <div>
        <h1 className="font-heading text-4xl tracking-tight">Preços</h1>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
          A busca consulta os livros à venda na Amazon.com.br e lista o preço de cada anúncio, do mais
          barato ao mais caro. Não precisa cadastrar o livro antes.
        </p>
      </div>
      <PriceSearch key={q} initialQuery={q} auto={q.trim().length >= 2} />
    </div>
  );
}
