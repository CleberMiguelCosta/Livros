import type { Ficha } from "./types";

const USER_AGENT = "EstanteLivros/1.0 (biblioteca pessoal)";

export function isbnCompacto(value: string) {
  const compact = value.replace(/[-\s]/g, "").toUpperCase();
  if (/^\d{13}$/.test(compact) || /^\d{9}[\dX]$/.test(compact)) return compact;
  return null;
}

export async function buscarFichas(consulta: string): Promise<Ficha[]> {
  const isbn = isbnCompacto(consulta);
  const [biblioteca, agencia] = await Promise.all([
    searchOpenLibrary(isbn ? `isbn:${isbn}` : consulta),
    isbn ? searchBrasilApi(isbn) : Promise.resolve(null),
  ]);

  const fichas = [...biblioteca];
  if (agencia) {
    const index = fichas.findIndex((ficha) => ficha.isbn === agencia.isbn);
    if (index >= 0) fichas[index] = mergeFicha(fichas[index], agencia);
    else fichas.unshift(agencia);
  }
  return fichas.slice(0, 8);
}

async function searchOpenLibrary(q: string): Promise<Ficha[]> {
  const url = new URL("https://openlibrary.org/search.json");
  url.searchParams.set("q", q);
  url.searchParams.set("limit", "8");
  url.searchParams.set(
    "fields",
    "title,author_name,publisher,isbn,first_publish_year,cover_i,number_of_pages_median",
  );
  const response = await fetch(url, {
    headers: { accept: "application/json", "user-agent": USER_AGENT },
    signal: AbortSignal.timeout(12000),
  });
  if (!response.ok) return [];
  const payload = (await response.json()) as { docs?: unknown[] };
  if (!Array.isArray(payload.docs)) return [];
  return payload.docs.flatMap((doc) => {
    const ficha = fichaOpenLibrary(doc);
    return ficha ? [ficha] : [];
  });
}

function fichaOpenLibrary(doc: unknown): Ficha | null {
  if (!doc || typeof doc !== "object") return null;
  const record = doc as Record<string, unknown>;
  const titulo = text(record.title);
  if (!titulo) return null;
  const autores = strings(record.author_name);
  const editoras = strings(record.publisher);
  const isbns = strings(record.isbn);
  const isbn13 = isbns.find((item) => /^\d{13}$/.test(item));
  const cover = positiveInt(record.cover_i);
  const paginas = positiveInt(record.number_of_pages_median);
  return {
    titulo: titulo.slice(0, 200),
    autor: (autores[0] ?? "").slice(0, 160),
    editora: (editoras.find((item) => item.length <= 160) ?? "").slice(0, 160),
    isbn: isbn13 ?? isbns.find((item) => /^\d{9}[\dX]$/i.test(item)) ?? "",
    ano: year(record.first_publish_year),
    paginas: paginas && paginas <= 20000 ? paginas : null,
    sinopse: "",
    capaUrl: cover ? `https://covers.openlibrary.org/b/id/${cover}-L.jpg` : "",
    fonte: "Open Library",
  };
}

async function searchBrasilApi(isbn: string): Promise<Ficha | null> {
  const response = await fetch(`https://brasilapi.com.br/api/isbn/v1/${isbn}`, {
    headers: { accept: "application/json", "user-agent": USER_AGENT },
    signal: AbortSignal.timeout(12000),
  });
  if (!response.ok) return null;
  const record = (await response.json()) as Record<string, unknown>;
  const titulo = readableTitle(text(record.title));
  if (!titulo) return null;
  const autores = strings(record.authors);
  const capa = text(record.cover_url);
  return {
    titulo: titulo.slice(0, 200),
    autor: (autores[0] ?? "").slice(0, 160),
    editora: text(record.publisher).slice(0, 160),
    isbn,
    ano: year(record.year),
    paginas: (() => {
      const pages = positiveInt(record.page_count);
      return pages && pages <= 20000 ? pages : null;
    })(),
    sinopse: text(record.synopsis).slice(0, 4000),
    capaUrl: capa.startsWith("https://") ? capa.slice(0, 500) : "",
    fonte: "BrasilAPI",
  };
}

function mergeFicha(base: Ficha, agencia: Ficha): Ficha {
  return {
    titulo: agencia.titulo || base.titulo,
    autor: base.autor || agencia.autor,
    editora: agencia.editora || base.editora,
    isbn: agencia.isbn || base.isbn,
    ano: agencia.ano ?? base.ano,
    paginas: base.paginas ?? agencia.paginas,
    sinopse: agencia.sinopse || base.sinopse,
    capaUrl: base.capaUrl || agencia.capaUrl,
    fonte: "Open Library e BrasilAPI",
  };
}

function readableTitle(value: string) {
  if (value.length < 4 || value !== value.toUpperCase()) return value;
  const small = new Set(["de", "da", "do", "das", "dos", "e", "em", "a", "o", "as", "os", "para", "com"]);
  return value
    .toLocaleLowerCase("pt-BR")
    .split(/\s+/)
    .map((word, index) => {
      if (index > 0 && small.has(word)) return word;
      return word.charAt(0).toLocaleUpperCase("pt-BR") + word.slice(1);
    })
    .join(" ");
}

function text(value: unknown) {
  return typeof value === "string" ? value.replace(/\s+/g, " ").trim() : "";
}

function strings(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    const current = text(item);
    return current ? [current] : [];
  });
}

function positiveInt(value: unknown) {
  const number = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(number) || number < 1) return null;
  return Math.round(number);
}

function year(value: unknown) {
  const number = positiveInt(value);
  if (!number || number < 1000 || number > 2100) return null;
  return number;
}
