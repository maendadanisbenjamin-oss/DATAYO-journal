import "server-only";

import { eq } from "drizzle-orm";
import { db } from "@/db";
import { brokerConnections } from "@/db/schema";
import { getBrokerAdapter } from "@/lib/broker/registry";
import type {
  BrokerConnectionContext,
  BrokerConnectionState,
} from "@/lib/broker/adapter";
import type { BrokerPlatform } from "@/lib/broker/types";

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

export async function connectBroker(
  connectionId: string,
): Promise<BrokerConnectionState> {
  const connection = await getConnection(connectionId);
  const context = buildConnectionContext(connection);
  const adapter = getBrokerAdapter(context.platform);

  try {
    await adapter.connect(context);

    const state = await adapter.getConnectionState();

    await db
      .update(brokerConnections)
      .set({
        status: state.status,
        lastSeenAt: state.lastSeenAt,
        lastError: state.lastError ?? "",
        updatedAt: new Date(),
      })
      .where(eq(brokerConnections.id, connection.id));

    return state;
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Erreur de connexion broker.";

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

export async function disconnectBroker(
  connectionId: string,
): Promise<BrokerConnectionState> {
  const connection = await getConnection(connectionId);
  const context = buildConnectionContext(connection);
  const adapter = getBrokerAdapter(context.platform);

  await adapter.disconnect();

  const state = await adapter.getConnectionState();

  await db
    .update(brokerConnections)
    .set({
      status: state.status,
      lastSeenAt: state.lastSeenAt,
      lastError: state.lastError ?? "",
      updatedAt: new Date(),
    })
    .where(eq(brokerConnections.id, connection.id));

  return state;
}

export async function getBrokerConnectionState(
  connectionId: string,
): Promise<BrokerConnectionState> {
  const connection = await getConnection(connectionId);
  const context = buildConnectionContext(connection);
  const adapter = getBrokerAdapter(context.platform);

  return adapter.getConnectionState();
}
