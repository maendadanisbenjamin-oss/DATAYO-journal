import { NextResponse } from "next/server";
import { and, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { accounts, economicEvents, tradeEconomicEvents, trades } from "@/db/schema";
import { requireUser, unauthorized } from "@/lib/auth";
import { computeStats } from "@/lib/stats";
import type { Trade } from "@/lib/types";

export const dynamic = "force-dynamic";

const serialise = (list: (typeof trades.$inferSelect)[]) => {
  const stats = computeStats(list as unknown as Trade[]);
  return {
    trades: stats.n,
    winRate: stats.winRate,
    profitFactor: stats.pf === Infinity ? null : stats.pf,
    expectancy: stats.expectancy,
    net: stats.net,
    totalR: stats.totalR,
    maxDrawdownR: stats.maxDdR,
  };
};

export async function GET() {
  const me = await requireUser();
  if (!me) return unauthorized();

  const ownedTrades = await db
    .select({ trade: trades })
    .from(trades)
    .innerJoin(accounts, eq(trades.accountId, accounts.id))
    .where(eq(accounts.profileId, me.id));
  const ids = ownedTrades.map((row) => row.trade.id);
  if (!ids.length) {
    return NextResponse.json({ withNews: serialise([]), withoutNews: serialise([]), before: serialise([]), during: serialise([]), after: serialise([]), byImportance: { high: serialise([]), medium: serialise([]), low: serialise([]) } });
  }

  const linked = await db
    .select({ tradeId: tradeEconomicEvents.tradeId, relation: tradeEconomicEvents.relation, importance: economicEvents.importance })
    .from(tradeEconomicEvents)
    .innerJoin(economicEvents, eq(tradeEconomicEvents.eventId, economicEvents.id))
    .where(inArray(tradeEconomicEvents.tradeId, ids));

  const byTrade = new Map<string, { relation: string; importance: string }[]>();
  for (const row of linked) byTrade.set(row.tradeId, [...(byTrade.get(row.tradeId) ?? []), { relation: row.relation, importance: row.importance }]);

  const rows = ownedTrades.map((row) => row.trade);
  const select = (predicate: (trade: typeof trades.$inferSelect, links: { relation: string; importance: string }[]) => boolean) =>
    rows.filter((trade) => predicate(trade, byTrade.get(trade.id) ?? []));

  return NextResponse.json({
    withNews: serialise(select((_trade, links) => links.length > 0)),
    withoutNews: serialise(select((_trade, links) => links.length === 0)),
    before: serialise(select((_trade, links) => links.some((item) => item.relation === "before_entry"))),
    during: serialise(select((_trade, links) => links.some((item) => item.relation === "during"))),
    after: serialise(select((_trade, links) => links.some((item) => item.relation === "after_exit"))),
    byImportance: {
      high: serialise(select((_trade, links) => links.some((item) => item.importance === "high"))),
      medium: serialise(select((_trade, links) => links.some((item) => item.importance === "medium"))),
      low: serialise(select((_trade, links) => links.some((item) => item.importance === "low"))),
    },
  });
}
