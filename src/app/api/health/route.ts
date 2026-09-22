import { db } from "@/db";
import { sql } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const raw = process.env.DATABASE_URL;
    const parsed = raw ? new URL(raw) : null;

    console.error("DATABASE_RUNTIME_INFO", {
      present: Boolean(raw),
      protocol: parsed?.protocol,
      hostname: parsed?.hostname,
      port: parsed?.port,
      pathname: parsed?.pathname,
      username: parsed?.username,
    });

    await db.execute(sql`select 1`);
    return Response.json({ ok: true });
  } catch (error) {
    console.error("HEALTH_DATABASE_ERROR", error);
    return Response.json({ ok: false }, { status: 500 });
  }
}
