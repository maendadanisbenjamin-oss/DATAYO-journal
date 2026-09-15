import "server-only";
import { and, asc, eq, gte, inArray, lte, lt, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  candlesM1,
  dataSources,
  economicEvents,
  marketDataGaps,
  marketEngineEvents,
} from "@/db/schema";

export const RETENTION_YEARS = 15;
export const MAX_CANDLE_BATCH = 2_000;

export type CandleInput = {
  timestamp: string | number | Date;
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
  final?: boolean;
};

export type NormalizedCandle = {
  ts: Date;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  isFinal: boolean;
};

export type Timeframe = "1m" | "5m" | "15m" | "30m" | "1h" | "4h" | "1d" | "1w" | "1mo";

const TIMEFRAME_MS: Record<Exclude<Timeframe, "1w" | "1mo">, number> = {
  "1m": 60_000,
  "5m": 5 * 60_000,
  "15m": 15 * 60_000,
  "30m": 30 * 60_000,
  "1h": 60 * 60_000,
  "4h": 4 * 60 * 60_000,
  "1d": 24 * 60 * 60_000,
};

export function retentionCutoff(now = new Date()) {
  const cutoff = new Date(now);
  cutoff.setUTCFullYear(cutoff.getUTCFullYear() - RETENTION_YEARS);
  return cutoff;
}

export function parseTimestamp(value: CandleInput["timestamp"]) {
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) throw new Error("Timestamp OHLCV invalide");
  return new Date(Math.floor(d.getTime() / 60_000) * 60_000);
}

/** Validates an OHLCV row before it can reach persistent M1 storage. */
export function normalizeCandle(input: CandleInput): NormalizedCandle {
  const ts = parseTimestamp(input.timestamp);
  const open = Number(input.open);
  const high = Number(input.high);
  const low = Number(input.low);
  const close = Number(input.close);
  const volume = Number(input.volume ?? 0);

  if (![open, high, low, close, volume].every(Number.isFinite)) throw new Error("OHLCV non numérique");
  if (volume < 0) throw new Error("Volume négatif");
  if (high < low) throw new Error("High inférieur au Low");
  if (high < Math.max(open, close) || low > Math.min(open, close)) {
    throw new Error("OHLC incohérent : High/Low ne contient pas Open/Close");
  }

  return { ts, open, high, low, close, volume, isFinal: input.final !== false };
}

export function bucketStart(ts: Date, timeframe: Timeframe) {
  const d = new Date(ts);
  if (timeframe === "1w") {
    const day = (d.getUTCDay() + 6) % 7; // Monday = 0
    d.setUTCDate(d.getUTCDate() - day);
    d.setUTCHours(0, 0, 0, 0);
    return d;
  }
  if (timeframe === "1mo") {
    d.setUTCDate(1);
    d.setUTCHours(0, 0, 0, 0);
    return d;
  }
  const ms = TIMEFRAME_MS[timeframe];
  return new Date(Math.floor(d.getTime() / ms) * ms);
}

/** Rebuilds higher timeframes deterministically from canonical M1 candles. */
export function aggregateCandles<T extends { ts: Date; open: number; high: number; low: number; close: number; volume: number; isFinal?: boolean }>(
  candles: T[],
  timeframe: Timeframe
) {
  if (timeframe === "1m") return [...candles].sort((a, b) => a.ts.getTime() - b.ts.getTime());
  const sorted = [...candles].sort((a, b) => a.ts.getTime() - b.ts.getTime());
  const buckets = new Map<string, { ts: Date; open: number; high: number; low: number; close: number; volume: number; isFinal: boolean }>();

  for (const candle of sorted) {
    const b = bucketStart(candle.ts, timeframe);
    const key = b.toISOString();
    const existing = buckets.get(key);
    if (!existing) {
      buckets.set(key, {
        ts: b,
        open: candle.open,
        high: candle.high,
        low: candle.low,
        close: candle.close,
        volume: candle.volume,
        isFinal: candle.isFinal !== false,
      });
      continue;
    }
    existing.high = Math.max(existing.high, candle.high);
    existing.low = Math.min(existing.low, candle.low);
    existing.close = candle.close;
    existing.volume += candle.volume;
    existing.isFinal = existing.isFinal && candle.isFinal !== false;
  }
  return [...buckets.values()];
}

function isExpectedClosed(ts: Date, marketHours: string) {
  if (marketHours === "continuous") return false;
  // Weekday instruments: forex/indices/metals. Holidays remain candidates, never auto-filled blindly.
  const day = ts.getUTCDay();
  return day === 0 || day === 6;
}

export type DetectedGap = { gapStart: Date; gapEnd: Date; expectedBars: number };

/** Detects candidate missing M1 intervals; avoids weekends for weekday instruments. */
export function detectM1Gaps(candles: { ts: Date }[], marketHours = "weekday"): DetectedGap[] {
  const sorted = [...candles].sort((a, b) => a.ts.getTime() - b.ts.getTime());
  const gaps: DetectedGap[] = [];
  for (let i = 1; i < sorted.length; i++) {
    const previous = sorted[i - 1].ts.getTime();
    const current = sorted[i].ts.getTime();
    if (current - previous <= 60_000) continue;

    let start = previous + 60_000;
    let missing = 0;
    let firstMissing: number | null = null;
    let lastMissing: number | null = null;
    while (start < current) {
      const ts = new Date(start);
      if (!isExpectedClosed(ts, marketHours)) {
        missing += 1;
        firstMissing ??= start;
        lastMissing = start;
      }
      start += 60_000;
    }
    if (missing && firstMissing !== null && lastMissing !== null) {
      gaps.push({ gapStart: new Date(firstMissing), gapEnd: new Date(lastMissing + 60_000), expectedBars: missing });
    }
  }
  return gaps;
}

export async function ensureManualSource(kind: "market" | "economic") {
  const key = kind === "market" ? "manual-csv-market" : "manual-economic";
  const [existing] = await db.select().from(dataSources).where(eq(dataSources.key, key));
  if (existing) return existing;
  const [created] = await db
    .insert(dataSources)
    .values({
      key,
      name: kind === "market" ? "Import CSV validé" : "Saisie / import économique validé",
      providerKind: kind,
      licenseStatus: "verified_internal",
      licenseNotes:
        "Source manuelle : l'opérateur confirme qu'il dispose des droits de stockage et d'utilisation interne des données importées.",
      retentionPolicy: "25_year_rolling",
      configEnvKey: "",
    })
    .returning();
  return created;
}

export async function runRetention() {
  const cutoff = retentionCutoff();
  const [candlesResult, eventsResult] = await Promise.all([
    db.delete(candlesM1).where(lt(candlesM1.ts, cutoff)).returning({ id: candlesM1.id }),
    db.delete(economicEvents).where(lt(economicEvents.scheduledAt, cutoff)).returning({ id: economicEvents.id }),
  ]);
  return { cutoff, candlesDeleted: candlesResult.length, eventsDeleted: eventsResult.length };
}

export async function recordMarketEngineEvent(input: {
  sourceId?: string;
  instrumentId?: string;
  level: "info" | "warning" | "error";
  eventType: string;
  message: string;
  context?: unknown;
}) {
  await db.insert(marketEngineEvents).values({
    sourceId: input.sourceId,
    instrumentId: input.instrumentId,
    level: input.level,
    eventType: input.eventType,
    message: input.message.slice(0, 2000),
    context: JSON.stringify(input.context ?? {}),
  });
}

export function parseCsv(text: string) {
  const lines = text.replace(/\r/g, "").split("\n").filter((line) => line.trim());
  if (lines.length < 2) throw new Error("Le CSV doit contenir un en-tête et au moins une bougie");
  const delimiter = lines[0].includes(";") ? ";" : ",";
  const header = splitCsvLine(lines[0], delimiter).map((h) => h.trim().toLowerCase().replace(/[_\s-]/g, ""));
  const at = (aliases: string[]) => aliases.map((a) => header.indexOf(a)).find((i) => i >= 0) ?? -1;
  const timestampIdx = at(["timestamp", "time", "datetime", "date"]);
  const openIdx = at(["open", "o"]);
  const highIdx = at(["high", "h"]);
  const lowIdx = at(["low", "l"]);
  const closeIdx = at(["close", "c"]);
  const volumeIdx = at(["volume", "v"]);
  if ([timestampIdx, openIdx, highIdx, lowIdx, closeIdx].some((i) => i < 0)) {
    throw new Error("Colonnes requises : timestamp/date, open, high, low, close (volume optionnel)");
  }
  return lines.slice(1).map((line) => {
    const p = splitCsvLine(line, delimiter);
    return {
      timestamp: p[timestampIdx],
      open: Number(p[openIdx]),
      high: Number(p[highIdx]),
      low: Number(p[lowIdx]),
      close: Number(p[closeIdx]),
      volume: volumeIdx >= 0 ? Number(p[volumeIdx] || 0) : 0,
    } satisfies CandleInput;
  });
}

function splitCsvLine(line: string, delimiter: string) {
  const out: string[] = [];
  let field = "";
  let quoted = false;
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (quoted && line[i + 1] === '"') {
        field += '"';
        i++;
      } else {
        quoted = !quoted;
      }
    } else if (char === delimiter && !quoted) {
      out.push(field);
      field = "";
    } else {
      field += char;
    }
  }
  out.push(field);
  return out;
}

export function safeJson<T>(value: string, fallback: T): T {
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

export const utcMinute = (d: Date) => new Date(Math.floor(d.getTime() / 60_000) * 60_000);
export const minuteAfter = (d: Date) => new Date(d.getTime() + 60_000);
