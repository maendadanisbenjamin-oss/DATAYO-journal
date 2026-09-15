import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { accounts, trades } from "@/db/schema";
import { requireUser, unauthorized } from "@/lib/auth";
import { publish } from "@/lib/realtime";
import { ownsAccount, parseTrade } from "@/lib/parsers";
import { associateTradeEconomicEvents } from "@/lib/economic-calendar-service";

export const dynamic = "force-dynamic";
type Ctx = { params: Promise<{ id: string }> };

async function ownedTrade(profileId: string, id: string) {
  const [row] = await db
    .select({ id: trades.id })
    .from(trades)
    .innerJoin(accounts, eq(trades.accountId, accounts.id))
    .where(and(eq(trades.id, id), eq(accounts.profileId, profileId)));
  return !!row;
}

export async function PATCH(req: Request, { params }: Ctx) {
  const me = await requireUser();
  if (!me) return unauthorized();
  const { id } = await params;
  if (!(await ownedTrade(me.id, id))) return NextResponse.json({ error: "Introuvable" }, { status: 404 });
  const data = parseTrade(await req.json().catch(() => ({})));
  if (!data.date || !data.symbol) return NextResponse.json({ error: "Date et symbole requis" }, { status: 400 });
  if (!(await ownsAccount(me.id, data.accountId))) return NextResponse.json({ error: "Compte invalide" }, { status: 403 });
  const [row] = await db.update(trades).set(data).where(eq(trades.id, id)).returning();
  await associateTradeEconomicEvents(row.id);
  await publish(me.id, "trades");
  return NextResponse.json(row);
}

export async function DELETE(_req: Request, { params }: Ctx) {
  const me = await requireUser();
  if (!me) return unauthorized();
  const { id } = await params;
  if (!(await ownedTrade(me.id, id))) return NextResponse.json({ error: "Introuvable" }, { status: 404 });
  await db.delete(trades).where(eq(trades.id, id));
  await publish(me.id, "trades");
  return NextResponse.json({ ok: true });
}
