import { json, requireOwner, tooMany } from "@/lib/auth";
import { buscarFichas, isbnCompacto } from "@/lib/catalogo";
import { consultaLimpa } from "@/lib/format";

export async function GET(request: Request) {
  const owner = await requireOwner(request);
  if (owner instanceof Response) return owner;
  if (tooMany(`catalogo:${owner.ownerId}`)) {
    return json({ error: "Muitas consultas seguidas. Espere um instante e tente de novo." }, 429);
  }

  const consulta = (new URL(request.url).searchParams.get("q") ?? "").trim().slice(0, 160);
  if (!isbnCompacto(consulta) && consultaLimpa(consulta).length < 2) {
    return json({ error: "Digite um título, um autor ou um ISBN." }, 400);
  }

  try {
    const fichas = await buscarFichas(consulta);
    return json({ fichas });
  } catch {
    return json({ error: "A ficha catalográfica não respondeu agora." }, 502);
  }
}
