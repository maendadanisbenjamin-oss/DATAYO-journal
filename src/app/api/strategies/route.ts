import { NextResponse } from "next/server";
import { and, asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { strategies } from "@/db/schema";
import { requireUser, unauthorized } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  const me = await requireUser();
  if (!me) return unauthorized();
  return NextResponse.json(await db.select().from(strategies).where(eq(strategies.profileId, me.id)).orderBy(asc(strategies.name)));
}

export async function POST(req: Request) {
  const me = await requireUser();
  if (!me) return unauthorized();
  const body = await req.json().catch(() => ({}));
  const name = String(body.name ?? "").trim().slice(0, 120);
  if (!name) return NextResponse.json({ error: "Nom de stratégie requis" }, { status: 400 });
  const [strategy] = await db.insert(strategies).values({
    profileId: me.id,
    name,
    description: String(body.description ?? "").slice(0, 1000),
    rules: JSON.stringify(body.rules ?? { entryRule: "previous_candle_momentum", stopPct: 0.25, targetRR: 2 }),
    newsRules: JSON.stringify(body.newsRules ?? { enabled: false, minutesBefore: 15, minutesAfter: 15, minimumImportance: "high" }),
  }).returning();
  return NextResponse.json(strategy, { status: 201 });
}

export async function DELETE(req: Request) {
  const me = await requireUser();
  if (!me) return unauthorized();
  const id = String((await req.json().catch(() => ({}))).id ?? "");
  if (!id) return NextResponse.json({ error: "id requis" }, { status: 400 });
  await db.delete(strategies).where(and(eq(strategies.id, id), eq(strategies.profileId, me.id)));
  return NextResponse.json({ ok: true });
}
