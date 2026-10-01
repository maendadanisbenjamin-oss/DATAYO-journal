import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { accounts, brokerConnections } from "@/db/schema";
import { requireUser, unauthorized } from "@/lib/auth";
import { createBridgeTokenHash } from "@/lib/broker/security";
import type { BrokerPlatform } from "@/lib/broker/types";

export const dynamic = "force-dynamic";

function normalizePlatform(value: unknown): BrokerPlatform | null {
  return value === "mt4" || value === "mt5" ? value : null;
}

export async function GET() {
  const me = await requireUser();
  if (!me) return unauthorized();

  const rows = await db
    .select({
      id: brokerConnections.id,
      accountId: brokerConnections.accountId,
      platform: brokerConnections.platform,
      brokerName: brokerConnections.brokerName,
      brokerAccountId: brokerConnections.brokerAccountId,
      serverName: brokerConnections.serverName,
      bridgeId: brokerConnections.bridgeId,
      status: brokerConnections.status,
      lastSeenAt: brokerConnections.lastSeenAt,
      lastSyncAt: brokerConnections.lastSyncAt,
      lastError: brokerConnections.lastError,
      metadata: brokerConnections.metadata,
      createdAt: brokerConnections.createdAt,
      updatedAt: brokerConnections.updatedAt,
    })
    .from(brokerConnections)
    .innerJoin(accounts, eq(brokerConnections.accountId, accounts.id))
    .where(eq(accounts.profileId, me.id));

  return NextResponse.json(rows);
}

export async function POST(req: Request) {
  const me = await requireUser();
  if (!me) return unauthorized();

  const body = await req.json().catch(() => ({}));

  const accountId = String(body.accountId ?? "").trim();
  const platform = normalizePlatform(body.platform);
  const brokerName = String(body.brokerName ?? "").trim().slice(0, 120);
  const brokerAccountId = String(body.brokerAccountId ?? "").trim().slice(0, 120);
  const serverName = String(body.serverName ?? "").trim().slice(0, 120);
  const bridgeId = String(body.bridgeId ?? "").trim().slice(0, 120);
  const bridgeToken = String(body.bridgeToken ?? "").trim();

  if (!accountId) {
    return NextResponse.json(
      { error: "Compte requis" },
      { status: 400 },
    );
  }

  if (!platform) {
    return NextResponse.json(
      { error: "Plateforme broker invalide" },
      { status: 400 },
    );
  }

  if (!brokerAccountId) {
    return NextResponse.json(
      { error: "Identifiant du compte broker requis" },
      { status: 400 },
    );
  }

  if (!bridgeId) {
    return NextResponse.json(
      { error: "Identifiant du bridge requis" },
      { status: 400 },
    );
  }

  if (!bridgeToken) {
    return NextResponse.json(
      { error: "Token du bridge requis" },
      { status: 400 },
    );
  }

  const [account] = await db
    .select({ id: accounts.id })
    .from(accounts)
    .where(
      and(
        eq(accounts.id, accountId),
        eq(accounts.profileId, me.id),
      ),
    )
    .limit(1);

  if (!account) {
    return NextResponse.json(
      { error: "Compte introuvable ou accès refusé" },
      { status: 404 },
    );
  }

  try {
    const bridgeTokenHash = createBridgeTokenHash(bridgeToken);

    const [row] = await db
      .insert(brokerConnections)
      .values({
        accountId,
        platform,
        brokerName,
        brokerAccountId,
        serverName,
        bridgeId,
        bridgeTokenHash,
        status: "pending",
      })
      .returning({
        id: brokerConnections.id,
        accountId: brokerConnections.accountId,
        platform: brokerConnections.platform,
        brokerName: brokerConnections.brokerName,
        brokerAccountId: brokerConnections.brokerAccountId,
        serverName: brokerConnections.serverName,
        bridgeId: brokerConnections.bridgeId,
        status: brokerConnections.status,
        lastSeenAt: brokerConnections.lastSeenAt,
        lastSyncAt: brokerConnections.lastSyncAt,
        lastError: brokerConnections.lastError,
        metadata: brokerConnections.metadata,
        createdAt: brokerConnections.createdAt,
        updatedAt: brokerConnections.updatedAt,
      });

    if (!row) {
      return NextResponse.json(
        { error: "Impossible de créer la connexion broker" },
        { status: 500 },
      );
    }

    return NextResponse.json(row, { status: 201 });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Impossible de créer la connexion broker.";

    if (message.includes("broker_connections_bridge_id_idx")) {
      return NextResponse.json(
        { error: "Cet identifiant de bridge est déjà utilisé" },
        { status: 409 },
      );
    }

    throw error;
  }
}
