import "server-only";
import { and, asc, desc, eq, gt, lte, sql } from "drizzle-orm";
import { db } from "@/db";
import { candlesM1, replayActions, replaySessions, replayTrades } from "@/db/schema";
import { ensureManualSource } from "@/lib/market-engine";
import { getMarketCandles } from "@/lib/market-data-service";
import { listEconomicEvents } from "@/lib/economic-calendar-service";
import { closePosition, markPosition, openPosition, updateStops, type SimulatedPosition } from "@/lib/position-engine";

export async function getOwnedReplay(profileId: string, id: string) {
  const [session] = await db.select().from(replaySessions).where(and(eq(replaySessions.id, id), eq(replaySessions.profileId, profileId)));
  return session ?? null;
}

function toPosition(row: typeof replayTrades.$inferSelect): SimulatedPosition {
  return {
    direction: row.direction === "short" ? "short" : "long",
    openedAt: row.openedAt,
    entryPrice: row.entryPrice,
    stopLoss: row.stopLoss,
    takeProfit: row.takeProfit,
    quantity: row.quantity,
    riskAmount: row.riskAmount,
    commission: row.commission,
    status: row.status as SimulatedPosition["status"],
    closedAt: row.closedAt,
    exitPrice: row.exitPrice,
    pnl: row.pnl,
    rMultiple: row.rMultiple,
  };
}

export async function replaySnapshot(profileId: string, id: string) {
  const session = await getOwnedReplay(profileId, id);
  if (!session) throw new Error("Session Replay introuvable");

  // Strict as-of bound: no API call returns a candle after simulatedAt.
  const candles = await getMarketCandles({
    instrumentId: session.instrumentId,
    timeframe: session.timeframe as Parameters<typeof getMarketCandles>[0]["timeframe"],
    start: session.startAt,
    end: session.simulatedAt,
    limit: 1500,
  });
  const events = await listEconomicEvents({
    from: new Date(session.simulatedAt.getTime() - 24 * 60 * 60_000),
    to: new Date(session.simulatedAt.getTime() + 24 * 60 * 60_000),
    asOf: session.simulatedAt,
    limit: 200,
  });
  const positions = await db.select().from(replayTrades).where(eq(replayTrades.replaySessionId, session.id)).orderBy(asc(replayTrades.openedAt));
  return { session, candles, events, positions };
}

export async function advanceReplay(profileId: string, id: string, steps = 1) {
  const source = await ensureManualSource("market");

  return db.transaction(async (tx) => {
    const locked = await tx.execute<{ id: string }>(
      sql`SELECT id FROM ${replaySessions} WHERE id = ${id} AND profile_id = ${profileId} FOR UPDATE`,
    );

    if (!locked.rows.length) throw new Error("Session Replay introuvable");

    const [session] = await tx
      .select()
      .from(replaySessions)
      .where(and(eq(replaySessions.id, id), eq(replaySessions.profileId, profileId)));

    if (!session) throw new Error("Session Replay introuvable");
    if (session.status === "completed") throw new Error("Cette session Replay est terminée");

    let currentAt = session.simulatedAt;
    let currentEquity = session.currentEquity;
    let processed = 0;

    const normalizedSteps = Number.isFinite(steps)
      ? Math.min(Math.max(Math.trunc(steps), 1), 120)
      : 1;

    for (let step = 0; step < normalizedSteps; step++) {
      const [next] = await tx
        .select()
        .from(candlesM1)
        .where(
          and(
            eq(candlesM1.instrumentId, session.instrumentId),
            eq(candlesM1.sourceId, source.id),
            gt(candlesM1.ts, currentAt),
          ),
        )
        .orderBy(asc(candlesM1.ts))
        .limit(1);

      if (!next) break;

      const openRows = await tx
        .select()
        .from(replayTrades)
        .where(
          and(
            eq(replayTrades.replaySessionId, session.id),
            eq(replayTrades.status, "open"),
          ),
        );

      for (const row of openRows) {
        const marked = markPosition(toPosition(row), next);

        if (marked.status !== "open") {
          const [updatedTrade] = await tx
            .update(replayTrades)
            .set({
              status: marked.status,
              closedAt: marked.closedAt,
              exitPrice: marked.exitPrice,
              pnl: marked.pnl,
              rMultiple: marked.rMultiple,
            })
            .where(
              and(
                eq(replayTrades.id, row.id),
                eq(replayTrades.status, "open"),
              ),
            )
            .returning();

          if (!updatedTrade) continue;

          currentEquity += marked.pnl;

          await tx.insert(replayActions).values({
            replaySessionId: session.id,
            replayTradeId: row.id,
            simulatedAt: next.ts,
            actionType: marked.status === "target" ? "take_profit_hit" : "stop_loss_hit",
            payload: JSON.stringify({
              exitPrice: marked.exitPrice,
              pnl: marked.pnl,
              rMultiple: marked.rMultiple,
            }),
          });
        }
      }

      currentAt = next.ts;
      processed++;
    }

    const status = processed ? "paused" : "completed";

    const [updated] = await tx
      .update(replaySessions)
      .set({
        simulatedAt: currentAt,
        currentEquity,
        status,
        updatedAt: new Date(),
      })
      .where(eq(replaySessions.id, session.id))
      .returning();

    await tx.insert(replayActions).values({
      replaySessionId: session.id,
      simulatedAt: currentAt,
      actionType: "next_candle",
      payload: JSON.stringify({ steps: processed }),
    });

    return updated;
  });
}
export async function replayOrder(input: {
  profileId: string;
  replayId: string;
  action: "buy" | "sell" | "move_sl" | "move_tp" | "close";
  replayTradeId?: string;
  stopLoss?: number | null;
  takeProfit?: number | null;
  quantity?: number;
  commission?: number;
}) {
  const source = await ensureManualSource("market");

  return db.transaction(async (tx) => {
    const locked = await tx.execute<{ id: string }>(
      sql`SELECT id FROM ${replaySessions} WHERE id = ${input.replayId} AND profile_id = ${input.profileId} FOR UPDATE`,
    );

    if (!locked.rows.length) throw new Error("Session Replay introuvable");

    const [session] = await tx
      .select()
      .from(replaySessions)
      .where(and(eq(replaySessions.id, input.replayId), eq(replaySessions.profileId, input.profileId)));

    if (!session) throw new Error("Session Replay introuvable");
    if (session.status === "completed") throw new Error("Cette session Replay est termin?e");

    const [currentCandle] = await tx
      .select()
      .from(candlesM1)
      .where(
        and(
          eq(candlesM1.instrumentId, session.instrumentId),
          eq(candlesM1.sourceId, source.id),
          lte(candlesM1.ts, session.simulatedAt),
        ),
      )
      .orderBy(desc(candlesM1.ts))
      .limit(1);

    if (!currentCandle) throw new Error("Aucune bougie disponible au temps simul?");

    if (input.action === "buy" || input.action === "sell") {
      const position = openPosition({
        direction: input.action === "buy" ? "long" : "short",
        openedAt: session.simulatedAt,
        entryPrice: currentCandle.close,
        stopLoss: input.stopLoss ?? null,
        takeProfit: input.takeProfit ?? null,
        quantity: Number(input.quantity ?? 1),
        commission: Number(input.commission ?? 0),
      });

      const [trade] = await tx
        .insert(replayTrades)
        .values({
          replaySessionId: session.id,
          instrumentId: session.instrumentId,
          direction: position.direction,
          openedAt: position.openedAt,
          entryPrice: position.entryPrice,
          stopLoss: position.stopLoss,
          takeProfit: position.takeProfit,
          quantity: position.quantity,
          riskAmount: position.riskAmount,
          commission: position.commission,
        })
        .returning();

      await tx.insert(replayActions).values({
        replaySessionId: session.id,
        replayTradeId: trade.id,
        simulatedAt: session.simulatedAt,
        actionType: input.action,
        payload: JSON.stringify(input),
      });

      return trade;
    }

    if (!input.replayTradeId) throw new Error("replayTradeId requis");

    const [row] = await tx
      .select()
      .from(replayTrades)
      .where(
        and(
          eq(replayTrades.id, input.replayTradeId),
          eq(replayTrades.replaySessionId, session.id),
        ),
      );

    if (!row) throw new Error("Position Replay introuvable");

    let position = toPosition(row);

    if (input.action === "move_sl") {
      position = updateStops(position, { stopLoss: input.stopLoss ?? null });
    } else if (input.action === "move_tp") {
      position = updateStops(position, { takeProfit: input.takeProfit ?? null });
    } else {
      position = closePosition(position, currentCandle.close, session.simulatedAt);
    }

    const [updated] = await tx
      .update(replayTrades)
      .set({
        stopLoss: position.stopLoss,
        takeProfit: position.takeProfit,
        status: position.status,
        closedAt: position.closedAt,
        exitPrice: position.exitPrice,
        pnl: position.pnl,
        rMultiple: position.rMultiple,
      })
      .where(
        and(
          eq(replayTrades.id, row.id),
          eq(replayTrades.status, "open"),
        ),
      )
      .returning();

    if (!updated) {
      throw new Error("La position est d?j? cl?tur?e");
    }

    if (position.status !== "open") {
      await tx
        .update(replaySessions)
        .set({
          currentEquity: sql`${replaySessions.currentEquity} + ${position.pnl}`,
          updatedAt: new Date(),
        })
        .where(eq(replaySessions.id, session.id));
    }

    await tx.insert(replayActions).values({
      replaySessionId: session.id,
      replayTradeId: row.id,
      simulatedAt: session.simulatedAt,
      actionType: input.action,
      payload: JSON.stringify(input),
    });

    return updated;
  });
}
