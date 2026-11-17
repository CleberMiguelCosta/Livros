"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import { api } from "@/lib/api";
import type { Livro } from "@/lib/types";
import { BookForm } from "@/components/book-form";
import { Cover } from "@/components/cover";
import { PriceSearch } from "@/components/price-search";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "cn";

export function BookScreen() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [livro, setLivro] = useState<Livro | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    api<{ livro: Livro }>(`/api/livros/${params.id}`, { signal: controller.signal })
      .then((payload) => {
        setLivro(payload.livro);
        setLoading(false);
      })
      .catch((reason: unknown) => {
        if (controller.signal.aborted) return;
        setError(reason instanceof Error ? reason.message : "Não foi possível abrir a ficha.");
        setLoading(false);
      });
    return () => controller.abort();
  }, [params.id]);

  async function excluir() {
    if (!livro) return;
    setRemoving(true);
    try {
      await api<void>(`/api/livros/${livro.id}`, { method: "DELETE" });
      toast.success("Livro retirado da estante.");
      router.push("/");
    } catch (reason) {
      toast.error(reason instanceof Error ? reason.message : "Não foi possível excluir.");
      setRemoving(false);
    }
  }

  if (loading) {
    return (
      <div className="grid gap-4">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  if (error || !livro) {
    return (
      <div className="rounded-2xl bg-card px-5 py-8 ring-1 ring-foreground/10" role="alert">
        <h1 className="font-heading text-3xl">Ficha indisponível</h1>
        <p className="mt-2 text-sm text-muted-foreground">{error || "Esse livro não está na sua estante."}</p>
        <Link href="/" className={cn(buttonVariants({ variant: "outline" }), "mt-4")}>
          Voltar ao acervo
        </Link>
      </div>
    );
  }

  if (editing) {
    return (
      <div className="grid gap-4">
        <h1 className="font-heading text-4xl tracking-tight">Editar {livro.titulo}</h1>
        <BookForm
          mode="edit"
          livro={livro}
          onSaved={(saved) => {
            setLivro(saved);
            setEditing(false);
          }}
        />
      </div>
    );
  }

  return (
    <div className="grid gap-8">
      <article className="grid gap-6 rounded-2xl bg-card p-4 ring-1 ring-foreground/10 sm:p-6 md:grid-cols-[auto_minmax(0,1fr)]">
        <Cover titulo={livro.titulo} capaUrl={livro.capaUrl} className="h-52 w-36" />
        <div>
          <p className="text-xs tracking-[0.16em] text-muted-foreground uppercase">Ficha</p>
          <h1 className="mt-1 font-heading text-4xl leading-tight tracking-tight">{livro.titulo}</h1>
          <p className="mt-2 text-lg">{livro.autor}</p>
          <p className="text-muted-foreground">
            {livro.editora || "Editora não informada"}
            {livro.ano ? ` · ${livro.ano}` : ""}
            {livro.paginas ? ` · ${livro.paginas} páginas` : ""}
          </p>
          {livro.isbn ? <p className="mt-2 text-sm">ISBN {livro.isbn}</p> : null}
          {livro.sinopse ? <p className="mt-4 max-w-2xl text-sm leading-relaxed">{livro.sinopse}</p> : null}
          <div className="mt-5 flex flex-wrap gap-2">
            <Button type="button" onClick={() => setEditing(true)}>
              Editar
            </Button>
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger render={<Button variant="destructive" />}>Excluir</DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Excluir este livro?</DialogTitle>
                  <DialogDescription>
                    {livro.titulo} sai da estante. O cadastro não fica guardado.
                  </DialogDescription>
                </DialogHeader>
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                    Cancelar
                  </Button>
                  <Button type="button" variant="destructive" onClick={excluir} disabled={removing}>
                    {removing ? "Excluindo…" : "Excluir"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
            <Link href="/" className={cn(buttonVariants({ variant: "ghost" }))}>
              Acervo
            </Link>
          </div>
        </div>
      </article>

      <section className="grid gap-3">
        <div>
          <h2 className="font-heading text-3xl">Preços agora</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Busca de {livro.titulo} com {livro.autor} na Amazon.com.br.
          </p>
        </div>
        <PriceSearch initialQuery={`${livro.titulo} ${livro.autor}`} auto />
      </section>
    </div>
  );
}
