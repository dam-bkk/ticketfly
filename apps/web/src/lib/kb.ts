import "server-only";
import { db, schema } from "@ticketfly/db";
import { and, asc, count, desc, eq, ilike, or, sql } from "drizzle-orm";

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

const STOP = new Set(["the", "and", "for", "with", "that", "this", "from", "have", "not", "are", "was", "but", "you", "your", "can", "cannot", "when", "what", "how", "does", "will", "still", "just", "please", "help", "issue", "problem", "working", "work", "need", "want", "also", "into", "onto", "about", "after", "before", "again", "does", "doesn", "don", "won", "isn", "wont", "dont"]);

/** Portal deflection: 2–3 published articles matching the words a requester is typing. Title hits outrank body hits. */
export async function suggestArticles(query: string, limit = 3) {
  const words = [...new Set(query.toLowerCase().replace(/[^a-z0-9\s-]/g, " ").split(/\s+/).filter((w) => w.length >= 4 && !STOP.has(w)))].slice(0, 8);
  if (!words.length) return [] as { id: number; title: string }[];
  const a = schema.kbArticles;
  const score = sql<number>`(${sql.join(words.map((w) => sql`(case when ${a.title} ilike ${"%" + w + "%"} then 3 else 0 end) + (case when ${a.body} ilike ${"%" + w + "%"} then 1 else 0 end)`), sql` + `)})`;
  return db
    .select({ id: a.id, title: a.title, score })
    .from(a)
    .where(and(eq(a.status, "published"), or(...words.map((w) => or(ilike(a.title, `%${w}%`), ilike(a.body, `%${w}%`))!))!))
    .orderBy(desc(score), desc(a.views))
    .limit(limit);
}
