"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { formatBRL } from "@/lib/format";
import type { Oferta } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";

type PriceResponse = {
  consulta: string;
  fonte: string;
  ofertas: Oferta[];
  aviso: string;
};

export function PriceSearch({
  initialQuery,
  auto = false,
}: {
  initialQuery: string;
  auto?: boolean;
}) {
  const shouldAuto = auto && initialQuery.trim().length >= 2;
  const [draft, setDraft] = useState(initialQuery);
  const [loading, setLoading] = useState(shouldAuto);
  const [result, setResult] = useState<PriceResponse | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!shouldAuto) return;
    let ignore = false;
    api<PriceResponse>(`/api/precos?q=${encodeURIComponent(initialQuery)}`)
      .then((payload) => {
        if (!ignore) setResult(payload);
      })
      .catch((reason: unknown) => {
        if (!ignore) setError(reason instanceof Error ? reason.message : "A busca falhou.");
      })
      .finally(() => {
        if (!ignore) setLoading(false);
      });
    return () => {
      ignore = true;
    };
  }, [shouldAuto, initialQuery]);

  async function search(event?: React.FormEvent) {
    event?.preventDefault();
    const consulta = draft.trim();
    if (consulta.length < 2) {
      toast.error("Digite pelo menos o título do livro.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      setResult(await api<PriceResponse>(`/api/precos?q=${encodeURIComponent(consulta)}`));
    } catch (reason) {
      setResult(null);
      setError(reason instanceof Error ? reason.message : "A busca falhou.");
    } finally {
      setLoading(false);
    }
  }

  const menor = result?.ofertas[0]?.preco;

  return (
    <section className="grid gap-4">
      <form onSubmit={search} className="flex flex-col gap-2 sm:flex-row">
        <label className="sr-only" htmlFor="consulta-preco">
          Título ou autor para buscar preços
        </label>
        <Input
          id="consulta-preco"
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          placeholder="Título, autor ou ISBN"
          className="h-10 bg-card"
        />
        <Button type="submit" size="lg" disabled={loading} className="sm:w-40">
          {loading ? "Buscando…" : "Buscar preços"}
        </Button>
      </form>

      {loading && !result ? (
        <div className="grid gap-3">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
      ) : null}

      {error ? (
        <p className="rounded-xl bg-destructive/10 px-4 py-3 text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}

      {result ? (
        <div className="grid gap-3">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="font-heading text-2xl">
              {result.ofertas.length === 0
                ? "Nenhuma oferta"
                : `${result.ofertas.length} ${result.ofertas.length === 1 ? "oferta" : "ofertas"}`}
            </h2>
            <p className="text-sm text-muted-foreground">{result.fonte}</p>
          </div>
          {result.ofertas.length === 0 ? (
            <p className="rounded-xl bg-card px-4 py-6 text-sm text-muted-foreground ring-1 ring-foreground/10">
              {result.aviso}
            </p>
          ) : (
            <ul className="grid gap-3">
              {result.ofertas.map((oferta) => (
                <li
                  key={oferta.url}
                  className="flex gap-3 rounded-xl bg-card p-3 ring-1 ring-foreground/10"
                >
                  {oferta.imagem ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={oferta.imagem}
                      alt=""
                      referrerPolicy="no-referrer"
                      className="h-24 w-16 shrink-0 rounded-md object-cover"
                    />
                  ) : (
                    <div className="h-24 w-16 shrink-0 rounded-md bg-muted" />
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="line-clamp-2 font-medium leading-snug">{oferta.titulo}</p>
                    <p className="mt-2 font-heading text-2xl text-primary">{formatBRL(oferta.preco)}</p>
                    {oferta.preco === menor ? (
                      <p className="text-xs tracking-wide text-muted-foreground uppercase">Menor preço desta busca</p>
                    ) : null}
                  </div>
                  <a
                    href={oferta.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="self-center text-sm font-medium text-primary underline-offset-4 hover:underline"
                  >
                    Ver
                  </a>
                </li>
              ))}
            </ul>
          )}
          {result.ofertas.length > 0 ? (
            <p className="text-sm text-muted-foreground">{result.aviso}</p>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
