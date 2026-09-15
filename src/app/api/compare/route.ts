import { NextResponse } from "next/server";
import { desc, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { accounts, backtests, replaySessions, replayTrades, trades } from "@/db/schema";
import { requireUser, unauthorized } from "@/lib/auth";
import { computeStats } from "@/lib/stats";

export const dynamic = "force-dynamic";

/**
 * Comparaison Live / Replay / Backtest pour l'utilisateur courant.
 * Portée depuis la V2 (route équivalente) et adaptée au schéma V1 :
 * - Live      -> table `trades` (comptes réels de l'utilisateur)
 * - Replay    -> table `replayTrades` (positions clôturées, status != "open")
 * - Backtest  -> dernier run terminé de la table `backtests` (résumé JSON)
 *
 * Consommée par le tableau "Comparaison Live / Replay / Backtest" déjà
 * présent dans BacktestingTab (market-tabs.tsx), qui affichait jusque-là
 * une ligne Replay figée ("Sélectionner une session Replay").
 */
export async function GET() {
  const me = await requireUser();
  if (!me) return unauthorized();

  // --- Live ---------------------------------------------------------------
  const userAccounts = await db.select({ id: accounts.id }).from(accounts).where(eq(accounts.profileId, me.id));
  const liveTrades = userAccounts.length
    ? await db.select().from(trades).where(inArray(trades.accountId, userAccounts.map((a) => a.id)))
    : [];
  const live = { ...computeStats(liveTrades as never), count: liveTrades.length };

  // --- Replay ---------------------------------------------------------------
  const sessions = await db.select({ id: replaySessions.id }).from(replaySessions).where(eq(replaySessions.profileId, me.id));
  const closedReplayTrades = sessions.length
    ? await db.select().from(replayTrades).where(inArray(replayTrades.replaySessionId, sessions.map((s) => s.id)))
    : [];
  const closed = closedReplayTrades.filter((t) => t.status !== "open");
  const replayRows = closed.map((t) => ({
    id: t.id,
    pnl: t.pnl,
    rMultiple: t.rMultiple,
    date: (t.closedAt ?? t.openedAt).toISOString().slice(0, 10),
    createdAt: t.createdAt.toISOString(),
  }));
  const replay = { ...computeStats(replayRows as never), count: replayRows.length };

  // --- Backtest (dernier run) ------------------------------------------------
  const lastRuns = await db.select().from(backtests).where(eq(backtests.profileId, me.id)).orderBy(desc(backtests.createdAt)).limit(1);
  const lastRun = lastRuns[0];
  let backtest: Record<string, unknown> = { count: 0 };
  if (lastRun) {
    try {
      const parsed = JSON.parse(lastRun.summary) as { trades?: number };
      backtest = { ...parsed, count: parsed.trades ?? 0 };
    } catch {
      backtest = { count: 0 };
    }
  }

  return NextResponse.json({ live, replay, backtest });
}
