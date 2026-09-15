import type { Direction } from "@/lib/types";
import { closePosition, markPosition, openPosition, type PriceCandle, type SimulatedPosition } from "@/lib/position-engine";

export type BacktestCandle = PriceCandle & { volume?: number };
export type BacktestNews = {
  scheduledAt: Date | string;
  knownAt: Date | string;
  importance: "low" | "medium" | "high" | string;
  currency: string;
};

export type BacktestRules = {
  /** Signal computed from the previous finished candle only. */
  entryRule?: "previous_candle_momentum";
  stopPct?: number;
  targetRR?: number;
  riskPct?: number;
  commissionPerOrder?: number;
  allowLong?: boolean;
  allowShort?: boolean;
  newsFilter?: {
    enabled?: boolean;
    minutesBefore?: number;
    minutesAfter?: number;
    minimumImportance?: "low" | "medium" | "high";
  };
};

export type BacktestResult = {
  positions: SimulatedPosition[];
  points: { ts: Date; equity: number; drawdown: number }[];
  initialCapital: number;
  finalEquity: number;
  maxDrawdown: number;
};

const importanceRank: Record<string, number> = { low: 1, medium: 2, high: 3 };

function eventBlocked(at: Date, events: BacktestNews[], rules: BacktestRules) {
  const filter = rules.newsFilter;
  if (!filter?.enabled) return false;
  const before = (filter.minutesBefore ?? 15) * 60_000;
  const after = (filter.minutesAfter ?? 15) * 60_000;
  const minimum = importanceRank[filter.minimumImportance ?? "high"] ?? 3;
  return events.some((event) => {
    const scheduled = new Date(event.scheduledAt);
    const known = new Date(event.knownAt);
    // Events are only usable if they were scheduled/known at the current simulated time.
    if (known > at || (importanceRank[event.importance] ?? 0) < minimum) return false;
    const diff = at.getTime() - scheduled.getTime();
    return diff >= -before && diff <= after;
  });
}

/**
 * Deterministic candle-by-candle runner.
 * It only observes candle[i - 1] to create a signal at candle[i]. No future candle
 * or economic release with knownAt after the simulated timestamp is accessible.
 */
export function runBacktest(input: {
  candles: BacktestCandle[];
  initialCapital: number;
  rules?: BacktestRules;
  economicEvents?: BacktestNews[];
}) : BacktestResult {
  const candles = [...input.candles].sort((a, b) => new Date(a.ts).getTime() - new Date(b.ts).getTime());
  const rules = input.rules ?? {};
  const events = input.economicEvents ?? [];
  const positions: SimulatedPosition[] = [];
  const points: { ts: Date; equity: number; drawdown: number }[] = [];
  let open: SimulatedPosition | null = null;
  let equity = input.initialCapital;
  let peak = equity;

  const stopPct = Math.max(0.00001, Number(rules.stopPct ?? 0.25)) / 100;
  const targetRR = Math.max(0.1, Number(rules.targetRR ?? 2));
  const riskPct = Math.max(0, Number(rules.riskPct ?? 1));
  const commission = Math.max(0, Number(rules.commissionPerOrder ?? 0));

  for (let i = 1; i < candles.length; i++) {
    const current = candles[i];
    const at = new Date(current.ts);

    // Mark an existing position using the currently completed candle only.
    if (open) {
      open = markPosition(open, current);
      if (open.status !== "open") {
        positions.push(open);
        equity += open.pnl;
        peak = Math.max(peak, equity);
        points.push({ ts: at, equity, drawdown: peak - equity });
        open = null;
      }
    }

    if (open || eventBlocked(at, events, rules)) continue;
    const previous = candles[i - 1];
    const isBull = previous.close > previous.open;
    const direction: Direction = isBull ? "long" : "short";
    if ((direction === "long" && rules.allowLong === false) || (direction === "short" && rules.allowShort === false)) continue;

    // Entry is the opening price of the current candle, based solely on prior close/open.
    const entry = current.open;
    const stop = direction === "long" ? entry * (1 - stopPct) : entry * (1 + stopPct);
    const target = direction === "long" ? entry + (entry - stop) * targetRR : entry - (stop - entry) * targetRR;
    const riskAmount = equity * (riskPct / 100);
    const quantity = riskAmount > 0 ? riskAmount / Math.abs(entry - stop) : 1;
    open = openPosition({
      direction,
      openedAt: at,
      entryPrice: entry,
      stopLoss: stop,
      takeProfit: target,
      quantity,
      riskAmount,
      commission,
    });

    // Current bar's complete OHLC is allowed after this deterministic opening-at-open order.
    open = markPosition(open, current);
    if (open.status !== "open") {
      positions.push(open);
      equity += open.pnl;
      peak = Math.max(peak, equity);
      points.push({ ts: at, equity, drawdown: peak - equity });
      open = null;
    }
  }

  if (open && candles.length) {
    const last = candles[candles.length - 1];
    open = closePosition(open, last.close, new Date(last.ts), "closed");
    positions.push(open);
    equity += open.pnl;
    peak = Math.max(peak, equity);
    points.push({ ts: new Date(last.ts), equity, drawdown: peak - equity });
  }

  return { positions, points, initialCapital: input.initialCapital, finalEquity: equity, maxDrawdown: Math.max(...points.map((p) => p.drawdown), 0) };
}
