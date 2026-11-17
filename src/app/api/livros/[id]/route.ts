import { acceptsJson, json, requireOwner } from "@/lib/auth";
import { atualizarLivro, excluirLivro, idValido, obterLivro, parseLivro } from "@/lib/livros";

type Context = { params: Promise<{ id: string }> };

export async function GET(request: Request, context: Context) {
  const owner = await requireOwner(request);
  if (owner instanceof Response) return owner;
  const { id } = await context.params;
  if (!idValido(id)) return json({ error: "Livro não encontrado." }, 404);
  const livro = await obterLivro(owner.ownerId, id);
  if (!livro) return json({ error: "Livro não encontrado." }, 404);
  return json({ livro });
}

export async function PATCH(request: Request, context: Context) {
  if (!acceptsJson(request)) return json({ error: "Envie o cadastro em JSON." }, 415);
  const owner = await requireOwner(request);
  if (owner instanceof Response) return owner;
  const { id } = await context.params;
  if (!idValido(id)) return json({ error: "Livro não encontrado." }, 404);

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return json({ error: "O cadastro enviado não é um JSON válido." }, 400);
  }
  const parsed = parseLivro(body);
  if ("error" in parsed) return json({ error: parsed.error }, 400);
  const livro = await atualizarLivro(owner.ownerId, id, parsed.value);
  if (!livro) return json({ error: "Livro não encontrado." }, 404);
  return json({ livro });
}

export async function DELETE(request: Request, context: Context) {
  if (!acceptsJson(request)) return json({ error: "Envie a exclusão em JSON." }, 415);
  const owner = await requireOwner(request);
  if (owner instanceof Response) return owner;
  const { id } = await context.params;
  if (!idValido(id)) return json({ error: "Livro não encontrado." }, 404);
  const removed = await excluirLivro(owner.ownerId, id);
  if (!removed) return json({ error: "Livro não encontrado." }, 404);
  return new Response(null, { status: 204, headers: { "cache-control": "private, no-store" } });
}
