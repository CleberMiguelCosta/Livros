import { acceptsJson, json, requireOwner } from "@/lib/auth";
import { criarLivro, listarLivros, parseLivro } from "@/lib/livros";

export async function GET(request: Request) {
  const owner = await requireOwner(request);
  if (owner instanceof Response) return owner;

  const url = new URL(request.url);
  const acervo = await listarLivros(owner.ownerId, {
    autor: url.searchParams.get("autor") ?? "",
    editora: url.searchParams.get("editora") ?? "",
    q: url.searchParams.get("q") ?? "",
    status: url.searchParams.get("status") ?? "",
  });
  return json(acervo);
}

export async function POST(request: Request) {
  if (!acceptsJson(request)) return json({ error: "Envie o cadastro em JSON." }, 415);
  const owner = await requireOwner(request);
  if (owner instanceof Response) return owner;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return json({ error: "O cadastro enviado não é um JSON válido." }, 400);
  }
  const parsed = parseLivro(body);
  if ("error" in parsed) return json({ error: parsed.error }, 400);

  const created = await criarLivro(owner.ownerId, parsed.value);
  if ("error" in created) return json({ error: created.error }, 409);
  return json({ livro: created.livro }, 201);
}
