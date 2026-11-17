"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { api } from "@/lib/api";
import type { Ficha, Livro } from "@/lib/types";
import { Cover } from "@/components/cover";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

type Draft = {
  titulo: string;
  autor: string;
  editora: string;
  isbn: string;
  ano: string;
  paginas: string;
  sinopse: string;
  capaUrl: string;
};

const emptyDraft = (): Draft => ({
  titulo: "",
  autor: "",
  editora: "",
  isbn: "",
  ano: "",
  paginas: "",
  sinopse: "",
  capaUrl: "",
});

function fromLivro(livro?: Livro): Draft {
  if (!livro) return emptyDraft();
  return {
    titulo: livro.titulo,
    autor: livro.autor,
    editora: livro.editora,
    isbn: livro.isbn,
    ano: livro.ano ? String(livro.ano) : "",
    paginas: livro.paginas ? String(livro.paginas) : "",
    sinopse: livro.sinopse,
    capaUrl: livro.capaUrl,
  };
}

function draftFromFicha(ficha: Ficha): Draft {
  return {
    titulo: ficha.titulo,
    autor: ficha.autor,
    editora: ficha.editora,
    isbn: ficha.isbn,
    ano: ficha.ano ? String(ficha.ano) : "",
    paginas: ficha.paginas ? String(ficha.paginas) : "",
    sinopse: ficha.sinopse,
    capaUrl: ficha.capaUrl,
  };
}

export function BookForm({
  mode,
  livro,
  onSaved,
}: {
  mode: "create" | "edit";
  livro?: Livro;
  onSaved?: (livro: Livro) => void;
}) {
  const router = useRouter();
  const [draft, setDraft] = useState<Draft>(() => fromLivro(livro));
  const [consulta, setConsulta] = useState(livro?.isbn || "");
  const [fichas, setFichas] = useState<Ficha[]>([]);
  const [buscando, setBuscando] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savingKey, setSavingKey] = useState("");

  function set<K extends keyof Draft>(key: K, value: Draft[K]) {
    setDraft((current) => ({ ...current, [key]: value }));
  }

  function applyFicha(ficha: Ficha) {
    setDraft(draftFromFicha(ficha));
    toast.success(
      ficha.capaUrl
        ? "Ficha e capa copiadas. Confira e salve na estante."
        : "Ficha copiada. Confira antes de salvar.",
    );
  }

  async function buscarFicha(event: React.FormEvent) {
    event.preventDefault();
    if (consulta.trim().length < 2) {
      toast.error("Digite um título, um autor ou um ISBN.");
      return;
    }
    setBuscando(true);
    try {
      const payload = await api<{ fichas: Ficha[] }>(
        `/api/catalogo?q=${encodeURIComponent(consulta.trim())}`,
      );
      setFichas(payload.fichas);
      if (payload.fichas.length === 0) {
        toast.message("Nenhuma ficha encontrada. Preencha à mão.");
      } else {
        toast.success(
          `${payload.fichas.length} ${payload.fichas.length === 1 ? "ficha" : "fichas"} encontradas nas APIs.`,
        );
      }
    } catch (reason) {
      toast.error(reason instanceof Error ? reason.message : "A busca da ficha falhou.");
    } finally {
      setBuscando(false);
    }
  }

  async function persist(payload: Draft, key = "form") {
    setSaving(true);
    setSavingKey(key);
    try {
      const response = await api<{ livro: Livro }>(
        mode === "create" ? "/api/livros" : `/api/livros/${livro?.id}`,
        {
          method: mode === "create" ? "POST" : "PATCH",
          body: JSON.stringify({
            titulo: payload.titulo,
            autor: payload.autor,
            editora: payload.editora,
            isbn: payload.isbn,
            ano: payload.ano,
            paginas: payload.paginas,
            sinopse: payload.sinopse,
            capaUrl: payload.capaUrl,
          }),
        },
      );
      toast.success(
        mode === "create"
          ? payload.capaUrl
            ? "Livro cadastrado com capa."
            : "Livro cadastrado na estante."
          : "Cadastro atualizado.",
      );
      if (onSaved) onSaved(response.livro);
      else router.push(`/livros/${response.livro.id}`);
    } catch (reason) {
      toast.error(reason instanceof Error ? reason.message : "Não foi possível salvar.");
    } finally {
      setSaving(false);
      setSavingKey("");
    }
  }

  async function salvar(event: React.FormEvent) {
    event.preventDefault();
    await persist(draft);
  }

  async function salvarFicha(ficha: Ficha) {
    if (!ficha.titulo.trim() || !ficha.autor.trim()) {
      applyFicha(ficha);
      toast.message("Complete o autor no formulário antes de salvar.");
      return;
    }
    const key = `${ficha.fonte}-${ficha.isbn}-${ficha.titulo}`;
    await persist(draftFromFicha(ficha), key);
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_18rem]">
      <div className="grid gap-6">
        <form onSubmit={buscarFicha} className="grid gap-3 rounded-2xl bg-card p-4 ring-1 ring-foreground/10">
          <div>
            <h2 className="font-heading text-xl">Buscar nas APIs</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Open Library, Google Books, BrasilAPI (ISBN) e ISBNdb (se houver chave) devolvem
              título, autor, editora e capa. Escolha uma ficha ou salve direto na estante.
            </p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Input
              value={consulta}
              onChange={(event) => setConsulta(event.target.value)}
              placeholder="Dom Casmurro ou 9788582850350"
              className="h-10"
              aria-label="Título, autor ou ISBN"
            />
            <Button type="submit" variant="secondary" size="lg" disabled={buscando}>
              {buscando ? "Buscando…" : "Buscar ficha"}
            </Button>
          </div>
          {fichas.length > 0 ? (
            <ul className="grid gap-2">
              {fichas.map((ficha) => {
                const key = `${ficha.fonte}-${ficha.isbn}-${ficha.titulo}`;
                return (
                  <li key={key}>
                    <div className="flex gap-3 rounded-xl p-2 ring-1 ring-foreground/10">
                      <button
                        type="button"
                        onClick={() => applyFicha(ficha)}
                        className="flex min-w-0 flex-1 gap-3 text-left transition-colors hover:opacity-90"
                      >
                        <Cover titulo={ficha.titulo} capaUrl={ficha.capaUrl} className="h-20 w-14" />
                        <span className="min-w-0">
                          <span className="block font-medium">{ficha.titulo}</span>
                          <span className="block text-sm text-muted-foreground">
                            {[ficha.autor, ficha.editora].filter(Boolean).join(" · ") ||
                              "Sem autor na ficha"}
                          </span>
                          <span className="mt-1 block text-xs tracking-wide text-muted-foreground uppercase">
                            {ficha.fonte}
                            {ficha.ano ? ` · ${ficha.ano}` : ""}
                            {ficha.capaUrl ? " · com capa" : ""}
                          </span>
                        </span>
                      </button>
                      {mode === "create" ? (
                        <Button
                          type="button"
                          size="sm"
                          className="self-center shrink-0"
                          disabled={saving}
                          onClick={() => salvarFicha(ficha)}
                        >
                          {saving && savingKey === key ? "Salvando…" : "Salvar"}
                        </Button>
                      ) : null}
                    </div>
                  </li>
                );
              })}
            </ul>
          ) : null}
        </form>

        <form onSubmit={salvar} className="grid gap-4">
          <Field label="Título" htmlFor="titulo">
            <Input
              id="titulo"
              value={draft.titulo}
              onChange={(event) => set("titulo", event.target.value)}
              className="h-10"
              required
            />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Autor" htmlFor="autor">
              <Input
                id="autor"
                value={draft.autor}
                onChange={(event) => set("autor", event.target.value)}
                className="h-10"
                required
              />
            </Field>
            <Field label="Editora" htmlFor="editora">
              <Input
                id="editora"
                value={draft.editora}
                onChange={(event) => set("editora", event.target.value)}
                className="h-10"
              />
            </Field>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="ISBN" htmlFor="isbn">
              <Input
                id="isbn"
                value={draft.isbn}
                onChange={(event) => set("isbn", event.target.value)}
                className="h-10"
                inputMode="numeric"
              />
            </Field>
            <Field label="Ano" htmlFor="ano">
              <Input
                id="ano"
                value={draft.ano}
                onChange={(event) => set("ano", event.target.value)}
                className="h-10"
                inputMode="numeric"
              />
            </Field>
            <Field label="Páginas" htmlFor="paginas">
              <Input
                id="paginas"
                value={draft.paginas}
                onChange={(event) => set("paginas", event.target.value)}
                className="h-10"
                inputMode="numeric"
              />
            </Field>
          </div>
          <Field label="Sinopse" htmlFor="sinopse">
            <Textarea
              id="sinopse"
              value={draft.sinopse}
              onChange={(event) => set("sinopse", event.target.value)}
              rows={5}
            />
          </Field>
          <div className="flex flex-wrap gap-2">
            <Button type="submit" size="lg" disabled={saving}>
              {saving && savingKey === "form"
                ? "Salvando…"
                : mode === "create"
                  ? "Salvar na estante"
                  : "Salvar alterações"}
            </Button>
            {mode === "edit" ? (
              <Button type="button" variant="outline" size="lg" onClick={() => onSaved?.(livro!)}>
                Cancelar
              </Button>
            ) : null}
          </div>
        </form>
      </div>

      <aside className="h-fit rounded-2xl bg-card p-4 ring-1 ring-foreground/10">
        <p className="text-xs tracking-[0.16em] text-muted-foreground uppercase">Prévia</p>
        <div className="mt-3 flex gap-3">
          <Cover titulo={draft.titulo || "Novo livro"} capaUrl={draft.capaUrl} />
          <div>
            <p className="font-heading text-xl leading-tight">{draft.titulo || "Sem título"}</p>
            <p className="mt-1 text-sm">{draft.autor || "Autor"}</p>
            <p className="text-sm text-muted-foreground">{draft.editora || "Editora"}</p>
            {draft.capaUrl ? (
              <p className="mt-2 text-xs text-muted-foreground">Capa da API pronta para salvar.</p>
            ) : (
              <p className="mt-2 text-xs text-muted-foreground">Busque uma ficha para trazer a capa.</p>
            )}
          </div>
        </div>
      </aside>
    </div>
  );
}

function Field({
  label,
  htmlFor,
  children,
}: {
  label: string;
  htmlFor: string;
  children: React.ReactNode;
}) {
  return (
    <div className="grid gap-1.5">
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
    </div>
  );
}
