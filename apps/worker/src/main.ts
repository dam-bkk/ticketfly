// Worker entry: scheduled jobs (SLA clocks, mail polling, MS sync, offboarding). Same image as web, different CMD.
import { db, schema } from "@ticketfly/db";
import { sql } from "drizzle-orm";

async function heartbeat() {
  const [row] = await db.select({ now: sql<string>`now()` }).from(schema.releases).limit(1);
  console.log(JSON.stringify({ level: "info", job: "heartbeat", at: row?.now ?? new Date().toISOString() }));
}

heartbeat().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
