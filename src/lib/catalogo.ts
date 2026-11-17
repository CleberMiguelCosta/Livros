import type { Ficha } from "./types";

const USER_AGENT = "EstanteLivros/1.0 (biblioteca pessoal)";

export function isbnCompacto(value: string) {
  const compact = value.replace(/[-\s]/g, "").toUpperCase();
  if (/^\d{13}$/.test(compact) || /^\d{9}[\dX]$/.test(compact)) return compact;
  return null;
}

export async function buscarFichas(consulta: string): Promise<Ficha[]> {
  const isbn = isbnCompacto(consulta);
  const googleKey = env("GOOGLE_BOOKS_API_KEY");
  const isbnDbKey = env("ISBNDB_API_KEY");

  const [openLibrary, brasil, google, isbnDb] = await Promise.all([
    searchOpenLibrary(isbn ? `isbn:${isbn}` : consulta).catch(() => [] as Ficha[]),
    isbn ? searchBrasilApi(isbn).catch(() => null) : Promise.resolve(null),
    searchGoogleBooks(isbn ? `isbn:${isbn}` : consulta, googleKey).catch(() => [] as Ficha[]),
    isbnDbKey
      ? searchIsbnDb(consulta, isbn, isbnDbKey).catch(() => [] as Ficha[])
      : Promise.resolve([] as Ficha[]),
  ]);

  const fichas: Ficha[] = [];
  for (const lista of [openLibrary, google, isbnDb]) {
    for (const ficha of lista) adicionarFicha(fichas, ficha);
  }
  if (brasil) adicionarFicha(fichas, brasil);

  return ranquearFichas(fichas).slice(0, 12);
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
    signal: AbortSignal.timeout(15000),
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
    signal: AbortSignal.timeout(15000),
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

async function searchGoogleBooks(q: string, apiKey: string): Promise<Ficha[]> {
  const url = new URL("https://www.googleapis.com/books/v1/volumes");
  url.searchParams.set("q", q);
  url.searchParams.set("maxResults", "8");
  url.searchParams.set("printType", "books");
  if (apiKey) url.searchParams.set("key", apiKey);

  const response = await fetch(url, {
    headers: { accept: "application/json", "user-agent": USER_AGENT },
    signal: AbortSignal.timeout(15000),
  });
  if (!response.ok) return [];
  const payload = (await response.json()) as { items?: unknown[] };
  if (!Array.isArray(payload.items)) return [];
  return payload.items.flatMap((item) => {
    const ficha = fichaGoogleBooks(item);
    return ficha ? [ficha] : [];
  });
}

function fichaGoogleBooks(item: unknown): Ficha | null {
  if (!item || typeof item !== "object") return null;
  const volume = (item as { volumeInfo?: unknown }).volumeInfo;
  if (!volume || typeof volume !== "object") return null;
  const info = volume as Record<string, unknown>;
  const titulo = text(info.title);
  if (!titulo) return null;
  const autores = strings(info.authors);
  const identifiers = Array.isArray(info.industryIdentifiers)
    ? info.industryIdentifiers
    : [];
  let isbn = "";
  for (const entry of identifiers) {
    if (!entry || typeof entry !== "object") continue;
    const row = entry as Record<string, unknown>;
    const type = text(row.type);
    const id = text(row.identifier).replace(/[-\s]/g, "").toUpperCase();
    if (type === "ISBN_13" && /^\d{13}$/.test(id)) {
      isbn = id;
      break;
    }
    if (!isbn && type === "ISBN_10" && /^\d{9}[\dX]$/.test(id)) isbn = id;
  }
  const imageLinks =
    info.imageLinks && typeof info.imageLinks === "object"
      ? (info.imageLinks as Record<string, unknown>)
      : {};
  const capa = httpsUrl(text(imageLinks.thumbnail) || text(imageLinks.smallThumbnail));
  const published = text(info.publishedDate);
  const anoMatch = published.match(/^(\d{4})/);
  const paginas = positiveInt(info.pageCount);
  return {
    titulo: titulo.slice(0, 200),
    autor: (autores[0] ?? "").slice(0, 160),
    editora: text(info.publisher).slice(0, 160),
    isbn,
    ano: anoMatch ? year(anoMatch[1]) : null,
    paginas: paginas && paginas <= 20000 ? paginas : null,
    sinopse: text(info.description).slice(0, 4000),
    capaUrl: capa,
    fonte: "Google Books",
  };
}

async function searchIsbnDb(consulta: string, isbn: string | null, apiKey: string): Promise<Ficha[]> {
  const path = isbn
    ? `https://api2.isbndb.com/book/${encodeURIComponent(isbn)}`
    : `https://api2.isbndb.com/books/${encodeURIComponent(consulta.slice(0, 150))}?page=1&pageSize=8`;
  const response = await fetch(path, {
    headers: {
      accept: "application/json",
      authorization: apiKey,
      "user-agent": USER_AGENT,
    },
    signal: AbortSignal.timeout(15000),
  });
  if (!response.ok) return [];
  const payload = (await response.json()) as { book?: unknown; books?: unknown[] };
  if (payload.book) {
    const ficha = fichaIsbnDb(payload.book);
    return ficha ? [ficha] : [];
  }
  if (!Array.isArray(payload.books)) return [];
  return payload.books.flatMap((book) => {
    const ficha = fichaIsbnDb(book);
    return ficha ? [ficha] : [];
  });
}

function fichaIsbnDb(book: unknown): Ficha | null {
  if (!book || typeof book !== "object") return null;
  const record = book as Record<string, unknown>;
  const titulo = text(record.title) || text(record.title_long);
  if (!titulo) return null;
  const autores = strings(record.authors);
  const isbn =
    isbnCompacto(text(record.isbn13)) ||
    isbnCompacto(text(record.isbn)) ||
    "";
  const capa = httpsUrl(text(record.image) || text(record.image_original));
  const published = text(record.date_published);
  const anoMatch = published.match(/(\d{4})/);
  const paginas = positiveInt(record.pages);
  return {
    titulo: titulo.slice(0, 200),
    autor: (autores[0] ?? "").slice(0, 160),
    editora: text(record.publisher).slice(0, 160),
    isbn: isbn ?? "",
    ano: anoMatch ? year(anoMatch[1]) : null,
    paginas: paginas && paginas <= 20000 ? paginas : null,
    sinopse: text(record.synopsis || record.overview).slice(0, 4000),
    capaUrl: capa,
    fonte: "ISBNdb",
  };
}

function adicionarFicha(fichas: Ficha[], nova: Ficha) {
  const chaveIsbn = nova.isbn ? `isbn:${nova.isbn}` : "";
  const chaveTitulo = `t:${normalizar(nova.titulo)}|a:${normalizar(nova.autor)}`;
  const index = fichas.findIndex((atual) => {
    if (chaveIsbn && atual.isbn && atual.isbn === nova.isbn) return true;
    return `t:${normalizar(atual.titulo)}|a:${normalizar(atual.autor)}` === chaveTitulo;
  });
  if (index < 0) {
    fichas.push(nova);
    return;
  }
  fichas[index] = mergeFicha(fichas[index], nova);
}

function mergeFicha(base: Ficha, extra: Ficha): Ficha {
  const fontes = Array.from(
    new Set(
      [...base.fonte.split(" · "), ...extra.fonte.split(" · ")]
        .map((item) => item.trim())
        .filter(Boolean),
    ),
  );
  return {
    titulo: preferir(base.titulo, extra.titulo),
    autor: preferir(base.autor, extra.autor),
    editora: preferir(base.editora, extra.editora),
    isbn: preferir(base.isbn, extra.isbn),
    ano: base.ano ?? extra.ano,
    paginas: base.paginas ?? extra.paginas,
    sinopse: preferir(base.sinopse, extra.sinopse),
    capaUrl: preferir(base.capaUrl, extra.capaUrl),
    fonte: fontes.join(" · "),
  };
}

function ranquearFichas(fichas: Ficha[]) {
  return [...fichas].sort((a, b) => scoreFicha(b) - scoreFicha(a));
}

function scoreFicha(ficha: Ficha) {
  let score = 0;
  if (ficha.capaUrl) score += 5;
  if (ficha.autor) score += 2;
  if (ficha.isbn) score += 2;
  if (ficha.editora) score += 1;
  if (ficha.sinopse) score += 1;
  return score;
}

function preferir(primary: string, secondary: string) {
  return primary.trim() ? primary : secondary;
}

function normalizar(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("pt-BR")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function httpsUrl(value: string) {
  if (!value) return "";
  const candidate = value.startsWith("http://") ? `https://${value.slice("http://".length)}` : value;
  if (!candidate.startsWith("https://")) return "";
  return candidate.slice(0, 500);
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

function env(name: string) {
  return typeof process !== "undefined" ? (process.env[name] ?? "").trim() : "";
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
