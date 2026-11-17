import { mkdir, readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { PGlite } from "@electric-sql/pglite";
import pg from "pg";

const databaseUrl = process.env.DATABASE_URL?.trim() ?? "";

const globalDb = globalThis as unknown as {
  pgPool?: pg.Pool;
  pglite?: Promise<PGlite>;
};

export async function sql<T = Record<string, unknown>>(
  text: string,
  params: unknown[] = [],
): Promise<T[]> {
  if (databaseUrl !== "") {
    globalDb.pgPool ??= new pg.Pool({ connectionString: databaseUrl, max: 5 });
    const result = await globalDb.pgPool.query(text, params);
    return result.rows as T[];
  }

  globalDb.pglite ??= startLocal().catch((error: unknown) => {
    globalDb.pglite = undefined;
    throw error;
  });
  const db = await globalDb.pglite;
  const result = await db.query<T>(text, params);
  return result.rows;
}

async function startLocal(): Promise<PGlite> {
  const dir = path.join(process.cwd(), "data", "pglite");
  await mkdir(path.dirname(dir), { recursive: true });
  const db = new PGlite(dir);
  await db.waitReady;
  await db.exec(`
    create table if not exists schema_migrations (
      name text primary key,
      applied_at timestamptz not null default now()
    )
  `);

  const folder = path.join(process.cwd(), "migrations");
  const files = (await readdir(folder).catch(() => [] as string[]))
    .filter((file) => file.endsWith(".sql"))
    .sort();
  const applied = await db.query<{ name: string }>("select name from schema_migrations");
  const done = new Set(applied.rows.map((row) => row.name));

  for (const file of files) {
    if (done.has(file)) continue;
    await db.exec(await readFile(path.join(folder, file), "utf8"));
    await db.query("insert into schema_migrations (name) values ($1)", [file]);
  }

  return db;
}
