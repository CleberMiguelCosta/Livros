import { spawn } from "node:child_process";
import type { Oferta } from "./types";

const cache = new Map<string, { at: number; ofertas: Oferta[] }>();

export async function buscarPrecos(consulta: string): Promise<Oferta[]> {
  const key = consulta.toLocaleLowerCase("pt-BR");
  const cached = cache.get(key);
  if (cached && Date.now() - cached.at < 10 * 60 * 1000) return cached.ofertas;

  const url = new URL("https://www.amazon.com.br/s");
  url.searchParams.set("k", consulta);
  url.searchParams.set("i", "stripbooks");
  if (url.hostname !== "www.amazon.com.br" || url.protocol !== "https:") {
    throw new Error("A busca de preços não respondeu agora.");
  }

  const html = await baixarPagina(url.toString());
  const ofertas = parseAmazonLivros(html).slice(0, 12);
  if (cache.size > 100) cache.clear();
  cache.set(key, { at: Date.now(), ofertas });
  return ofertas;
}

export function parseAmazonLivros(html: string): Oferta[] {
  const blocks = html.split('data-component-type="s-search-result"').slice(1);
  const seen = new Set<string>();
  const ofertas: Oferta[] = [];

  for (const block of blocks) {
    const href = block.match(/href="(\/[^"]*\/dp\/[A-Z0-9]{10}[^"]*)"/)?.[1];
    const asin = href?.match(/\/dp\/([A-Z0-9]{10})/)?.[1];
    const titleMatch =
      block.match(/<h2[^>]*aria-label="([^"]+)"/) ??
      block.match(/a-text-normal">([^<]{2,220})<\/span>/);
    const priceMatch = block.match(/class="a-offscreen">\s*(R\$\s*[0-9.]*,[0-9]{2})/);
    const image = block.match(
      /https:\/\/m\.media-amazon\.com\/images\/I\/[A-Za-z0-9%+._-]+/,
    )?.[0];
    if (!asin || !titleMatch || !priceMatch || seen.has(asin)) continue;

    const preco = parseBRL(priceMatch[1]);
    if (preco === null) continue;
    seen.add(asin);
    ofertas.push({
      titulo: decode(titleMatch[1]).slice(0, 220),
      preco,
      url: `https://www.amazon.com.br/dp/${asin}`,
      imagem: image ?? null,
      fonte: "Amazon.com.br",
    });
  }

  return ofertas.sort((a, b) => a.preco - b.preco);
}

function paginaDeBusca(html: string) {
  return html.includes("s-search-result") || html.includes("Nenhum resultado");
}

async function baixarPagina(url: string) {
  let ultima = "";
  for (let tentativa = 0; tentativa < 3; tentativa += 1) {
    if (tentativa > 0) await esperar(900 * tentativa);
    try {
      const html = await baixarBusca(url);
      if (paginaDeBusca(html)) return html;
      ultima = html;
    } catch {
      ultima = "";
    }
  }
  if (paginaDeBusca(ultima)) return ultima;
  throw new Error("A busca de preços não respondeu agora.");
}

function esperar(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function baixarBusca(url: string) {
  return new Promise<string>((resolve, reject) => {
    const child = spawn(
      "curl",
      [
        "--silent",
        "--show-error",
        "--max-time",
        "15",
        "--compressed",
        "--proto",
        "=https",
        "--output",
        "-",
        "--user-agent",
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
        "--header",
        "Accept: text/html,application/xhtml+xml",
        "--header",
        "Accept-Language: pt-BR,pt;q=0.9",
        "--",
        url,
      ],
      { stdio: ["ignore", "pipe", "pipe"] },
    );

    const chunks: Buffer[] = [];
    let size = 0;
    let failed = false;
    child.stdout.on("data", (chunk: Buffer) => {
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
