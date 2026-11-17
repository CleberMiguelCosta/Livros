import type { Oferta } from "./types";

export type ProdutoComparado = {
  id: string;
  titulo: string;
  imagem: string | null;
  menorPreco: number;
  maiorPreco: number;
  lojas: number;
  ofertas: Oferta[];
};

/** Agrupa anúncios parecidos (como no Buscapé) para comparar lojas no mesmo livro. */
export function agruparOfertas(ofertas: Oferta[]): ProdutoComparado[] {
  const grupos = new Map<string, Oferta[]>();

  for (const oferta of ofertas) {
    const chave = chaveProduto(oferta.titulo);
    const lista = grupos.get(chave) ?? [];
    lista.push(oferta);
    grupos.set(chave, lista);
  }

  const produtos: ProdutoComparado[] = [];
  for (const [, lista] of grupos) {
    const ordenadas = [...lista].sort((a, b) => a.preco - b.preco);
    const primeira = ordenadas[0];
    produtos.push({
      id: chaveProduto(primeira.titulo),
      titulo: escolherTitulo(ordenadas),
      imagem: ordenadas.find((item) => item.imagem)?.imagem ?? null,
      menorPreco: ordenadas[0].preco,
      maiorPreco: ordenadas[ordenadas.length - 1].preco,
      lojas: new Set(ordenadas.map((item) => item.fonte)).size,
      ofertas: ordenadas,
    });
  }

  return produtos.sort((a, b) => a.menorPreco - b.menorPreco);
}

function escolherTitulo(ofertas: Oferta[]) {
  return [...ofertas].sort((a, b) => a.titulo.length - b.titulo.length)[0]?.titulo ?? "";
}

function chaveProduto(titulo: string) {
  return titulo
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("pt-BR")
    .replace(/\b(livro|edicao|edição|capa|comum|dura|brochura|pocket|box|kit|vol|volume|ano)\b/g, " ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .split(/\s+/)
    .filter((word) => word.length > 1)
    .slice(0, 6)
    .join(" ");
}
