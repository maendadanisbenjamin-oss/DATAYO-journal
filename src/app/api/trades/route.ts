import { NextResponse } from "next/server";
import { db } from "@/db";
import { trades } from "@/db/schema";
import { requireUser, unauthorized } from "@/lib/auth";
import { publish } from "@/lib/realtime";
import { ownsAccount, parseTrade } from "@/lib/parsers";
import { associateTradeEconomicEvents } from "@/lib/economic-calendar-service";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const me = await requireUser();
  if (!me) return unauthorized();
  const data = parseTrade(await req.json().catch(() => ({})));
  if (!data.date || !data.symbol) return NextResponse.json({ error: "Date et symbole requis" }, { status: 400 });
  if (!(await ownsAccount(me.id, data.accountId))) return NextResponse.json({ error: "Compte invalide" }, { status: 403 });
  const [row] = await db.insert(trades).values(data).returning();
  await associateTradeEconomicEvents(row.id);
  await publish(me.id, "trades");
  return NextResponse.json(row, { status: 201 });
}
