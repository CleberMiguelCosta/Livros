"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { agruparOfertas, type ProdutoComparado } from "@/lib/comparador";
import { formatBRL } from "@/lib/format";
import type { Ficha, Livro, Oferta } from "@/lib/types";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "cn";

type PriceResponse = {
  consulta: string;
  fonte: string;
  ofertas: Oferta[];
  aviso: string;
  page: number;
  hasNext: boolean;
  hasPrev: boolean;
};

type Ordenacao = "menor" | "maior" | "lojas";

export function PriceSearch({
  initialQuery,
  initialPage = 1,
  auto = false,
}: {
  initialQuery: string;
  initialPage?: number;
  auto?: boolean;
}) {
  const router = useRouter();
  const shouldAuto = auto && initialQuery.trim().length >= 2;
  const [draft, setDraft] = useState(initialQuery);
  const [page, setPage] = useState(Math.max(1, initialPage));
  const [loading, setLoading] = useState(shouldAuto);
  const [result, setResult] = useState<PriceResponse | null>(null);
  const [error, setError] = useState("");
  const [savingUrl, setSavingUrl] = useState("");
  const [ordenacao, setOrdenacao] = useState<Ordenacao>("menor");
  const [aberto, setAberto] = useState<string | null>(null);
  const [paginasConhecidas, setPaginasConhecidas] = useState(Math.max(1, initialPage));

  useEffect(() => {
    if (!shouldAuto) return;
    let ignore = false;
    setLoading(true);
    setError("");
    api<PriceResponse>(
      `/api/precos?q=${encodeURIComponent(initialQuery)}&page=${Math.max(1, initialPage)}`,
    )
      .then((payload) => {
        if (ignore) return;
        setResult(payload);
        setPage(payload.page);
        setAberto(null);
        setPaginasConhecidas((atual) =>
          Math.max(atual, payload.page, payload.hasNext ? payload.page + 1 : payload.page),
        );
      })
      .catch((reason: unknown) => {
        if (ignore) return;
        setError(reason instanceof Error ? reason.message : "A busca falhou.");
      })
      .finally(() => {
        if (!ignore) setLoading(false);
      });
    return () => {
      ignore = true;
    };
  }, [shouldAuto, initialQuery, initialPage]);

  async function carregar(consulta: string, pagina: number, syncUrl: boolean) {
    const payload = await api<PriceResponse>(
      `/api/precos?q=${encodeURIComponent(consulta)}&page=${pagina}`,
    );
    setResult(payload);
    setPage(payload.page);
    setAberto(null);
    setPaginasConhecidas((atual) =>
      Math.max(atual, payload.page, payload.hasNext ? payload.page + 1 : payload.page),
    );
    if (syncUrl) {
      const params = new URLSearchParams();
      params.set("q", consulta);
      if (payload.page > 1) params.set("page", String(payload.page));
      router.replace(`/precos?${params}`, { scroll: false });
    }
    return payload;
  }

  async function search(event?: React.FormEvent) {
    event?.preventDefault();
    const consulta = draft.trim();
    if (consulta.length < 2) {
      toast.error("Digite pelo menos o título do livro.");
      return;
    }
    setLoading(true);
    setError("");
    setPaginasConhecidas(1);
    try {
      await carregar(consulta, 1, true);
    } catch (reason) {
      setResult(null);
      setError(reason instanceof Error ? reason.message : "A busca falhou.");
    } finally {
      setLoading(false);
    }
  }

  async function irParaPagina(proxima: number) {
    const consulta = (result?.consulta || draft).trim();
    if (consulta.length < 2 || proxima < 1 || loading) return;
    setLoading(true);
    setError("");
    try {
      await carregar(consulta, proxima, true);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "A busca falhou.");
    } finally {
      setLoading(false);
    }
  }

  async function salvarNaEstante(oferta: Oferta) {
    setSavingUrl(oferta.url);
    try {
      let ficha: Ficha | null = null;
      try {
        const catalogo = await api<{ fichas: Ficha[] }>(
          `/api/catalogo?q=${encodeURIComponent(oferta.titulo)}`,
        );
        ficha = catalogo.fichas[0] ?? null;
      } catch {
        ficha = null;
      }

      const capaUrl =
        (oferta.imagem?.startsWith("https://") ? oferta.imagem : "") || ficha?.capaUrl || "";
      const autor = ficha?.autor?.trim() || "Não informado";

      const response = await api<{ livro: Livro }>("/api/livros", {
        method: "POST",
        body: JSON.stringify({
          titulo: ficha?.titulo || oferta.titulo,
          autor,
          editora: ficha?.editora || "",
          isbn: ficha?.isbn || "",
          ano: ficha?.ano ?? "",
          paginas: ficha?.paginas ?? "",
          sinopse: ficha?.sinopse || "",
          capaUrl,
        }),
      });

      toast.success(
        capaUrl ? "Livro salvo na biblioteca com capa." : "Livro salvo na biblioteca.",
        {
          action: {
            label: "Abrir",
            onClick: () => router.push(`/livros/${response.livro.id}`),
          },
        },
      );
    } catch (reason) {
      toast.error(
        reason instanceof Error ? reason.message : "Não foi possível salvar na biblioteca.",
      );
    } finally {
      setSavingUrl("");
    }
  }

  const produtos = useMemo(() => {
    if (!result) return [] as ProdutoComparado[];
    const grupos = agruparOfertas(result.ofertas);
    if (ordenacao === "maior") return [...grupos].sort((a, b) => b.menorPreco - a.menorPreco);
    if (ordenacao === "lojas") {
      return [...grupos].sort((a, b) => b.lojas - a.lojas || a.menorPreco - b.menorPreco);
    }
    return grupos;
  }, [result, ordenacao]);

  const melhorGeral = result?.ofertas.length
    ? Math.min(...result.ofertas.map((item) => item.preco))
    : null;

  return (
    <section className="grid gap-5">
      <form
        onSubmit={search}
        className="rounded-2xl bg-[oklch(0.29_0.045_35)] p-4 text-[oklch(0.96_0.014_90)] shadow-sm sm:p-5"
      >
        <p className="text-xs tracking-[0.18em] text-[oklch(0.8_0.04_75)] uppercase">Comparador</p>
        <div className="mt-4 flex flex-col gap-2 sm:flex-row">
          <label className="sr-only" htmlFor="consulta-preco">
            Título ou autor para buscar
          </label>
          <Input
            id="consulta-preco"
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            placeholder="Ex.: Dom Casmurro, Duna, ISBN…"
            className="h-11 border-white/20 bg-[oklch(0.96_0.014_90)] text-foreground"
          />
          <Button type="submit" size="lg" disabled={loading} className="sm:min-w-28">
            {loading ? "Buscando…" : "Buscar"}
          </Button>
        </div>
      </form>

      {loading && !result ? (
        <div className="grid gap-3">
          <Skeleton className="h-36 w-full rounded-2xl" />
          <Skeleton className="h-36 w-full rounded-2xl" />
        </div>
      ) : null}

      {error ? (
        <p className="rounded-xl bg-destructive/10 px-4 py-3 text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}

      {result ? (
        <div className="grid gap-4">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="font-heading text-2xl">
                {produtos.length === 0
                  ? "Nenhuma oferta"
                  : `${produtos.length} ${produtos.length === 1 ? "produto" : "produtos"} · ${result.ofertas.length} ofertas`}
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {result.fonte}
                {melhorGeral !== null ? ` · a partir de ${formatBRL(melhorGeral)}` : ""}
                {` · página ${result.page}`}
              </p>
            </div>
          </div>

          {result.ofertas.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              <FilterChip active={ordenacao === "menor"} onClick={() => setOrdenacao("menor")}>
                Menor preço
              </FilterChip>
              <FilterChip active={ordenacao === "maior"} onClick={() => setOrdenacao("maior")}>
                Maior preço
              </FilterChip>
              <FilterChip active={ordenacao === "lojas"} onClick={() => setOrdenacao("lojas")}>
                Mais lojas
              </FilterChip>
            </div>
          ) : null}

          {produtos.length === 0 ? (
            <p className="rounded-xl bg-card px-4 py-6 text-sm text-muted-foreground ring-1 ring-foreground/10">
              {result.aviso}
            </p>
          ) : (
            <ul className="grid gap-4">
              {produtos.map((produto) => {
                const expandido = aberto === produto.id;
                return (
                  <li
                    key={produto.id}
                    className="overflow-hidden rounded-2xl bg-card ring-1 ring-foreground/10"
                  >
                    <div className="flex flex-col gap-4 p-4 sm:flex-row">
                      {produto.imagem ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={produto.imagem}
                          alt=""
                          referrerPolicy="no-referrer"
                          className="h-36 w-24 shrink-0 rounded-md object-cover shadow-sm"
                        />
                      ) : (
                        <div className="h-36 w-24 shrink-0 rounded-md bg-muted" />
                      )}

                      <div className="min-w-0 flex-1">
                        <h3 className="font-heading text-xl leading-tight sm:text-2xl">
                          {produto.titulo}
                        </h3>
                        <p className="mt-2 text-sm text-muted-foreground">
                          {produto.lojas} {produto.lojas === 1 ? "loja" : "lojas"}
                          {produto.maiorPreco > produto.menorPreco
                            ? ` · de ${formatBRL(produto.menorPreco)} a ${formatBRL(produto.maiorPreco)}`
                            : ""}
                        </p>
                        <div className="mt-3 flex flex-wrap items-end gap-3">
                          <div>
                            <p className="text-[0.65rem] tracking-[0.16em] text-muted-foreground uppercase">
                              Menor preço
                            </p>
                            <p className="font-heading text-3xl text-primary">
                              {formatBRL(produto.menorPreco)}
                            </p>
                          </div>
                          {produto.menorPreco === melhorGeral ? (
                            <span className="rounded-md bg-primary/10 px-2 py-1 text-xs font-medium text-primary">
                              Melhor oferta da busca
                            </span>
                          ) : null}
                        </div>
                      </div>

                      <div className="flex shrink-0 flex-col justify-center gap-2 sm:w-48">
                        <Button
                          type="button"
                          size="lg"
                          variant="secondary"
                          disabled={Boolean(savingUrl)}
                          onClick={() => salvarNaEstante(produto.ofertas[0])}
                        >
                          {savingUrl === produto.ofertas[0].url
                            ? "Salvando…"
                            : "Adicionar à biblioteca"}
                        </Button>
                        <Button
                          type="button"
                          size="lg"
                          onClick={() => setAberto(expandido ? null : produto.id)}
                        >
                          {expandido ? "Ocultar lojas" : "Comparar lojas"}
                        </Button>
                        <a
                          href={produto.ofertas[0].url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={cn(
                            buttonVariants({ variant: "outline", size: "lg" }),
                            "justify-center",
                          )}
                        >
                          Ir à loja
                        </a>
                      </div>
                    </div>

                    {expandido ? (
                      <div className="border-t border-foreground/10 bg-[oklch(0.97_0.012_90)] px-4 py-3">
                        <p className="mb-3 text-xs tracking-[0.16em] text-muted-foreground uppercase">
                          Ofertas neste livro
                        </p>
                        <ul className="grid gap-2">
                          {produto.ofertas.map((oferta, index) => (
                            <li
                              key={oferta.url}
                              className="flex flex-col gap-3 rounded-xl bg-card p-3 ring-1 ring-foreground/10 sm:flex-row sm:items-center"
                            >
                              <div className="min-w-0 flex-1">
                                <div className="flex flex-wrap items-center gap-2">
                                  <p className="font-medium">{oferta.fonte}</p>
                                  {index === 0 ? (
                                    <span className="rounded bg-primary px-1.5 py-0.5 text-[0.65rem] font-medium tracking-wide text-primary-foreground uppercase">
                                      Menor preço
                                    </span>
                                  ) : null}
                                </div>
                                <p className="mt-1 line-clamp-1 text-sm text-muted-foreground">
                                  {oferta.titulo}
                                </p>
                              </div>
                              <p className="font-heading text-2xl text-primary">
                                {formatBRL(oferta.preco)}
                              </p>
                              <div className="flex flex-wrap gap-2 sm:justify-end">
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="secondary"
                                  disabled={Boolean(savingUrl)}
                                  onClick={() => salvarNaEstante(oferta)}
                                >
                                  {savingUrl === oferta.url ? "Salvando…" : "Salvar na biblioteca"}
                                </Button>
                                <a
                                  href={oferta.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className={cn(
                                    buttonVariants({ size: "sm" }),
                                    "inline-flex justify-center",
                                  )}
                                >
                                  Ir à loja
                                </a>
                              </div>
                            </li>
                          ))}
                        </ul>
                      </div>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          )}

          {result.ofertas.length > 0 || result.hasPrev || result.hasNext ? (
            <nav
              className="flex flex-wrap items-center justify-center gap-2 rounded-2xl bg-card p-3 ring-1 ring-foreground/10"
              aria-label="Paginação da busca"
            >
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={loading || !result.hasPrev}
                onClick={() => irParaPagina(page - 1)}
              >
                Anterior
              </Button>
              {Array.from({ length: paginasConhecidas }, (_, index) => index + 1)
                .filter((numero) => {
                  if (paginasConhecidas <= 7) return true;
                  return (
                    numero === 1 ||
                    numero === paginasConhecidas ||
                    Math.abs(numero - page) <= 1
                  );
                })
                .map((numero, index, lista) => {
                  const anterior = lista[index - 1];
                  const precisaReticencias = anterior !== undefined && numero - anterior > 1;
                  return (
                    <span key={numero} className="contents">
                      {precisaReticencias ? (
                        <span className="px-1 text-sm text-muted-foreground">…</span>
                      ) : null}
                      <Button
                        type="button"
                        size="sm"
                        variant={numero === page ? "default" : "outline"}
                        disabled={loading}
                        onClick={() => irParaPagina(numero)}
                        aria-current={numero === page ? "page" : undefined}
                      >
                        {numero}
                      </Button>
                    </span>
                  );
                })}
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={loading || !result.hasNext}
                onClick={() => irParaPagina(page + 1)}
              >
                Próxima
              </Button>
            </nav>
          ) : null}

          {result.ofertas.length > 0 ? (
            <p className="text-sm text-muted-foreground">{result.aviso}</p>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}

function FilterChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "h-8 rounded-lg px-3 text-sm transition-colors",
        active
          ? "bg-primary text-primary-foreground"
          : "bg-card text-foreground ring-1 ring-foreground/10 hover:bg-accent",
      )}
    >
      {children}
    </button>
  );
}
