import { NextResponse } from "next/server";
import { and, asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { backtestTrades, backtests } from "@/db/schema";
import { requireUser, unauthorized } from "@/lib/auth";

type Context = { params: Promise<{ id: string }> };
export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: Context) {
  const me = await requireUser();
  if (!me) return unauthorized();
  const id = (await params).id;
  const [backtest] = await db.select().from(backtests).where(and(eq(backtests.id, id), eq(backtests.profileId, me.id)));
  if (!backtest) return NextResponse.json({ error: "Backtest introuvable" }, { status: 404 });
  const trades = await db.select().from(backtestTrades).where(eq(backtestTrades.backtestId, id)).orderBy(asc(backtestTrades.openedAt));
  return NextResponse.json({ backtest, trades });
}
