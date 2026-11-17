import { acceptsJson, json, requireOwner } from "@/lib/auth";
import { buscarFichas } from "@/lib/catalogo";
import { CLASSICOS } from "@/lib/exemplos";
import { criarLivro, listarLivros } from "@/lib/livros";

export async function POST(request: Request) {
  if (!acceptsJson(request)) return json({ error: "Envie a inclusão em JSON." }, 415);
  const owner = await requireOwner(request);
  if (owner instanceof Response) return owner;

  const atual = await listarLivros(owner.ownerId, { autor: "", editora: "", q: "" });
  const existentes = new Set(atual.livros.map((livro) => chave(livro.titulo, livro.autor)));
  let adicionados = 0;

  for (const classico of CLASSICOS) {
    if (existentes.has(chave(classico.titulo, classico.autor))) continue;
    const ficha = await primeiraFicha(classico.titulo, classico.autor);
    const created = await criarLivro(owner.ownerId, {
      titulo: classico.titulo,
      autor: classico.autor,
      editora: classico.editora,
      isbn: ficha?.isbn ?? "",
      ano: classico.ano,
      paginas: ficha?.paginas ?? null,
      sinopse: ficha?.sinopse ?? "",
      capaUrl: ficha?.capaUrl ?? "",
    });
    if ("livro" in created) {
      adicionados += 1;
      existentes.add(chave(classico.titulo, classico.autor));
    }
  }

  return json({ adicionados });
}

async function primeiraFicha(titulo: string, autor: string) {
  try {
    const fichas = await buscarFichas(`${titulo} ${autor}`);
    return (
      fichas.find((ficha) => ficha.autor.toLocaleLowerCase("pt-BR").includes(autor.split(" ")[0].toLocaleLowerCase("pt-BR"))) ??
      fichas[0] ??
      null
    );
  } catch {
    return null;
  }
}

function chave(titulo: string, autor: string) {
  return `${titulo}::${autor}`.toLocaleLowerCase("pt-BR");
}
