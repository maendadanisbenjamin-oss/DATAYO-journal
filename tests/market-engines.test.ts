import { describe, expect, it, vi } from "vitest";

// The production module must remain server-only; this test mocks only that Next.js guard.
vi.mock("server-only", () => ({}));

import { aggregateCandles, detectM1Gaps, normalizeCandle, retentionCutoff } from "../src/lib/market-engine";
import { closePosition, markPosition, openPosition } from "../src/lib/position-engine";
import { runBacktest } from "../src/lib/backtest-engine";

describe("market data normalization", () => {
  it("accepts valid OHLCV and floors to M1", () => {
    const candle = normalizeCandle({ timestamp: "2024-03-12T13:30:42Z", open: 1.1, high: 1.2, low: 1.0, close: 1.15, volume: 10 });
    expect(candle.ts.toISOString()).toBe("2024-03-12T13:30:00.000Z");
    expect(candle.close).toBe(1.15);
  });

  it("rejects incoherent OHLC", () => {
    expect(() => normalizeCandle({ timestamp: "2024-03-12T13:30:00Z", open: 1.1, high: 1.09, low: 1.0, close: 1.05 })).toThrow();
  });

  it("aggregates M1 into M5 deterministically", () => {
    const candles = [0, 1, 2, 3, 4].map((minute) => ({ ts: new Date(Date.UTC(2024, 0, 1, 10, minute)), open: 10 + minute, high: 12 + minute, low: 9 + minute, close: 11 + minute, volume: 1 }));
    const result = aggregateCandles(candles, "5m");
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({ open: 10, high: 16, low: 9, close: 15, volume: 5 });
  });

  it("detects a missing M1 interval and excludes a weekend", () => {
    const weekday = detectM1Gaps([{ ts: new Date("2024-01-02T10:00:00Z") }, { ts: new Date("2024-01-02T10:03:00Z") }]);
    expect(weekday).toHaveLength(1);
    expect(weekday[0].expectedBars).toBe(2);
    const weekend = detectM1Gaps([{ ts: new Date("2024-01-05T23:59:00Z") }, { ts: new Date("2024-01-08T00:01:00Z") }], "weekday");
    expect(weekend).toHaveLength(1); // Monday 00:00 only, no weekend false positives
    expect(weekend[0].expectedBars).toBe(1);
  });

  it("uses a rolling 25-year retention cutoff", () => {
    expect(retentionCutoff(new Date("2026-09-01T00:00:00Z")).toISOString()).toBe("2001-09-01T00:00:00.000Z");
  });
});

describe("shared position engine", () => {
  it("closes at SL first when a single OHLC candle hits both SL and TP", () => {
    const position = openPosition({ direction: "long", openedAt: "2024-03-12T13:00:00Z", entryPrice: 100, stopLoss: 95, takeProfit: 110, quantity: 1 });
    const marked = markPosition(position, { ts: "2024-03-12T13:01:00Z", open: 100, high: 111, low: 94, close: 105 });
    expect(marked.status).toBe("stopped");
    expect(marked.exitPrice).toBe(95);
  });

  it("includes commission in PnL and R", () => {
    const position = openPosition({ direction: "short", openedAt: "2024-03-12T13:00:00Z", entryPrice: 100, stopLoss: 105, quantity: 2, riskAmount: 10, commission: 1 });
    const closed = closePosition(position, 90, "2024-03-12T13:10:00Z");
    expect(closed.pnl).toBe(19);
    expect(closed.rMultiple).toBe(1.9);
  });
});

describe("backtest anti-future-leak", () => {
  it("does not block an entry for a high-impact event that was not yet known", () => {
    const candles = [
      { ts: "2024-03-12T13:00:00Z", open: 100, high: 101, low: 99, close: 101 },
      { ts: "2024-03-12T13:01:00Z", open: 101, high: 102, low: 100, close: 101.5 },
      { ts: "2024-03-12T13:02:00Z", open: 101.5, high: 104, low: 101, close: 103 },
    ];
    const result = runBacktest({
      candles,
      initialCapital: 10000,
      rules: { newsFilter: { enabled: true, minutesBefore: 30, minutesAfter: 30, minimumImportance: "high" } },
      economicEvents: [{ scheduledAt: "2024-03-12T13:05:00Z", knownAt: "2024-03-12T14:00:00Z", importance: "high", currency: "USD" }],
    });
    expect(result.positions.length).toBeGreaterThan(0);
  });

  it("blocks an entry around a high-impact event that was already known", () => {
    const candles = [
      { ts: "2024-03-12T13:00:00Z", open: 100, high: 101, low: 99, close: 101 },
      { ts: "2024-03-12T13:01:00Z", open: 101, high: 102, low: 100, close: 101.5 },
      { ts: "2024-03-12T13:02:00Z", open: 101.5, high: 104, low: 101, close: 103 },
    ];
    const result = runBacktest({
      candles,
      initialCapital: 10000,
      rules: { newsFilter: { enabled: true, minutesBefore: 30, minutesAfter: 30, minimumImportance: "high" } },
      economicEvents: [{ scheduledAt: "2024-03-12T13:05:00Z", knownAt: "2024-03-12T12:00:00Z", importance: "high", currency: "USD" }],
    });
    expect(result.positions).toHaveLength(0);
  });
});
