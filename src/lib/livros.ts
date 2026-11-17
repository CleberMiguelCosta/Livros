import { sql } from "./db";
import type { Livro } from "./types";

const MAX_LIVROS = 2000;

type LivroRow = {
  id: string;
  titulo: string;
  autor: string;
  editora: string;
  isbn: string;
  ano: number | null;
  paginas: number | null;
  sinopse: string;
  capa_url: string;
  created_at: Date | string;
  updated_at: Date | string;
};

export type LivroInput = {
  titulo: string;
  autor: string;
  editora: string;
  isbn: string;
  ano: number | null;
  paginas: number | null;
  sinopse: string;
  capaUrl: string;
};

export function toLivro(row: LivroRow): Livro {
  return {
    id: row.id,
    titulo: row.titulo,
    autor: row.autor,
    editora: row.editora,
    isbn: row.isbn,
    ano: row.ano === null ? null : Number(row.ano),
    paginas: row.paginas === null ? null : Number(row.paginas),
    sinopse: row.sinopse,
    capaUrl: row.capa_url,
    createdAt: new Date(row.created_at).toISOString(),
    updatedAt: new Date(row.updated_at).toISOString(),
  };
}

function plain(value: string) {
  return value
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function httpsUrl(value: string) {
  if (!value) return "";
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return "";
  }
  if (url.protocol !== "https:" || url.username || url.password) return "";
  return url.toString().slice(0, 500);
}

export function parseLivro(body: unknown): { value: LivroInput } | { error: string } {
  if (!body || typeof body !== "object") return { error: "Envie os dados do livro em JSON." };
  const record = body as Record<string, unknown>;
  const titulo = plain(String(record.titulo ?? ""));
  const autor = plain(String(record.autor ?? ""));
  const editora = plain(String(record.editora ?? ""));
  const isbn = plain(String(record.isbn ?? "")).replace(/[^\dXx-]/g, "").toUpperCase();
  const sinopse = plain(String(record.sinopse ?? ""));
  const capaUrl = httpsUrl(plain(String(record.capaUrl ?? "")));

  if (titulo.length < 1 || titulo.length > 200) {
    return { error: "Informe o título, com até 200 caracteres." };
  }
  if (autor.length < 1 || autor.length > 160) {
    return { error: "Informe o autor, com até 160 caracteres." };
  }
  if (editora.length > 160) return { error: "A editora pode ter até 160 caracteres." };
  if (isbn.length > 20) return { error: "O ISBN está longo demais." };
  if (sinopse.length > 4000) return { error: "A sinopse pode ter até 4000 caracteres." };

  const ano = optionalInt(record.ano, 1000, 2100, "O ano");
  if (typeof ano === "string") return { error: ano };
  const paginas = optionalInt(record.paginas, 1, 20000, "O número de páginas");
  if (typeof paginas === "string") return { error: paginas };

  return {
    value: { titulo, autor, editora, isbn, ano, paginas, sinopse, capaUrl },
  };
}

function optionalInt(
  value: unknown,
  min: number,
  max: number,
  label: string,
): number | null | string {
  if (value === null || value === undefined || value === "") return null;
  const number = typeof value === "number" ? value : Number(String(value).trim());
  if (!Number.isInteger(number) || number < min || number > max) {
    return `${label} precisa ser um número entre ${min} e ${max}.`;
  }
  return number;
}

function likePattern(value: string) {
  return `%${value.replace(/[\\%_]/g, (char) => `\\${char}`)}%`;
}

export async function listarLivros(
  ownerId: string,
  filtros: { autor: string; editora: string; q: string },
) {
  const autor = filtros.autor.trim() || null;
  const editora = filtros.editora.trim() || null;
  const q = filtros.q.trim();
  const busca = q ? likePattern(q.slice(0, 120)) : null;

  const [rows, opcoes, totais] = await Promise.all([
    sql<LivroRow>(
      `select id, titulo, autor, editora, isbn, ano, paginas, sinopse, capa_url, created_at, updated_at
       from livros
       where owner_id = $1
         and ($2::text is null or autor = $2)
         and ($3::text is null or editora = $3)
         and (
           $4::text is null
           or titulo ilike $4 escape '\\'
           or autor ilike $4 escape '\\'
           or editora ilike $4 escape '\\'
           or isbn ilike $4 escape '\\'
         )
       order by autor asc, titulo asc, id asc`,
      [ownerId, autor, editora, busca],
    ),
    sql<{ autor: string; editora: string }>(
      "select autor, editora from livros where owner_id = $1",
      [ownerId],
    ),
    sql<{ total: number }>("select count(*)::int as total from livros where owner_id = $1", [ownerId]),
  ]);

  const autores = [...new Set(opcoes.map((row) => row.autor).filter(Boolean))].sort((a, b) =>
    a.localeCompare(b, "pt-BR"),
  );
  const editoras = [...new Set(opcoes.map((row) => row.editora).filter(Boolean))].sort((a, b) =>
    a.localeCompare(b, "pt-BR"),
  );

  return {
    livros: rows.map(toLivro),
    autores,
    editoras,
    total: Number(totais[0]?.total ?? 0),
    filtrados: rows.length,
  };
}

export async function obterLivro(ownerId: string, id: string) {
  const rows = await sql<LivroRow>(
    `select id, titulo, autor, editora, isbn, ano, paginas, sinopse, capa_url, created_at, updated_at
     from livros where id = $1 and owner_id = $2`,
    [id, ownerId],
  );
  return rows[0] ? toLivro(rows[0]) : null;
}

export async function criarLivro(ownerId: string, input: LivroInput) {
  const totais = await sql<{ total: number }>(
    "select count(*)::int as total from livros where owner_id = $1",
    [ownerId],
  );
  if (Number(totais[0]?.total ?? 0) >= MAX_LIVROS) {
    return { error: "A estante chegou ao limite de 2000 livros." as const };
  }
  const rows = await sql<LivroRow>(
    `insert into livros (id, owner_id, titulo, autor, editora, isbn, ano, paginas, sinopse, capa_url)
     values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
     returning id, titulo, autor, editora, isbn, ano, paginas, sinopse, capa_url, created_at, updated_at`,
    [
      crypto.randomUUID(),
      ownerId,
      input.titulo,
      input.autor,
      input.editora,
      input.isbn,
      input.ano,
      input.paginas,
      input.sinopse,
      input.capaUrl,
    ],
  );
  return { livro: toLivro(rows[0]) };
}

export async function atualizarLivro(ownerId: string, id: string, input: LivroInput) {
  const rows = await sql<LivroRow>(
    `update livros
     set titulo = $3, autor = $4, editora = $5, isbn = $6, ano = $7, paginas = $8,
         sinopse = $9, capa_url = $10, updated_at = now()
     where id = $1 and owner_id = $2
     returning id, titulo, autor, editora, isbn, ano, paginas, sinopse, capa_url, created_at, updated_at`,
    [
      id,
      ownerId,
      input.titulo,
      input.autor,
      input.editora,
      input.isbn,
      input.ano,
      input.paginas,
      input.sinopse,
      input.capaUrl,
    ],
  );
  return rows[0] ? toLivro(rows[0]) : null;
}

export async function excluirLivro(ownerId: string, id: string) {
  const rows = await sql<{ id: string }>(
    "delete from livros where id = $1 and owner_id = $2 returning id",
    [id, ownerId],
  );
  return rows.length > 0;
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function idValido(id: string) {
  return UUID.test(id);
}
