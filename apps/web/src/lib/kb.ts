import "server-only";
import { db, schema } from "@ticketfly/db";
import { and, asc, count, desc, eq, ilike, or } from "drizzle-orm";

export async function listFolders() {
  const rows = await db
    .select({ f: schema.kbFolders, n: count(schema.kbArticles.id) })
    .from(schema.kbFolders)
    .leftJoin(schema.kbArticles, eq(schema.kbArticles.folderId, schema.kbFolders.id))
    .groupBy(schema.kbFolders.id)
    .orderBy(asc(schema.kbFolders.category), asc(schema.kbFolders.name));
  const byCategory = new Map<string, typeof rows>();
  for (const r of rows) byCategory.set(r.f.category, [...(byCategory.get(r.f.category) ?? []), r]);
  return [...byCategory.entries()];
}

export async function listArticles(opts: { folderId?: number; q?: string; status?: string }) {
  const a = schema.kbArticles;
  const conds = [];
  if (opts.folderId) conds.push(eq(a.folderId, opts.folderId));
  if (opts.status) conds.push(eq(a.status, opts.status));
  if (opts.q) conds.push(or(ilike(a.title, `%${opts.q}%`), ilike(a.body, `%${opts.q}%`))!);
  return db
    .select({ a, author: schema.people.displayName, folder: schema.kbFolders.name, category: schema.kbFolders.category })
    .from(a)
    .leftJoin(schema.people, eq(schema.people.id, a.authorId))
    .leftJoin(schema.kbFolders, eq(schema.kbFolders.id, a.folderId))
    .where(conds.length ? and(...conds) : undefined)
    .orderBy(desc(a.updatedAt))
    .limit(200);
}

export async function getArticle(id: number) {
  const [row] = await db
    .select({ a: schema.kbArticles, author: schema.people.displayName, folder: schema.kbFolders.name, category: schema.kbFolders.category })
    .from(schema.kbArticles)
    .leftJoin(schema.people, eq(schema.people.id, schema.kbArticles.authorId))
    .leftJoin(schema.kbFolders, eq(schema.kbFolders.id, schema.kbArticles.folderId))
    .where(eq(schema.kbArticles.id, id))
    .limit(1);
  return row ?? null;
}
