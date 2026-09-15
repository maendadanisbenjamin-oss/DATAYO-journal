import { NextResponse } from "next/server";
import { count, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  accounts,
  backtests,
  economicEvents,
  instruments,
  invitations,
  marketDataGaps,
  marketDataImports,
  profiles,
  replaySessions,
  sessions,
  trades,
} from "@/db/schema";
import { requireAdmin, unauthorized } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  const admin = await requireAdmin();
  if (!admin) return unauthorized();

  const [
    users,
    admins,
    accountCount,
    tradeStats,
    sessionCount,
    pendingInvitations,
    instrumentCount,
    importCount,
    gapStats,
    economicEventCount,
    replayCount,
    backtestCount,
  ] = await Promise.all([
    db.select({ count: count() }).from(profiles),
    db.select({ count: count() }).from(profiles).where(eq(profiles.role, "admin")),
    db.select({ count: count() }).from(accounts),
    db
      .select({
        count: count(),
        pnl: sql<number>`coalesce(sum(${trades.pnl}), 0)`,
      })
      .from(trades),
    db.select({ count: count() }).from(sessions),
    db
      .select({ count: count() })
      .from(invitations)
      .where(eq(invitations.status, "pending")),
    db.select({ count: count() }).from(instruments),
    db.select({ count: count() }).from(marketDataImports),
    db
      .select({
        count: count(),
        detected: sql<number>`count(*) filter (where ${marketDataGaps.status} = 'detected')`,
        recovering: sql<number>`count(*) filter (where ${marketDataGaps.status} = 'recovering')`,
        resolved: sql<number>`count(*) filter (where ${marketDataGaps.status} = 'resolved')`,
      })
      .from(marketDataGaps),
    db.select({ count: count() }).from(economicEvents),
    db.select({ count: count() }).from(replaySessions),
    db.select({ count: count() }).from(backtests),
  ]);

  return NextResponse.json({
    users: users[0]?.count ?? 0,
    admins: admins[0]?.count ?? 0,
    accounts: accountCount[0]?.count ?? 0,
    trades: tradeStats[0]?.count ?? 0,
    pnl: Number(tradeStats[0]?.pnl ?? 0),
    sessions: sessionCount[0]?.count ?? 0,
    pendingInvitations: pendingInvitations[0]?.count ?? 0,
    instruments: instrumentCount[0]?.count ?? 0,
    imports: importCount[0]?.count ?? 0,
    gaps: {
      total: gapStats[0]?.count ?? 0,
      detected: Number(gapStats[0]?.detected ?? 0),
      recovering: Number(gapStats[0]?.recovering ?? 0),
      resolved: Number(gapStats[0]?.resolved ?? 0),
    },
    economicEvents: economicEventCount[0]?.count ?? 0,
    replaySessions: replayCount[0]?.count ?? 0,
    backtests: backtestCount[0]?.count ?? 0,
  });
}
