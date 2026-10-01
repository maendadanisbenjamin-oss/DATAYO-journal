import "server-only";

import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import {
  brokerConnections,
  brokerDeals,
  brokerOrders,
  brokerPositions,
  brokerSyncRuns,
} from "@/db/schema";
import { getBrokerAdapter } from "@/lib/broker/registry";
import type {
  BrokerConnectionContext,
  BrokerHistoryRange,
} from "@/lib/broker/adapter";
import type {
  BrokerDeal,
  BrokerOrder,
  BrokerPlatform,
  BrokerPosition,
  BrokerSyncRequest,
  BrokerSyncResult,
  BrokerSyncStatus,
} from "@/lib/broker/types";

function normalizePlatform(value: string): BrokerPlatform {
  if (value === "mt4" || value === "mt5") {
    return value;
  }

  throw new Error(`Plateforme broker non prise en charge : ${value}`);
}

async function getConnection(connectionId: string) {
  const normalizedId = String(connectionId).trim();

  if (!normalizedId) {
    throw new Error("L'identifiant de connexion broker est requis.");
  }

  const [connection] = await db
    .select()
    .from(brokerConnections)
    .where(eq(brokerConnections.id, normalizedId))
    .limit(1);

  if (!connection) {
    throw new Error("Connexion broker introuvable.");
  }

  return connection;
}

function buildConnectionContext(
  connection: typeof brokerConnections.$inferSelect,
): BrokerConnectionContext {
  return {
    connectionId: connection.id,
    platform: normalizePlatform(connection.platform),
    brokerName: connection.brokerName,
    brokerAccountId: connection.brokerAccountId,
    serverName: connection.serverName,
    bridgeId: connection.bridgeId,
  };
}

function validateRequest(request: BrokerSyncRequest): void {
  if (!request.connectionId.trim()) {
    throw new Error("L'identifiant de connexion broker est requis.");
  }

  if (request.from && request.to && request.from > request.to) {
    throw new Error(
      "La date de début de synchronisation doit être antérieure à la date de fin.",
    );
  }
}

function serializeRawData(value: unknown): string {
  if (value === undefined || value === null) {
    return "{}";
  }

  try {
    return JSON.stringify(value);
  } catch {
    return "{}";
  }
}

function serializeMagicNumber(value: number | null): string {
  return value === null ? "" : String(value);
}

async function upsertOrders(
  connectionId: string,
  orders: BrokerOrder[],
): Promise<{ created: number; updated: number }> {
  let created = 0;
  let updated = 0;

  for (const order of orders) {
    const [existing] = await db
      .select({ id: brokerOrders.id })
      .from(brokerOrders)
      .where(
        and(
          eq(brokerOrders.connectionId, connectionId),
          eq(brokerOrders.brokerOrderId, order.brokerOrderId),
        ),
      )
      .limit(1);

    const values = {
      connectionId,
      brokerOrderId: order.brokerOrderId,
      symbol: order.symbol,
      orderType: order.orderType,
      side: order.side,
      volume: order.volume,
      price: order.price,
      stopLoss: order.stopLoss,
      takeProfit: order.takeProfit,
      status: order.status,
      openedAt: order.openedAt,
      updatedAt: order.updatedAt,
      closedAt: order.closedAt,
      magicNumber: serializeMagicNumber(order.magicNumber),
      comment: order.comment ?? "",
      rawData: serializeRawData(order.rawData),
      syncedAt: new Date(),
    };

    if (existing) {
      await db
        .update(brokerOrders)
        .set(values)
        .where(eq(brokerOrders.id, existing.id));

      updated += 1;
    } else {
      await db.insert(brokerOrders).values(values);
      created += 1;
    }
  }

  return { created, updated };
}

async function upsertDeals(
  connectionId: string,
  deals: BrokerDeal[],
): Promise<{ created: number; updated: number }> {
  let created = 0;
  let updated = 0;

  for (const deal of deals) {
    const [existing] = await db
      .select({ id: brokerDeals.id })
      .from(brokerDeals)
      .where(
        and(
          eq(brokerDeals.connectionId, connectionId),
          eq(brokerDeals.brokerDealId, deal.brokerDealId),
        ),
      )
      .limit(1);

    const values = {
      connectionId,
      brokerDealId: deal.brokerDealId,
      brokerOrderId: deal.brokerOrderId,
      brokerPositionId: deal.brokerPositionId,
      symbol: deal.symbol,
      dealType: deal.dealType,
      side: deal.side ?? "",
      volume: deal.volume,
      price: deal.price,
      commission: deal.commission,
      swap: deal.swap,
      profit: deal.profit,
      fee: deal.fee,
      executedAt: deal.executedAt,
      magicNumber: serializeMagicNumber(deal.magicNumber),
      comment: deal.comment ?? "",
      rawData: serializeRawData(deal.rawData),
      syncedAt: new Date(),
    };

    if (existing) {
      await db
        .update(brokerDeals)
        .set(values)
        .where(eq(brokerDeals.id, existing.id));

      updated += 1;
    } else {
      await db.insert(brokerDeals).values(values);
      created += 1;
    }
  }

  return { created, updated };
}

async function upsertPositions(
  connectionId: string,
  positions: BrokerPosition[],
): Promise<{ created: number; updated: number }> {
  let created = 0;
  let updated = 0;

  for (const position of positions) {
    const [existing] = await db
      .select({ id: brokerPositions.id })
      .from(brokerPositions)
      .where(
        and(
          eq(brokerPositions.connectionId, connectionId),
          eq(
            brokerPositions.brokerPositionId,
            position.brokerPositionId,
          ),
        ),
      )
      .limit(1);

    const values = {
      connectionId,
      brokerPositionId: position.brokerPositionId,
      symbol: position.symbol,
      direction: position.direction,
      volume: position.volume,
      entryPrice: position.entryPrice,
      currentPrice: position.currentPrice ?? 0,
      stopLoss: position.stopLoss,
      takeProfit: position.takeProfit,
      profit: position.profit,
      swap: position.swap,
      commission: position.commission,
      openedAt: position.openedAt,
      closedAt: position.closedAt,
      status: position.status,
      magicNumber: serializeMagicNumber(position.magicNumber),
      comment: position.comment ?? "",
      rawData: serializeRawData(position.rawData),
      syncedAt: new Date(),
    };

    if (existing) {
      await db
        .update(brokerPositions)
        .set(values)
        .where(eq(brokerPositions.id, existing.id));

      updated += 1;
    } else {
      await db.insert(brokerPositions).values(values);
      created += 1;
    }
  }

  return { created, updated };
}

async function collectSyncData(
  connectionId: string,
  mode: BrokerSyncRequest["mode"],
  from: Date | null,
  to: Date | null,
): Promise<BrokerSyncResult> {
  const connection = await getConnection(connectionId);
  const context = buildConnectionContext(connection);
  const adapter = getBrokerAdapter(context.platform);

  if (mode === "initial" || mode === "realtime" || mode === "manual") {
    const [orders, positions, account] = await Promise.all([
      adapter.getOpenOrders(),
      adapter.getOpenPositions(),
      adapter.getAccountSnapshot(),
    ]);

    let deals: BrokerDeal[] = [];

    if (mode !== "realtime" && from && to) {
      deals = await adapter.getHistoricalDeals({ from, to });
    }

    return {
      orders,
      deals,
      positions,
      account,
    };
  }

  if (!from || !to) {
    throw new Error(
      "Une plage de dates est requise pour une synchronisation historique.",
    );
  }

  const range: BrokerHistoryRange = { from, to };

  const [orders, deals] = await Promise.all([
    adapter.getHistoricalOrders(range),
    adapter.getHistoricalDeals(range),
  ]);

  return {
    orders,
    deals,
    positions: [],
    account: null,
  };
}

export async function syncBroker(
  request: BrokerSyncRequest,
): Promise<BrokerSyncResult> {
  validateRequest(request);

  const connection = await getConnection(request.connectionId);

  const [syncRun] = await db
    .insert(brokerSyncRuns)
    .values({
      connectionId: connection.id,
      mode: request.mode,
      status: "running",
      requestedFrom: request.from,
      requestedTo: request.to,
      startedAt: new Date(),
      errorLog: "",
      metadata: "{}",
    })
    .returning({ id: brokerSyncRuns.id });

  if (!syncRun) {
    throw new Error("Impossible de créer le run de synchronisation broker.");
  }

  try {
    const result = await collectSyncData(
      connection.id,
      request.mode,
      request.from,
      request.to,
    );

    const orderStats = await upsertOrders(connection.id, result.orders);
    const dealStats = await upsertDeals(connection.id, result.deals);
    const positionStats = await upsertPositions(
      connection.id,
      result.positions,
    );

    const status: BrokerSyncStatus = "completed";

    await db
      .update(brokerSyncRuns)
      .set({
        status,
        completedAt: new Date(),
        ordersReceived: result.orders.length,
        ordersCreated: orderStats.created,
        ordersUpdated: orderStats.updated,
        dealsReceived: result.deals.length,
        dealsCreated: dealStats.created,
        dealsUpdated: dealStats.updated,
        positionsReceived: result.positions.length,
        positionsCreated: positionStats.created,
        positionsUpdated: positionStats.updated,
      })
      .where(eq(brokerSyncRuns.id, syncRun.id));

    await db
      .update(brokerConnections)
      .set({
        status: "connected",
        lastSyncAt: new Date(),
        lastSeenAt: new Date(),
        lastError: "",
        updatedAt: new Date(),
      })
      .where(eq(brokerConnections.id, connection.id));

    return result;
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Erreur de synchronisation broker.";

    await db
      .update(brokerSyncRuns)
      .set({
        status: "failed",
        completedAt: new Date(),
        errorLog: message,
      })
      .where(eq(brokerSyncRuns.id, syncRun.id));

    await db
      .update(brokerConnections)
      .set({
        status: "error",
        lastError: message,
        updatedAt: new Date(),
      })
      .where(eq(brokerConnections.id, connection.id));

    throw error;
  }
}
