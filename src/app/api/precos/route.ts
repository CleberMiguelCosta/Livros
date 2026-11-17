import { json, requireOwner, tooMany } from "@/lib/auth";
import { consultaLimpa } from "@/lib/format";
import { buscarPrecos } from "@/lib/precos";

export async function GET(request: Request) {
  const owner = await requireOwner(request);
  if (owner instanceof Response) return owner;
  if (tooMany(`precos:${owner.ownerId}`)) {
    return json({ error: "Muitas consultas de preço seguidas. Espere um instante e tente de novo." }, 429);
  }

  const params = new URL(request.url).searchParams;
  const consulta = consultaLimpa(params.get("q") ?? "");
  const page = Number(params.get("page") ?? "1");
  if (consulta.length < 2) {
    return json({ error: "Digite o título ou o autor para procurar preços." }, 400);
  }

  try {
    const resultado = await buscarPrecos(consulta, page);
    const fontes = Array.from(new Set(resultado.ofertas.map((oferta) => oferta.fonte)));
    return json({
      consulta,
      fonte: fontes.length > 0 ? fontes.join(" · ") : "Amazon.com.br",
      ofertas: resultado.ofertas,
      page: resultado.page,
      hasNext: resultado.hasNext,
      hasPrev: resultado.hasPrev,
      aviso:
        resultado.ofertas.length === 0
          ? "Nenhuma oferta de livro apareceu nessa busca. Tente o título com o autor."
          : fontes.includes("Mercado Livre")
            ? "Valores da Amazon.com.br e do Mercado Livre. O anúncio pode mudar."
            : "Valores da busca pública de livros na Amazon.com.br. O anúncio pode mudar.",
    });
  } catch {
    return json(
      { error: "A busca de preços não respondeu agora. Tente de novo em alguns instantes." },
      502,
    );
  }
}
