import { json, requireOwner, tooMany } from "@/lib/auth";
import { consultaLimpa } from "@/lib/format";
import { buscarPrecos } from "@/lib/precos";

export async function GET(request: Request) {
  const owner = await requireOwner(request);
  if (owner instanceof Response) return owner;
  if (tooMany(`precos:${owner.ownerId}`)) {
    return json({ error: "Muitas consultas de preço seguidas. Espere um instante e tente de novo." }, 429);
  }

  const consulta = consultaLimpa(new URL(request.url).searchParams.get("q") ?? "");
  if (consulta.length < 2) {
    return json({ error: "Digite o título ou o autor para procurar preços." }, 400);
  }

  try {
    const ofertas = await buscarPrecos(consulta);
    return json({
      consulta,
      fonte: "Amazon.com.br",
      ofertas,
      aviso:
        ofertas.length === 0
          ? "Nenhuma oferta de livro apareceu nessa busca. Tente o título com o autor."
          : "Valores da busca pública de livros na Amazon.com.br. O anúncio pode mudar.",
    });
  } catch {
    return json(
      { error: "A busca de preços não respondeu agora. Tente de novo em alguns instantes." },
      502,
    );
  }
}
