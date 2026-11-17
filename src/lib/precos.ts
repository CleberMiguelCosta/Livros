import { spawn } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { Oferta } from "./types";

const cache = new Map<string, { at: number; ofertas: Oferta[]; hasNext: boolean }>();
const CURL = process.platform === "win32" ? "curl.exe" : "curl";
const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";

const LIMITE_PAGINA = 12;
const MAX_PAGINA = 20;

export type PrecosResultado = {
  ofertas: Oferta[];
  page: number;
  hasNext: boolean;
  hasPrev: boolean;
};

export async function buscarPrecos(consulta: string, page = 1): Promise<PrecosResultado> {
  const pagina = Math.min(MAX_PAGINA, Math.max(1, Math.floor(page) || 1));
  const key = `${consulta.toLocaleLowerCase("pt-BR")}::${pagina}`;
  const cached = cache.get(key);
  if (cached && Date.now() - cached.at < 10 * 60 * 1000) {
    return {
      ofertas: cached.ofertas,
      page: pagina,
      hasPrev: pagina > 1,
      hasNext: cached.hasNext,
    };
  }

  const [amazonResult, mercadoResult] = await Promise.allSettled([
    buscarAmazon(consulta, pagina),
    buscarMercadoLivre(consulta, pagina),
  ]);

  const amazon = amazonResult.status === "fulfilled" ? amazonResult.value : [];
  const mercadoLivre = mercadoResult.status === "fulfilled" ? mercadoResult.value : [];

  if (amazonResult.status === "rejected" && mercadoResult.status === "rejected") {
    throw new Error("A busca de preços não respondeu agora.");
  }

  const ofertas = [...amazon, ...mercadoLivre].sort((a, b) => a.preco - b.preco);
  const hasNext =
    pagina < MAX_PAGINA &&
    (amazon.length >= Math.min(8, LIMITE_PAGINA) || mercadoLivre.length >= LIMITE_PAGINA);

  if (cache.size > 100) cache.clear();
  cache.set(key, { at: Date.now(), ofertas, hasNext });
  return { ofertas, page: pagina, hasPrev: pagina > 1, hasNext };
}

async function buscarAmazon(consulta: string, page: number): Promise<Oferta[]> {
  const url = new URL("https://www.amazon.com.br/s");
  url.searchParams.set("k", consulta);
  url.searchParams.set("i", "stripbooks");
  url.searchParams.set("page", String(page));
  if (url.hostname !== "www.amazon.com.br" || url.protocol !== "https:") {
    throw new Error("A busca de preços não respondeu agora.");
  }
  const html = await baixarPagina(url.toString());
  return parseAmazonLivros(html).slice(0, LIMITE_PAGINA);
}

async function buscarMercadoLivre(consulta: string, page: number): Promise<Oferta[]> {
  const token = (process.env.MERCADO_LIVRE_ACCESS_TOKEN ?? "").trim();
  const url = new URL("https://api.mercadolibre.com/sites/MLB/search");
  url.searchParams.set("q", consulta);
  url.searchParams.set("category", "MLB3025"); // Livros
  url.searchParams.set("limit", String(LIMITE_PAGINA));
  url.searchParams.set("offset", String((page - 1) * LIMITE_PAGINA));

  const headers: Record<string, string> = {
    accept: "application/json",
    "user-agent": USER_AGENT,
  };
  if (token) headers.authorization = `Bearer ${token}`;

  const response = await fetch(url, {
    headers,
    signal: AbortSignal.timeout(15000),
  });
  if (!response.ok) return [];
  const payload = (await response.json()) as { results?: unknown[] };
  if (!Array.isArray(payload.results)) return [];

  const ofertas: Oferta[] = [];
  const seen = new Set<string>();
  for (const item of payload.results) {
    if (!item || typeof item !== "object") continue;
    const row = item as Record<string, unknown>;
    const titulo = typeof row.title === "string" ? row.title.trim() : "";
    const preco = typeof row.price === "number" ? row.price : Number(row.price);
    const permalink = typeof row.permalink === "string" ? row.permalink : "";
    const thumbnail =
      typeof row.thumbnail === "string"
        ? row.thumbnail
        : typeof row.secure_thumbnail === "string"
          ? row.secure_thumbnail
          : "";
    const id = typeof row.id === "string" ? row.id : permalink;
    if (!titulo || !permalink.startsWith("https://") || !Number.isFinite(preco)) continue;
    if (preco <= 0 || preco > 20000 || seen.has(id)) continue;
    seen.add(id);
    ofertas.push({
      titulo: titulo.slice(0, 220),
      preco: Math.round(preco * 100) / 100,
      url: permalink.slice(0, 500),
      imagem: thumbnail.startsWith("http")
        ? thumbnail.replace(/^http:\/\//, "https://").slice(0, 500)
        : null,
      fonte: "Mercado Livre",
    });
  }
  return ofertas;
}

export function parseAmazonLivros(html: string): Oferta[] {
  const blocks = html.split('data-component-type="s-search-result"').slice(1);
  const seen = new Set<string>();
  const ofertas: Oferta[] = [];

  for (const block of blocks) {
    const asin =
      block.match(/\bdata-asin="([A-Z0-9]{10})"/)?.[1] ??
      block.match(/\/dp\/([A-Z0-9]{10})/)?.[1];
    const titleMatch =
      block.match(/<h2[^>]*aria-label="([^"]+)"/) ??
      block.match(/a-text-normal">([^<]{2,220})<\/span>/) ??
      block.match(/<span class="a-size-medium a-color-base a-text-normal">([^<]{2,220})<\/span>/);
    const priceMatch =
      block.match(/class="a-offscreen">\s*(R\$\s*[0-9.]*,[0-9]{2})/) ??
      block.match(/aria-label="[^"]*?((?:R\$|R\$\s)[0-9.]*,[0-9]{2})/);
    const image = block.match(
      /https:\/\/m\.media-amazon\.com\/images\/I\/[A-Za-z0-9%+._-]+/,
    )?.[0];
    if (!asin || !titleMatch || !priceMatch || seen.has(asin)) continue;

    const preco = parseBRL(priceMatch[1]);
    if (preco === null) continue;
    seen.add(asin);
    ofertas.push({
      titulo: limparTitulo(decode(titleMatch[1])).slice(0, 220),
      preco,
      url: `https://www.amazon.com.br/dp/${asin}`,
      imagem: image ?? null,
      fonte: "Amazon.com.br",
    });
  }

  return ofertas.sort((a, b) => a.preco - b.preco);
}

function limparTitulo(value: string) {
  return value.replace(/^Anúncio patrocinado\s*[–—-]\s*/i, "").trim();
}

function paginaDeBusca(html: string) {
  if (!html || html.length < 500) return false;
  if (html.includes("s-search-result") || html.includes("Nenhum resultado")) return true;
  return (html.match(/\/dp\/[A-Z0-9]{10}/g) ?? []).length >= 3;
}

async function baixarPagina(url: string) {
  let ultima = "";
  const metodos = [baixarComCurlSessao, baixarComFetch, baixarComCurlSimples];
  for (let tentativa = 0; tentativa < 4; tentativa += 1) {
    if (tentativa > 0) await esperar(800 * tentativa);
    for (const baixar of metodos) {
      try {
        const html = await baixar(url);
        if (paginaDeBusca(html)) return html;
        if (html.length > ultima.length) ultima = html;
      } catch {
        // próximo método
      }
    }
  }
  if (paginaDeBusca(ultima)) return ultima;
  throw new Error("A busca de preços não respondeu agora.");
}

function esperar(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Abre a home da Amazon para pegar cookies e só então busca — reduz bloqueio. */
function baixarComCurlSessao(url: string) {
  const dir = mkdtempSync(join(tmpdir(), "estante-amz-"));
  const jar = join(dir, "cookies.txt");
  const homeOut = join(dir, "home.html");
  writeFileSync(jar, "");
  return runCurl([
    "--silent",
    "--show-error",
    "--location",
    "--max-time",
    "20",
    "--compressed",
    "--proto",
    "=https",
    "--cookie-jar",
    jar,
    "--cookie",
    jar,
    "--user-agent",
    USER_AGENT,
    "--header",
    "Accept: text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "--header",
    "Accept-Language: pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7",
    "--output",
    homeOut,
    "--",
    "https://www.amazon.com.br/",
  ])
    .then(() =>
      runCurl([
        "--silent",
        "--show-error",
        "--location",
        "--max-time",
        "20",
        "--compressed",
        "--proto",
        "=https",
        "--cookie-jar",
        jar,
        "--cookie",
        jar,
        "--user-agent",
        USER_AGENT,
        "--header",
        "Accept: text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "--header",
        "Accept-Language: pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7",
        "--header",
        "Referer: https://www.amazon.com.br/",
        "--output",
        "-",
        "--",
        url,
      ]),
    )
    .finally(() => {
      try {
        rmSync(dir, { recursive: true, force: true });
      } catch {
        // ignore cleanup errors
      }
    });
}

function baixarComCurlSimples(url: string) {
  return runCurl([
    "--silent",
    "--show-error",
    "--location",
    "--max-time",
    "20",
    "--compressed",
    "--proto",
    "=https",
    "--output",
    "-",
    "--user-agent",
    USER_AGENT,
    "--header",
    "Accept: text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "--header",
    "Accept-Language: pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7",
    "--header",
    "Referer: https://www.amazon.com.br/",
    "--",
    url,
  ]);
}

function runCurl(args: string[]) {
  return new Promise<string>((resolve, reject) => {
    const child = spawn(CURL, args, {
      stdio: ["ignore", "pipe", "pipe"],
      windowsHide: true,
    });
    const chunks: Buffer[] = [];
    let size = 0;
    let failed = false;
    child.stdout.on("data", (chunk: Buffer) => {
      // --output NUL still can send little/no stdout; for "-" we collect.
      size += chunk.length;
      if (size > 2_000_000) {
        failed = true;
        child.kill();
        reject(new Error("A busca de preços não respondeu agora."));
        return;
      }
      chunks.push(chunk);
    });
    child.on("error", () => {
      if (!failed) {
        failed = true;
        reject(new Error("A busca de preços não respondeu agora."));
      }
    });
    child.on("close", (code) => {
      if (failed) return;
      if (code !== 0) {
        reject(new Error("A busca de preços não respondeu agora."));
        return;
      }
      resolve(Buffer.concat(chunks).toString("utf8"));
    });
  });
}

async function baixarComFetch(url: string) {
  const home = await fetch("https://www.amazon.com.br/", {
    redirect: "follow",
    signal: AbortSignal.timeout(15000),
    headers: browserHeaders(),
  });
  const cookie = collectCookies(home.headers);
  await home.arrayBuffer().catch(() => undefined);

  const response = await fetch(url, {
    redirect: "follow",
    signal: AbortSignal.timeout(20000),
    headers: {
      ...browserHeaders(),
      referer: "https://www.amazon.com.br/",
      ...(cookie ? { cookie } : {}),
    },
  });
  if (!response.ok) throw new Error("A busca de preços não respondeu agora.");
  const html = await response.text();
  if (html.length > 2_000_000) throw new Error("A busca de preços não respondeu agora.");
  return html;
}

function browserHeaders(): Record<string, string> {
  return {
    "user-agent": USER_AGENT,
    accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "accept-language": "pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7",
    "cache-control": "no-cache",
    "upgrade-insecure-requests": "1",
  };
}

function collectCookies(headers: Headers) {
  const raw =
    typeof headers.getSetCookie === "function"
      ? headers.getSetCookie()
      : [headers.get("set-cookie")].filter(Boolean);
  const parts = raw
    .flatMap((value) => (value ? [value.split(";", 1)[0].trim()] : []))
    .filter(Boolean);
  return parts.length > 0 ? parts.join("; ") : "";
}

function parseBRL(value: string) {
  const number = Number(value.replace(/[^\d,]/g, "").replace(/\./g, "").replace(",", "."));
  if (!Number.isFinite(number) || number <= 0 || number > 20000) return null;
  return Math.round(number * 100) / 100;
}

function decode(value: string) {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#(\d+);/g, (_, digits: string) => {
      const code = Number(digits);
      return code > 31 && code < 65536 ? String.fromCodePoint(code) : "";
    })
    .replace(/\s+/g, " ")
    .trim();
}
