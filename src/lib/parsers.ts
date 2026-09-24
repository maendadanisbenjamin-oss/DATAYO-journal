import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { accounts } from "@/db/schema";
import type { PlanRespect, TradeOutcome, TradingType } from "./types";

export function parseAccount(b: Record<string, unknown>) {
  return {
    name: String(b.name ?? "").trim().slice(0, 80),
    broker: String(b.broker ?? "").trim().slice(0, 80),
    currency: String(b.currency ?? "USD").trim().toUpperCase().slice(0, 3) || "USD",
    initialBalance: Number.isFinite(Number(b.initialBalance)) ? Number(b.initialBalance) : 10000,
    color: /^#[0-9a-fA-F]{6}$/.test(String(b.color)) ? String(b.color) : "#d8b56d",
  };
}

export function parseTrade(b: Record<string, unknown>) {
  const num = (v: unknown, d = 0) => (Number.isFinite(Number(v)) ? Number(v) : d);
  const optNum = (v: unknown) => (v !== null && v !== undefined && v !== "" && Number.isFinite(Number(v)) ? Number(v) : null);
  const direction = b.direction === "short" ? "short" : "long";
  const session = ["asia", "london", "newyork"].includes(String(b.session)) ? String(b.session) : "london";
  const tradingType: TradingType = ["Day Trade", "Scalp", "Swing"].includes(String(b.tradingType)) ? (String(b.tradingType) as TradingType) : "Day Trade";
  const planRespectNum = Number(b.planRespect);
  const planRespect: PlanRespect = ([1, 2, 3, 4, 5] as number[]).includes(planRespectNum) ? (planRespectNum as PlanRespect) : 5;
  const tradeOutcome: TradeOutcome = ["En cours", "TP touché", "SL touché", "BE", "Sortie manuelle"].includes(String(b.tradeOutcome)) ? (String(b.tradeOutcome) as TradeOutcome) : num(b.pnl) > 0 ? "TP touché" : num(b.pnl) < 0 ? "SL touché" : "BE";

  let screenshots = "{}";
  if (typeof b.screenshots === "string") {
    screenshots = b.screenshots;
  } else if (b.screenshots && typeof b.screenshots === "object") {
    try {
      screenshots = JSON.stringify(b.screenshots);
    } catch {
      screenshots = "{}";
    }
  }

  const parseOptionalDate = (value: unknown) => {
    if (!value) return null;
    const date = new Date(String(value));
    return Number.isNaN(date.getTime()) ? null : date;
  };
  const mode = ["live", "replay", "backtest"].includes(String(b.mode)) ? String(b.mode) : "live";

  return {
    accountId: String(b.accountId ?? ""),
    date: /^\d{4}-\d{2}-\d{2}$/.test(String(b.date)) ? String(b.date) : new Date().toISOString().slice(0, 10),
    openedAt: parseOptionalDate(b.openedAt),
    closedAt: parseOptionalDate(b.closedAt),
    mode,
    sourceRunId: typeof b.sourceRunId === "string" ? b.sourceRunId : null,
    symbol: String(b.symbol ?? "").trim().toUpperCase().slice(0, 20),
    direction,
    session: session as "asia" | "london" | "newyork",
    setup: String(b.setup ?? "").trim().slice(0, 80),
    riskPct: num(b.riskPct, 1),
    rMultiple: num(b.rMultiple),
    pnl: num(b.pnl),
    notes: String(b.notes ?? "").trim().slice(0, 2000),

    tradingType,
    timeframe: String(b.timeframe ?? "M15").trim().slice(0, 10),
    entryPrice: optNum(b.entryPrice),
    stopLoss: optNum(b.stopLoss),
    takeProfit: optNum(b.takeProfit),
    lotSize: optNum(b.lotSize),
    exitPrice: optNum(b.exitPrice),
    rrRatio: optNum(b.rrRatio),

    ictModel: String(b.ictModel ?? b.setup ?? "Silver Bullet").trim().slice(0, 80),
    marketStructure: String(b.marketStructure ?? "Bullish Trend").trim().slice(0, 80),
    htfTimeframe: String(b.htfTimeframe ?? "H4").trim().slice(0, 10),
    poiZone: String(b.poiZone ?? "Order Block (OB)").trim().slice(0, 80),
    setupNotes: String(b.setupNotes ?? "").trim().slice(0, 2000),

    emotionalState: String(b.emotionalState ?? "Calme & Patient").trim().slice(0, 80),
    htfBias: String(b.htfBias ?? "").trim().slice(0, 1000),
    managementNotes: String(b.managementNotes ?? "").trim().slice(0, 2000),
    planRespect,
    tradeOutcome,

    screenshots,
    lessonsLearned: String(b.lessonsLearned ?? "").trim().slice(0, 2000),
  };
}

export async function ownsAccount(profileId: string, accountId: string) {
  if (!accountId) return false;
  const [a] = await db.select({ id: accounts.id }).from(accounts).where(and(eq(accounts.id, accountId), eq(accounts.profileId, profileId)));
  return !!a;
}
