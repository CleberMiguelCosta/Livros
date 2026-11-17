"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { STATUS_META, labelStatus } from "@/lib/metas";
import type { AcervoResponse, Ficha, Livro, StatusLeitura } from "@/lib/types";
import { Cover } from "@/components/cover";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "cn";

function fichaKey(ficha: Ficha) {
  return `${ficha.fonte}|${ficha.isbn}|${ficha.titulo}|${ficha.autor}`;
}

function matchAcervo(ficha: Ficha, acervo: Livro[]) {
  const isbn = ficha.isbn.trim().toUpperCase();
  if (isbn) {
    const byIsbn = acervo.find((livro) => livro.isbn.trim().toUpperCase() === isbn);
    if (byIsbn) return byIsbn;
  }
  const titulo = ficha.titulo.trim().toLocaleLowerCase("pt-BR");
  const autor = (ficha.autor.trim() || "não informado").toLocaleLowerCase("pt-BR");
  return (
    acervo.find(
      (livro) =>
        livro.titulo.trim().toLocaleLowerCase("pt-BR") === titulo &&
        livro.autor.trim().toLocaleLowerCase("pt-BR") === autor,
    ) ?? null
  );
}

type FiltroStatus = "todos" | StatusLeitura;

export function MetasLeitura() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const statusParam = searchParams.get("status") ?? "todos";
  const filtro: FiltroStatus =
    statusParam === "quero_ler" || statusParam === "lendo" || statusParam === "lido"
      ? statusParam
      : "todos";

  const [data, setData] = useState<AcervoResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);
  const [updatingId, setUpdatingId] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    const params = new URLSearchParams();
    if (filtro === "todos") params.set("status", "metas");
    else params.set("status", filtro);

    api<AcervoResponse>(`/api/livros?${params}`, { signal: controller.signal })
      .then((payload) => {
        setData(payload);
        setError("");
        setLoading(false);
      })
      .catch((reason: unknown) => {
        if (controller.signal.aborted) return;
        setError(reason instanceof Error ? reason.message : "Não foi possível abrir as metas.");
        setLoading(false);
      });
    return () => controller.abort();
  }, [filtro, reloadKey]);

  function setFiltro(next: FiltroStatus) {
    const params = new URLSearchParams();
    if (next !== "todos") params.set("status", next);
    const query = params.toString();
    router.replace(query ? `/metas?${query}` : "/metas", { scroll: false });
  }

  async function mudarStatus(livroId: string, statusLeitura: StatusLeitura) {
    setUpdatingId(livroId);
    try {
      await api<{ livro: Livro }>(`/api/livros/${livroId}`, {
        method: "PATCH",
        body: JSON.stringify({ statusLeitura }),
      });
      toast.success(
        statusLeitura ? `Marcado como ${labelStatus(statusLeitura)}.` : "Removido das metas.",
      );
      setReloadKey((value) => value + 1);
    } catch (reason) {
      toast.error(reason instanceof Error ? reason.message : "Não foi possível atualizar a meta.");
    } finally {
      setUpdatingId("");
    }
  }

  const porStatus = data?.porStatus;
  const livros = data?.livros ?? [];

  return (
    <div className="grid gap-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-heading text-4xl tracking-tight">Metas de leitura</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Organize a estante em Quero ler, Lendo e Lido. A faixa no topo da capa mostra o status.
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger
            render={<Button size="lg" />}
          >
            Adicionar à meta
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <AdicionarMetaDialog
              onDone={() => {
                setDialogOpen(false);
                setReloadKey((value) => value + 1);
              }}
            />
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex flex-wrap gap-2" role="group" aria-label="Filtro de status">
        <FiltroChip
          active={filtro === "todos"}
          onClick={() => setFiltro("todos")}
          label="Todas as metas"
          count={
            porStatus
              ? porStatus.quero_ler + porStatus.lendo + porStatus.lido
              : undefined
          }
        />
        {STATUS_META.map((item) => (
          <FiltroChip
            key={item.id}
            active={filtro === item.id}
            onClick={() => setFiltro(item.id)}
            label={item.label}
            count={porStatus?.[item.id]}
            cor={item.cor}
          />
        ))}
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
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }, (_, index) => (
            <Skeleton key={index} className="h-48 w-full rounded-2xl" />
          ))}
        </div>
      ) : null}

      {!loading && livros.length === 0 && !error ? (
        <div className="rounded-2xl bg-card px-5 py-8 ring-1 ring-foreground/10">
          <h2 className="font-heading text-2xl">
            {filtro === "todos" ? "Nenhum livro nas metas" : `Nenhum livro em ${labelStatus(filtro)}`}
          </h2>
          <p className="mt-2 max-w-lg text-sm text-muted-foreground">
            Adicione títulos do seu acervo e marque como Quero ler, Lendo ou Lido para acompanhar o
            progresso.
          </p>
          <Button type="button" className="mt-4" onClick={() => setDialogOpen(true)}>
            Adicionar à meta
          </Button>
        </div>
      ) : null}

      {livros.length > 0 ? (
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {livros.map((livro) => (
            <li key={livro.id}>
              <article className="relative flex h-full gap-3 overflow-hidden rounded-2xl bg-card p-3 ring-1 ring-foreground/10">
                <Cover
                  titulo={livro.titulo}
                  capaUrl={livro.capaUrl}
                  statusLeitura={livro.statusLeitura}
                  className="h-36 w-24"
                />
                <div className="flex min-w-0 flex-1 flex-col">
                  <p className="text-[0.65rem] tracking-[0.14em] text-muted-foreground uppercase">
                    {labelStatus(livro.statusLeitura)}
                  </p>
                  <h2 className="mt-1 font-heading text-xl leading-tight">
                    <Link href={`/livros/${livro.id}`} className="hover:underline">
                      {livro.titulo}
                    </Link>
                  </h2>
                  <p className="mt-1 text-sm">{livro.autor}</p>
                  <div className="mt-auto flex flex-wrap gap-1.5 pt-3">
                    {STATUS_META.map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        disabled={updatingId === livro.id}
                        onClick={() => mudarStatus(livro.id, item.id)}
                        className={cn(
                          "h-7 rounded-md px-2 text-xs transition-colors",
                          livro.statusLeitura === item.id
                            ? "text-white"
                            : "bg-secondary text-secondary-foreground hover:bg-accent",
                        )}
                        style={
                          livro.statusLeitura === item.id ? { background: item.cor } : undefined
                        }
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>
                </div>
              </article>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

function FiltroChip({
  active,
  onClick,
  label,
  count,
  cor,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  count?: number;
  cor?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex h-9 items-center gap-2 rounded-lg px-3 text-sm transition-colors",
        active
          ? "bg-primary text-primary-foreground"
          : "bg-card text-foreground ring-1 ring-foreground/10 hover:bg-accent",
      )}
    >
      {cor ? (
        <span className="h-2.5 w-2.5 rounded-full" style={{ background: cor }} aria-hidden />
      ) : null}
      {label}
      {typeof count === "number" ? (
        <span className={cn("text-xs", active ? "opacity-80" : "text-muted-foreground")}>
          {count}
        </span>
      ) : null}
    </button>
  );
}

function AdicionarMetaDialog({ onDone }: { onDone: () => void }) {
  const [acervo, setAcervo] = useState<Livro[]>([]);
  const [consulta, setConsulta] = useState("");
  const [fichas, setFichas] = useState<Ficha[]>([]);
  const [buscando, setBuscando] = useState(false);
  const [buscou, setBuscou] = useState(false);
  const [status, setStatus] = useState<Exclude<StatusLeitura, "">>("quero_ler");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    api<AcervoResponse>("/api/livros?", { signal: controller.signal })
      .then((payload) => setAcervo(payload.livros))
      .catch(() => undefined);
    return () => controller.abort();
  }, []);

  async function buscar(event: React.FormEvent) {
    event.preventDefault();
    if (consulta.trim().length < 2) {
      toast.error("Digite um título, um autor ou um ISBN.");
      return;
    }
    setBuscando(true);
    setSelected(new Set());
    try {
      const payload = await api<{ fichas: Ficha[] }>(
        `/api/catalogo?q=${encodeURIComponent(consulta.trim())}`,
      );
      setFichas(payload.fichas);
      setBuscou(true);
      if (payload.fichas.length === 0) {
        toast.message("Nenhuma ficha encontrada nas APIs.");
      } else {
        toast.success(
          `${payload.fichas.length} ${payload.fichas.length === 1 ? "ficha" : "fichas"} encontradas.`,
        );
      }
    } catch (reason) {
      toast.error(reason instanceof Error ? reason.message : "A busca nas APIs falhou.");
    } finally {
      setBuscando(false);
    }
  }

  function toggle(key: string) {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  async function salvar() {
    const escolhidas = fichas.filter((ficha) => selected.has(fichaKey(ficha)));
    if (escolhidas.length === 0) {
      toast.error("Escolha pelo menos um livro.");
      return;
    }
    setSaving(true);
    try {
      await Promise.all(
        escolhidas.map(async (ficha) => {
          const existente = matchAcervo(ficha, acervo);
          if (existente) {
            await api<{ livro: Livro }>(`/api/livros/${existente.id}`, {
              method: "PATCH",
              body: JSON.stringify({ statusLeitura: status }),
            });
            return;
          }
          await api<{ livro: Livro }>("/api/livros", {
            method: "POST",
            body: JSON.stringify({
              titulo: ficha.titulo,
              autor: ficha.autor.trim() || "Não informado",
              editora: ficha.editora,
              isbn: ficha.isbn,
              ano: ficha.ano ?? "",
              paginas: ficha.paginas ?? "",
              sinopse: ficha.sinopse,
              capaUrl: ficha.capaUrl,
              statusLeitura: status,
            }),
          });
        }),
      );
      toast.success(
        escolhidas.length === 1
          ? `Livro adicionado em ${labelStatus(status)}.`
          : `${escolhidas.length} livros adicionados em ${labelStatus(status)}.`,
      );
      onDone();
    } catch (reason) {
      toast.error(reason instanceof Error ? reason.message : "Não foi possível adicionar.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle>Adicionar à meta</DialogTitle>
        <DialogDescription>
          Busque título, autor ou ISBN nas APIs (Open Library, Google Books e outras) e marque a
          meta.
        </DialogDescription>
      </DialogHeader>

      <div className="grid gap-3">
        <div className="flex flex-wrap gap-2">
          {STATUS_META.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setStatus(item.id)}
              className={cn(
                "inline-flex h-8 items-center gap-2 rounded-lg px-3 text-sm",
                status === item.id
                  ? "text-white"
                  : "bg-secondary text-secondary-foreground hover:bg-accent",
              )}
              style={status === item.id ? { background: item.cor } : undefined}
            >
              <span className="h-2 w-2 rounded-full bg-current" aria-hidden />
              {item.label}
            </button>
          ))}
        </div>

        <form onSubmit={buscar} className="flex gap-2">
          <Input
            value={consulta}
            onChange={(event) => setConsulta(event.target.value)}
            placeholder="Título, autor ou ISBN"
            className="h-10"
          />
          <Button type="submit" disabled={buscando} className="shrink-0">
            {buscando ? "Buscando…" : "Buscar"}
          </Button>
        </form>

        {buscando ? <Skeleton className="h-40 w-full" /> : null}

        {!buscando && buscou && fichas.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Nada encontrado. Tente outro termo ou{" "}
            <Link href="/livros/novo" className="underline">
              cadastre à mão
            </Link>
            .
          </p>
        ) : null}

        {!buscando && fichas.length > 0 ? (
          <ul className="max-h-64 space-y-2 overflow-y-auto pr-1">
            {fichas.map((ficha) => {
              const key = fichaKey(ficha);
              const marcado = selected.has(key);
              const noAcervo = matchAcervo(ficha, acervo);
              return (
                <li key={key}>
                  <button
                    type="button"
                    onClick={() => toggle(key)}
                    className={cn(
                      "flex w-full items-center gap-3 rounded-xl p-2 text-left ring-1 transition-colors",
                      marcado
                        ? "bg-primary/10 ring-primary/30"
                        : "ring-foreground/10 hover:bg-accent",
                    )}
                  >
                    <Cover
                      titulo={ficha.titulo}
                      capaUrl={ficha.capaUrl}
                      statusLeitura={noAcervo?.statusLeitura}
                      className="h-14 w-10"
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-medium">{ficha.titulo}</span>
                      <span className="block truncate text-sm text-muted-foreground">
                        {[ficha.autor || "Sem autor", ficha.fonte].filter(Boolean).join(" · ")}
                        {ficha.ano ? ` · ${ficha.ano}` : ""}
                        {noAcervo
                          ? noAcervo.statusLeitura
                            ? ` · já na meta (${labelStatus(noAcervo.statusLeitura)})`
                            : " · já no acervo"
                          : ""}
                      </span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        ) : null}
      </div>

      <DialogFooter>
        <Button type="button" variant="outline" onClick={onDone}>
          Cancelar
        </Button>
        <Button type="button" onClick={salvar} disabled={saving || selected.size === 0}>
          {saving ? "Salvando…" : `Adicionar (${selected.size})`}
        </Button>
      </DialogFooter>
    </>
  );
}
