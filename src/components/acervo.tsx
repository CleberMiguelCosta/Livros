"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { api } from "@/lib/api";
import type { AcervoResponse, Livro } from "@/lib/types";
import { Cover } from "@/components/cover";
import { Button, buttonVariants } from "@/components/ui/button";
import { corStatus, labelStatus } from "@/lib/metas";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "cn";

type Vista = "grade" | "lista";

export function Acervo() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const autor = searchParams.get("autor") ?? "";
  const editora = searchParams.get("editora") ?? "";
  const q = searchParams.get("q") ?? "";
  const vista: Vista = searchParams.get("view") === "lista" ? "lista" : "grade";
  const [draft, setDraft] = useState(q);
  const [syncedQuery, setSyncedQuery] = useState(q);
  const [data, setData] = useState<AcervoResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [seeding, setSeeding] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  if (q !== syncedQuery) {
    setSyncedQuery(q);
    setDraft(q);
  }

  useEffect(() => {
    const handle = window.setTimeout(() => {
      if (draft.trim() === q) return;
      replace({ q: draft.trim() });
    }, 300);
    return () => window.clearTimeout(handle);
    // replace closes over the latest filters; draft is the only extra trigger.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draft]);

  useEffect(() => {
    const controller = new AbortController();
    const params = new URLSearchParams();
    if (autor) params.set("autor", autor);
    if (editora) params.set("editora", editora);
    if (q) params.set("q", q);
    api<AcervoResponse>(`/api/livros?${params}`, { signal: controller.signal })
      .then((payload) => {
        setData(payload);
        setError("");
        setLoading(false);
      })
      .catch((reason: unknown) => {
        if (controller.signal.aborted) return;
        setError(reason instanceof Error ? reason.message : "Não foi possível carregar o acervo.");
        setLoading(false);
      });
    return () => controller.abort();
  }, [autor, editora, q, reloadKey]);

  function replace(next: { autor?: string; editora?: string; q?: string; view?: Vista }) {
    const values = { autor, editora, q, view: vista, ...next };
    const params = new URLSearchParams();
    if (values.autor) params.set("autor", values.autor);
    if (values.editora) params.set("editora", values.editora);
    if (values.q) params.set("q", values.q);
    if (values.view === "lista") params.set("view", "lista");
    const query = params.toString();
    router.replace(query ? `/?${query}` : "/", { scroll: false });
  }

  async function trazerClassicos() {
    setSeeding(true);
    try {
      const payload = await api<{ adicionados: number }>("/api/livros/exemplos", {
        method: "POST",
        body: "{}",
      });
      toast.success(
        payload.adicionados === 0
          ? "Esses clássicos já estão na estante."
          : `${payload.adicionados} clássicos entraram na estante.`,
      );
      setReloadKey((value) => value + 1);
    } catch (reason) {
      toast.error(reason instanceof Error ? reason.message : "Não foi possível trazer os exemplos.");
    } finally {
      setSeeding(false);
    }
  }

  const autores = useMemo(() => withCurrent(data?.autores ?? [], autor), [data, autor]);
  const editoras = useMemo(() => withCurrent(data?.editoras ?? [], editora), [data, editora]);
  const filtrosAtivos = Boolean(autor || editora || q);

  return (
    <div className="grid gap-6 lg:grid-cols-[16.5rem_minmax(0,1fr)]">
      <aside className="h-fit rounded-2xl bg-card p-4 ring-1 ring-foreground/10 lg:sticky lg:top-4">
        <h2 className="font-heading text-2xl">Filtros</h2>
        <p className="mt-1 text-sm text-muted-foreground">Autor e editora do que já está cadastrado.</p>
        <div className="mt-4 grid gap-4">
          <div className="grid gap-1.5">
            <Label htmlFor="busca">Busca</Label>
            <Input
              id="busca"
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              placeholder="Título, autor ou ISBN"
              className="h-10"
            />
          </div>
          <FilterSelect
            label="Autor"
            allLabel="Todos os autores"
            value={autor}
            options={autores}
            onChange={(next) => replace({ autor: next })}
          />
          <FilterSelect
            label="Editora"
            allLabel="Todas as editoras"
            value={editora}
            options={editoras}
            onChange={(next) => replace({ editora: next })}
          />
          {filtrosAtivos ? (
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setDraft("");
                replace({ autor: "", editora: "", q: "" });
              }}
            >
              Limpar filtros
            </Button>
          ) : null}
        </div>
      </aside>

      <section className="grid gap-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="font-heading text-4xl tracking-tight">Acervo</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {loading && !data
                ? "Abrindo a estante…"
                : data
                  ? resumo(data, filtrosAtivos)
                  : "Sua biblioteca pessoal."}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div
              className="flex rounded-lg bg-card p-1 ring-1 ring-foreground/10"
              role="group"
              aria-label="Visualização do acervo"
            >
              <button
                type="button"
                onClick={() => replace({ view: "grade" })}
                className={cn(
                  "h-8 rounded-md px-3 text-sm transition-colors",
                  vista === "grade"
                    ? "bg-primary text-primary-foreground"
                    : "text-foreground hover:bg-accent",
                )}
                aria-pressed={vista === "grade"}
              >
                Grade
              </button>
              <button
                type="button"
                onClick={() => replace({ view: "lista" })}
                className={cn(
                  "h-8 rounded-md px-3 text-sm transition-colors",
                  vista === "lista"
                    ? "bg-primary text-primary-foreground"
                    : "text-foreground hover:bg-accent",
                )}
                aria-pressed={vista === "lista"}
              >
                Listar
              </button>
            </div>
            <Link href="/livros/novo" className={cn(buttonVariants({ size: "lg" }))}>
              Cadastrar livro
            </Link>
          </div>
        </div>

        {error ? (
          <div className="rounded-2xl bg-destructive/10 px-4 py-4 text-sm text-destructive" role="alert">
            <p>{error}</p>
            <Button
              type="button"
              variant="outline"
              className="mt-3"
              onClick={() => {
                setLoading(true);
                setReloadKey((value) => value + 1);
              }}
            >
              Tentar de novo
            </Button>
          </div>
        ) : null}

        {loading && !data ? (
          <div className="grid gap-3 sm:grid-cols-2">
            {Array.from({ length: 4 }, (_, index) => (
              <Skeleton key={index} className="h-40 w-full rounded-2xl" />
            ))}
          </div>
        ) : null}

        {data && data.livros.length === 0 && !error ? (
          <EmptyShelf
            filtered={filtrosAtivos}
            seeding={seeding}
            onClear={() => {
              setDraft("");
              replace({ autor: "", editora: "", q: "" });
            }}
            onSeed={trazerClassicos}
          />
        ) : null}

        {data && data.livros.length > 0 ? (
          vista === "lista" ? (
            <ListaAcervo livros={data.livros} />
          ) : (
            <ul className="grid gap-3 sm:grid-cols-2">
              {data.livros.map((livro) => (
                <li key={livro.id}>
                  <LivroCard livro={livro} />
                </li>
              ))}
            </ul>
          )
        ) : null}
      </section>
    </div>
  );
}

function LivroCard({ livro }: { livro: Livro }) {
  const cor = corStatus(livro.statusLeitura);
  return (
    <article className="relative flex h-full gap-3 overflow-hidden rounded-2xl bg-card p-3 pl-4 ring-1 ring-foreground/10 before:absolute before:inset-y-0 before:left-0 before:w-1.5 before:bg-primary">
      <Cover titulo={livro.titulo} capaUrl={livro.capaUrl} statusLeitura={livro.statusLeitura} />
      <div className="flex min-w-0 flex-1 flex-col">
        <h2 className="font-heading text-xl leading-tight">
          <Link href={`/livros/${livro.id}`} className="hover:underline">
            {livro.titulo}
          </Link>
        </h2>
        <p className="mt-1 text-sm">{livro.autor}</p>
        <p className="text-sm text-muted-foreground">
          {livro.editora || "Editora não informada"}
          {livro.ano ? ` · ${livro.ano}` : ""}
        </p>
        {livro.statusLeitura ? (
          <p className="mt-2 inline-flex items-center gap-1.5 text-xs text-muted-foreground">
            <span className="h-2 w-2 rounded-full" style={{ background: cor }} aria-hidden />
            {labelStatus(livro.statusLeitura)}
          </p>
        ) : null}
        <div className="mt-auto flex flex-wrap gap-2 pt-3">
          <Link
            href={`/livros/${livro.id}`}
            className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
          >
            Ficha
          </Link>
          <Link
            href={`/precos?q=${encodeURIComponent(`${livro.titulo} ${livro.autor}`)}`}
            className={cn(buttonVariants({ variant: "secondary", size: "sm" }))}
          >
            Preços
          </Link>
        </div>
      </div>
    </article>
  );
}

function ListaAcervo({ livros }: { livros: Livro[] }) {
  return (
    <div className="overflow-hidden rounded-2xl bg-card ring-1 ring-foreground/10">
      <div className="hidden grid-cols-[4.5rem_minmax(0,1.4fr)_minmax(0,1fr)_minmax(0,1fr)_auto] gap-3 border-b border-foreground/10 px-4 py-2 text-xs tracking-[0.14em] text-muted-foreground uppercase sm:grid">
        <span>Capa</span>
        <span>Título</span>
        <span>Autor</span>
        <span>Editora</span>
        <span className="text-right">Ações</span>
      </div>
      <ul className="divide-y divide-foreground/10">
        {livros.map((livro) => (
          <li key={livro.id}>
            <article className="grid grid-cols-[4.5rem_minmax(0,1fr)] items-center gap-3 px-3 py-3 sm:grid-cols-[4.5rem_minmax(0,1.4fr)_minmax(0,1fr)_minmax(0,1fr)_auto] sm:px-4">
              <Cover
                titulo={livro.titulo}
                capaUrl={livro.capaUrl}
                statusLeitura={livro.statusLeitura}
                className="h-16 w-11"
              />
              <div className="min-w-0 sm:contents">
                <div className="min-w-0">
                  <h2 className="font-heading text-lg leading-tight">
                    <Link href={`/livros/${livro.id}`} className="hover:underline">
                      {livro.titulo}
                    </Link>
                  </h2>
                  <p className="mt-1 text-sm text-muted-foreground sm:hidden">
                    {livro.autor}
                    {livro.editora ? ` · ${livro.editora}` : ""}
                    {livro.ano ? ` · ${livro.ano}` : ""}
                    {livro.statusLeitura ? ` · ${labelStatus(livro.statusLeitura)}` : ""}
                  </p>
                </div>
                <p className="hidden truncate text-sm sm:block">{livro.autor}</p>
                <p className="hidden truncate text-sm text-muted-foreground sm:block">
                  {livro.editora || "Editora não informada"}
                  {livro.ano ? ` · ${livro.ano}` : ""}
                </p>
                <div className="mt-2 flex flex-wrap gap-2 sm:mt-0 sm:justify-end">
                  <Link
                    href={`/livros/${livro.id}`}
                    className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
                  >
                    Ficha
                  </Link>
                  <Link
                    href={`/precos?q=${encodeURIComponent(`${livro.titulo} ${livro.autor}`)}`}
                    className={cn(buttonVariants({ variant: "secondary", size: "sm" }))}
                  >
                    Preços
                  </Link>
                </div>
              </div>
            </article>
          </li>
        ))}
      </ul>
    </div>
  );
}

function resumo(data: AcervoResponse, filtrado: boolean) {
  if (!filtrado) {
    return data.total === 1 ? "1 livro na estante." : `${data.total} livros na estante.`;
  }
  return `${data.filtrados} de ${data.total} ${data.total === 1 ? "livro" : "livros"}.`;
}

function withCurrent(options: string[], current: string) {
  if (current && !options.includes(current)) return [current, ...options];
  return options;
}

function FilterSelect({
  label,
  allLabel,
  value,
  options,
  onChange,
}: {
  label: string;
  allLabel: string;
  value: string;
  options: string[];
  onChange: (value: string) => void;
}) {
  const items: Record<string, string> = { __todos__: allLabel };
  for (const option of options) items[option] = option;
  return (
    <div className="grid gap-1.5">
      <Label>{label}</Label>
      <Select
        items={items}
        value={value || "__todos__"}
        onValueChange={(next) => onChange(!next || next === "__todos__" ? "" : next)}
      >
        <SelectTrigger className="h-10 w-full" aria-label={label}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="__todos__">{allLabel}</SelectItem>
          {options.map((option) => (
            <SelectItem key={option} value={option}>
              {option}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

function EmptyShelf({
  filtered,
  seeding,
  onClear,
  onSeed,
}: {
  filtered: boolean;
  seeding: boolean;
  onClear: () => void;
  onSeed: () => void;
}) {
  if (filtered) {
    return (
      <div className="rounded-2xl bg-card px-5 py-8 ring-1 ring-foreground/10">
        <h2 className="font-heading text-2xl">Nenhum livro com esses filtros</h2>
        <p className="mt-2 max-w-md text-sm text-muted-foreground">
          A combinação de autor, editora e busca não encontrou ficha. Limpe os filtros para ver o acervo inteiro.
        </p>
        <Button type="button" className="mt-4" variant="outline" onClick={onClear}>
          Limpar filtros
        </Button>
      </div>
    );
  }

  return (
    <div className="rounded-2xl bg-card px-5 py-8 ring-1 ring-foreground/10">
      <div className="flex items-end gap-1" aria-hidden>
        <span className="h-14 w-3.5 rounded-sm bg-primary" />
        <span className="h-20 w-4 rounded-sm bg-[oklch(0.36_0.06_155)]" />
        <span className="h-16 w-3.5 rounded-sm bg-[oklch(0.45_0.09_70)]" />
      </div>
      <h2 className="mt-4 font-heading text-3xl">A estante ainda está vazia</h2>
      <p className="mt-2 max-w-lg text-sm text-muted-foreground">
        Cadastre um livro ou traga alguns clássicos brasileiros para experimentar os filtros de autor e editora.
      </p>
      <div className="mt-5 flex flex-wrap gap-2">
        <Link href="/livros/novo" className={cn(buttonVariants({ size: "lg" }))}>
          Cadastrar livro
        </Link>
        <Button type="button" variant="secondary" size="lg" onClick={onSeed} disabled={seeding}>
          {seeding ? "Buscando fichas…" : "Trazer clássicos de exemplo"}
        </Button>
      </div>
    </div>
  );
}
