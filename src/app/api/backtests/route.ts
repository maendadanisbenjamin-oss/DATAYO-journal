import { NextResponse } from "next/server";
import { and, desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { accounts, backtestTrades, backtests, instruments, strategies } from "@/db/schema";
import { requireUser, unauthorized } from "@/lib/auth";
import { getBacktestEconomicEvents } from "@/lib/economic-calendar-service";
import { getBacktestCandles } from "@/lib/market-data-service";
import { runBacktest, type BacktestRules } from "@/lib/backtest-engine";

export const dynamic = "force-dynamic";
const timeframes = new Set(["1m", "5m", "15m", "30m", "1h", "4h", "1d"]);

export async function GET() {
  const me = await requireUser();
  if (!me) return unauthorized();
  const rows = await db.select().from(backtests).where(eq(backtests.profileId, me.id)).orderBy(desc(backtests.createdAt)).limit(50);
  return NextResponse.json(rows);
}

export async function POST(req: Request) {
  const me = await requireUser();
  if (!me) return unauthorized();
  try {
    const body = await req.json().catch(() => ({}));
    const instrumentId = String(body.instrumentId ?? "");
    const startAt = new Date(String(body.startAt ?? ""));
    const endAt = new Date(String(body.endAt ?? ""));
    if (!instrumentId || Number.isNaN(startAt.getTime()) || Number.isNaN(endAt.getTime()) || startAt >= endAt) {
      return NextResponse.json({ error: "Instrument et pÃ©riode valide requis" }, { status: 400 });
    }
    if (endAt > new Date()) return NextResponse.json({ error: "La pÃ©riode de Backtest ne peut pas finir dans le futur" }, { status: 400 });
    const [instrument] = await db.select().from(instruments).where(eq(instruments.id, instrumentId));
    if (!instrument) return NextResponse.json({ error: "Instrument introuvable" }, { status: 404 });
    const accountId = body.accountId ? String(body.accountId) : null;
    if (accountId) {
      const [account] = await db.select({ id: accounts.id }).from(accounts).where(and(eq(accounts.id, accountId), eq(accounts.profileId, me.id)));
      if (!account) return NextResponse.json({ error: "Compte introuvable" }, { status: 403 });
    }
    const strategyId = body.strategyId ? String(body.strategyId) : null;
    let storedRules: BacktestRules = {};
    if (strategyId) {
      const [strategy] = await db.select().from(strategies).where(and(eq(strategies.id, strategyId), eq(strategies.profileId, me.id)));
      if (!strategy) return NextResponse.json({ error: "StratÃ©gie introuvable" }, { status: 404 });
      try { storedRules = JSON.parse(strategy.rules) as BacktestRules; } catch {}
      try { storedRules.newsFilter = JSON.parse(strategy.newsRules); } catch {}
    }
    const inputRules = body.rules && typeof body.rules === "object" ? body.rules : {};
    const rules: BacktestRules = { ...storedRules, ...inputRules, riskPct: Number(body.riskPct ?? storedRules.riskPct ?? 1), commissionPerOrder: Number(body.commissionPerOrder ?? storedRules.commissionPerOrder ?? 0) };
    const timeframe = timeframes.has(String(body.timeframe)) ? String(body.timeframe) : "15m";
    const initialCapital = Math.max(0, Number(body.initialCapital ?? 10000));

    const [run] = await db.insert(backtests).values({
      profileId: me.id,
      accountId,
      instrumentId,
      strategyId,
      name: String(body.name ?? `Backtest ${instrument.symbol}`).slice(0, 120),
      timeframe,
      startAt,
      endAt,
      status: "running",
      initialCapital,
      riskPct: Math.max(0, Number(rules.riskPct ?? 1)),
      commissionPerOrder: Math.max(0, Number(rules.commissionPerOrder ?? 0)),
      config: JSON.stringify(rules),
    }).returning();

    const candles = await getBacktestCandles({ instrumentId, timeframe: timeframe as Parameters<typeof getBacktestCandles>[0]["timeframe"], start: startAt, end: endAt });
    if (candles.length < 2) {
      await db.update(backtests).set({ status: "failed", summary: JSON.stringify({ error: "Pas assez de bougies importÃ©es pour cette pÃ©riode" }), completedAt: new Date() }).where(eq(backtests.id, run.id));
      return NextResponse.json({ error: "Pas assez de bougies importÃ©es pour cette pÃ©riode", backtest: run }, { status: 400 });
    }
    const events = await getBacktestEconomicEvents({ from: startAt, to: endAt });
    const result = runBacktest({ candles, initialCapital, rules, economicEvents: events });

    if (result.positions.length) {
      await db.insert(backtestTrades).values(result.positions.map((p) => ({
        backtestId: run.id,
        instrumentId,
        direction: p.direction,
        session: "",
        timeframe,
        strategyLabel: String(body.name ?? "Candle Momentum").slice(0, 120),
        openedAt: p.openedAt,
        closedAt: p.closedAt,
        entryPrice: p.entryPrice,
        stopLoss: p.stopLoss,
        takeProfit: p.takeProfit,
        exitPrice: p.exitPrice,
        quantity: p.quantity,
        commission: p.commission,
        pnl: p.pnl,
        rMultiple: p.rMultiple,
        newsContext: JSON.stringify({ filter: rules.newsFilter ?? null }),
      })));
    }
    const net = result.finalEquity - initialCapital;
    const wins = result.positions.filter((p) => p.pnl > 0);
    const losses = result.positions.filter((p) => p.pnl < 0);
    const gross = wins.reduce((sum, p) => sum + p.pnl, 0);
    const grossLoss = Math.abs(losses.reduce((sum, p) => sum + p.pnl, 0));
    const totalR = result.positions.reduce((sum, p) => sum + p.rMultiple, 0);
    const summary = {
      trades: result.positions.length,
      wins: wins.length,
      losses: losses.length,
      winRate: result.positions.length ? (wins.length / result.positions.length) * 100 : 0,
      grossProfit: gross,
      grossLoss,
      net,
      profitFactor: grossLoss ? gross / grossLoss : gross ? null : 0,
      totalR,
      averageR: result.positions.length ? totalR / result.positions.length : 0,
      maxDrawdown: result.maxDrawdown,
      finalEquity: result.finalEquity,
      equityPoints: result.points.map((p) => ({ ts: p.ts.toISOString(), equity: p.equity, drawdown: p.drawdown })),
      antiFutureLeak: true,
    };
    const [completed] = await db.update(backtests).set({ status: "completed", summary: JSON.stringify(summary), completedAt: new Date() }).where(eq(backtests.id, run.id)).returning();
    return NextResponse.json({ backtest: completed, summary }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Backtest impossible" }, { status: 400 });
  }
}
