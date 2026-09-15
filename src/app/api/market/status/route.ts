import { NextResponse } from "next/server";
import { and, desc, eq, ne, sql } from "drizzle-orm";
import { db } from "@/db";
import { candlesM1, instruments, marketDataGaps, marketDataImports } from "@/db/schema";
import { requireUser, unauthorized } from "@/lib/auth";
import { RETENTION_YEARS, retentionCutoff } from "@/lib/market-engine";

export const dynamic = "force-dynamic";

/**
 * Vue d'exploitation sur un instrument : couverture des données, trous ouverts,
 * imports récents. Portée depuis la V2 et adaptée au schéma V1 :
 * - V1 ne stocke que du M1 (`candles_m1`) ; les timeframes supérieurs sont
 *   dérivés à la volée par `getMarketCandles` (agrégation), donc la couverture
 *   ne porte que sur le M1 (contrairement à V2 qui stocke chaque timeframe).
 * - Recherche de l'instrument par `symbol` (ex. EURUSD), comme dans la V2,
 *   mais résolue vers l'UUID interne `instruments.id` utilisé partout ailleurs
 *   dans le schéma V1.
 * - Réutilise `RETENTION_YEARS` / `retentionCutoff`, déjà exportés par
 *   `lib/market-engine.ts` (V1 avait déjà cette logique, pas besoin de la
 *   dupliquer comme le fait `market/importer.ts` en V2).
 */
export async function GET(req: Request) {
  if (!(await requireUser())) return unauthorized();

  const symbol = new URL(req.url).searchParams.get("instrument") ?? "EURUSD";
  const [instrument] = await db.select().from(instruments).where(eq(instruments.symbol, symbol));
  if (!instrument) return NextResponse.json({ error: "Instrument inconnu" }, { status: 404 });

  const cutoff = retentionCutoff();

  const [coverage] = await db
    .select({
      count: sql<number>`count(*)::int`,
      minTs: sql<string>`min(${candlesM1.ts})::text`,
      maxTs: sql<string>`max(${candlesM1.ts})::text`,
    })
    .from(candlesM1)
    .where(and(eq(candlesM1.instrumentId, instrument.id), sql`${candlesM1.ts} >= ${cutoff}`));

  const gaps = await db
    .select()
    .from(marketDataGaps)
    .where(
      and(
        eq(marketDataGaps.instrumentId, instrument.id),
        ne(marketDataGaps.status, "resolved"),
        ne(marketDataGaps.status, "ignored")
      )
    )
    .orderBy(desc(marketDataGaps.gapStart))
    .limit(50);

  const imports = await db
    .select()
    .from(marketDataImports)
    .where(eq(marketDataImports.instrumentId, instrument.id))
    .orderBy(desc(marketDataImports.createdAt))
    .limit(5);

  return NextResponse.json({
    instrument: instrument.symbol,
    name: instrument.displayName,
    license: "voir docs/MARKET_DATA_OPERATIONS.md",
    retentionYears: RETENTION_YEARS,
    retentionCutoff: cutoff.toISOString(),
    coverageM1: {
      count: coverage?.count ?? 0,
      from: coverage?.minTs ?? null,
      to: coverage?.maxTs ?? null,
    },
    openGaps: gaps.map((g) => ({
      from: g.gapStart.toISOString(),
      to: g.gapEnd.toISOString(),
      timeframe: g.timeframe,
      status: g.status,
      attempts: g.attempts,
    })),
    recentImports: imports.map((i) => ({
      mode: i.mode,
      status: i.status,
      rowsAccepted: i.rowsAccepted,
      at: i.createdAt.toISOString(),
    })),
  });
}
