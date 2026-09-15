import "server-only";
import { and, asc, eq, gte, lte, sql } from "drizzle-orm";
import { db } from "@/db";
import { candlesM1, instruments, marketDataGaps, marketDataImports } from "@/db/schema";
import {
  aggregateCandles,
  detectM1Gaps,
  ensureManualSource,
  MAX_CANDLE_BATCH,
  normalizeCandle,
  recordMarketEngineEvent,
  retentionCutoff,
  runRetention,
  type CandleInput,
  type Timeframe,
} from "@/lib/market-engine";

export async function ingestMarketCandles(input: {
  profileId: string;
  instrumentId: string;
  candles: CandleInput[];
  sourceKey?: string;
  mode?: "historical" | "live" | "gap_recovery";
}) {
  if (!input.candles.length) throw new Error("Aucune bougie à importer");
  if (input.candles.length > MAX_CANDLE_BATCH) {
    throw new Error(`Maximum ${MAX_CANDLE_BATCH} bougies par lot`);
  }

  const [instrument] = await db.select().from(instruments).where(eq(instruments.id, input.instrumentId));
  if (!instrument) throw new Error("Instrument introuvable");
  const source = await ensureManualSource("market");
  const now = new Date();
  const cutoff = retentionCutoff(now);

  const accepted = new Map<string, ReturnType<typeof normalizeCandle>>();
  const errors: string[] = [];
  let rejected = 0;

  for (const raw of input.candles) {
    try {
      const candle = normalizeCandle(raw);
      if (candle.ts < cutoff) {
        rejected++;
        continue;
      }
      if (candle.ts.getTime() > now.getTime() + 120_000) {
        rejected++;
        errors.push(`Bougie future rejetée : ${candle.ts.toISOString()}`);
        continue;
      }
      accepted.set(candle.ts.toISOString(), candle);
    } catch (error) {
      rejected++;
      errors.push(error instanceof Error ? error.message : "Bougie invalide");
    }
  }

  const rows = [...accepted.values()].sort((a, b) => a.ts.getTime() - b.ts.getTime());
  const importFrom = rows[0]?.ts;
  const importTo = rows[rows.length - 1]?.ts;
  const [run] = await db
    .insert(marketDataImports)
    .values({
      profileId: input.profileId,
      sourceId: source.id,
      instrumentId: instrument.id,
      mode: input.mode ?? "historical",
      status: rows.length ? "running" : "failed",
      requestedFrom: importFrom,
      requestedTo: importTo,
      rowsReceived: input.candles.length,
      rowsRejected: rejected,
      rowsDeduplicated: input.candles.length - accepted.size,
      errorLog: errors.slice(0, 50).join("\n"),
      startedAt: now,
      metadata: JSON.stringify({ sourceKey: input.sourceKey ?? source.key, canonicalTimeframe: "1m" }),
    })
    .returning();

  if (!rows.length) {
    await db.update(marketDataImports).set({ completedAt: new Date(), status: "failed" }).where(eq(marketDataImports.id, run.id));
    await recordMarketEngineEvent({
      sourceId: source.id,
      instrumentId: instrument.id,
      level: "warning",
      eventType: "import_rejected",
      message: "Aucune bougie valide dans le lot importé",
      context: { rejected, errors },
    });
    return { run, accepted: 0, rejected, deduplicated: input.candles.length - accepted.size, gaps: [] };
  }

  // Provider/source/instrument/timestamp is the canonical deduplication identity.
  await db
    .insert(candlesM1)
    .values(
      rows.map((c) => ({
        instrumentId: instrument.id,
        sourceId: source.id,
        importId: run.id,
        ts: c.ts,
        open: c.open,
        high: c.high,
        low: c.low,
        close: c.close,
        volume: c.volume,
        providerTimestamp: c.ts,
        isFinal: c.isFinal,
        quality: input.mode === "gap_recovery" ? "recovered" : c.isFinal ? "validated" : "provisional",
        updatedAt: new Date(),
      }))
    )
    .onConflictDoUpdate({
      target: [candlesM1.sourceId, candlesM1.instrumentId, candlesM1.ts],
      set: {
        open: sql`excluded.open`,
        high: sql`excluded.high`,
        low: sql`excluded.low`,
        close: sql`excluded.close`,
        volume: sql`excluded.volume`,
        importId: run.id,
        isFinal: sql`excluded.is_final`,
        quality: sql`excluded.quality`,
        updatedAt: new Date(),
      },
    });

  const rangeRows = await db
    .select({ ts: candlesM1.ts })
    .from(candlesM1)
    .where(
      and(
        eq(candlesM1.instrumentId, instrument.id),
        eq(candlesM1.sourceId, source.id),
        gte(candlesM1.ts, importFrom!),
        lte(candlesM1.ts, importTo!)
      )
    )
    .orderBy(asc(candlesM1.ts));
  const gaps = detectM1Gaps(rangeRows, instrument.marketHours);

  for (const gap of gaps) {
    await db
      .insert(marketDataGaps)
      .values({
        instrumentId: instrument.id,
        sourceId: source.id,
        timeframe: "1m",
        gapStart: gap.gapStart,
        gapEnd: gap.gapEnd,
        expectedBars: gap.expectedBars,
        status: "detected",
      })
      .onConflictDoNothing();
  }

  // A recovery import conclusively resolves gaps entirely covered by this valid range.
  if (input.mode === "gap_recovery") {
    await db
      .update(marketDataGaps)
      .set({ status: "resolved", resolvedAt: new Date() })
      .where(
        and(
          eq(marketDataGaps.instrumentId, instrument.id),
          eq(marketDataGaps.sourceId, source.id),
          gte(marketDataGaps.gapStart, importFrom!),
          lte(marketDataGaps.gapEnd, importTo!)
        )
      );
  }

  await db
    .update(marketDataImports)
    .set({
      status: rejected ? "partial" : "completed",
      rowsAccepted: rows.length,
      completedAt: new Date(),
    })
    .where(eq(marketDataImports.id, run.id));

  await runRetention();
  await recordMarketEngineEvent({
    sourceId: source.id,
    instrumentId: instrument.id,
    level: rejected ? "warning" : "info",
    eventType: "import_completed",
    message: `Import M1 terminé : ${rows.length} bougies acceptées, ${rejected} rejetées, ${gaps.length} gaps candidats`,
    context: { importId: run.id, rows: rows.length, rejected, gaps: gaps.length },
  });

  return { run, accepted: rows.length, rejected, deduplicated: input.candles.length - accepted.size, gaps };
}

export async function getMarketCandles(input: {
  instrumentId: string;
  timeframe: Timeframe;
  start?: Date;
  end?: Date;
  limit?: number;
}) {
  const source = await ensureManualSource("market");
  const limit = Math.min(Math.max(input.limit ?? 800, 1), input.timeframe === "1m" ? 5_000 : 30_000);
  const conditions = [eq(candlesM1.instrumentId, input.instrumentId), eq(candlesM1.sourceId, source.id)];
  if (input.start) conditions.push(gte(candlesM1.ts, input.start));
  if (input.end) conditions.push(lte(candlesM1.ts, input.end));

  const raw = await db
    .select({
      ts: candlesM1.ts,
      open: candlesM1.open,
      high: candlesM1.high,
      low: candlesM1.low,
      close: candlesM1.close,
      volume: candlesM1.volume,
      isFinal: candlesM1.isFinal,
      quality: candlesM1.quality,
    })
    .from(candlesM1)
    .where(and(...conditions))
    .orderBy(asc(candlesM1.ts))
    .limit(limit);

  return aggregateCandles(raw, input.timeframe);
}
