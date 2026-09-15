import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { accounts, trades } from "@/db/schema";
import { requireUser, unauthorized } from "@/lib/auth";
import { eventsNearTrade } from "@/lib/economic-calendar-service";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const me = await requireUser();
  if (!me) return unauthorized();
  const tradeId = new URL(req.url).searchParams.get("tradeId");
  if (!tradeId) return NextResponse.json({ error: "tradeId requis" }, { status: 400 });
  const [owned] = await db
    .select({ id: trades.id })
    .from(trades)
    .innerJoin(accounts, eq(trades.accountId, accounts.id))
    .where(and(eq(trades.id, tradeId), eq(accounts.profileId, me.id)));
  if (!owned) return NextResponse.json({ error: "Trade introuvable" }, { status: 404 });
  return NextResponse.json(await eventsNearTrade(tradeId));
}
