import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { accounts, brokerConnections } from "@/db/schema";
import { requireUser, unauthorized } from "@/lib/auth";
import { createBridgeTokenHash } from "@/lib/broker/security";
import type { BrokerPlatform } from "@/lib/broker/types";

export const dynamic = "force-dynamic";

type Ctx = {
  params: Promise<{ id: string }>;
};

function normalizePlatform(value: unknown): BrokerPlatform | null {
  return value === "mt4" || value === "mt5" ? value : null;
}

const publicFields = {
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
};

export async function GET(_req: Request, { params }: Ctx) {
  const me = await requireUser();
  if (!me) return unauthorized();

  const { id } = await params;
  const connectionId = String(id).trim();

  if (!connectionId) {
    return NextResponse.json(
      { error: "Identifiant de connexion broker requis" },
      { status: 400 },
    );
  }

  const [row] = await db
    .select(publicFields)
    .from(brokerConnections)
    .innerJoin(accounts, eq(brokerConnections.accountId, accounts.id))
    .where(
      and(
        eq(brokerConnections.id, connectionId),
        eq(accounts.profileId, me.id),
      ),
    )
    .limit(1);

  if (!row) {
    return NextResponse.json(
      { error: "Connexion broker introuvable" },
      { status: 404 },
    );
  }

  return NextResponse.json(row);
}

export async function PATCH(req: Request, { params }: Ctx) {
  const me = await requireUser();
  if (!me) return unauthorized();

  const { id } = await params;
  const connectionId = String(id).trim();

  if (!connectionId) {
    return NextResponse.json(
      { error: "Identifiant de connexion broker requis" },
      { status: 400 },
    );
  }

  const [existing] = await db
    .select({
      id: brokerConnections.id,
    })
    .from(brokerConnections)
    .innerJoin(accounts, eq(brokerConnections.accountId, accounts.id))
    .where(
      and(
        eq(brokerConnections.id, connectionId),
        eq(accounts.profileId, me.id),
      ),
    )
    .limit(1);

  if (!existing) {
    return NextResponse.json(
      { error: "Connexion broker introuvable" },
      { status: 404 },
    );
  }

  const body = await req.json().catch(() => ({}));

  const updates: {
    platform?: BrokerPlatform;
    brokerName?: string;
    brokerAccountId?: string;
    serverName?: string;
    bridgeId?: string;
    bridgeTokenHash?: string;
    updatedAt: Date;
  } = {
    updatedAt: new Date(),
  };

  if (body.platform !== undefined) {
    const platform = normalizePlatform(body.platform);

    if (!platform) {
      return NextResponse.json(
        { error: "Plateforme broker invalide" },
        { status: 400 },
      );
    }

    updates.platform = platform;
  }

  if (body.brokerName !== undefined) {
    updates.brokerName = String(body.brokerName).trim().slice(0, 120);
  }

  if (body.brokerAccountId !== undefined) {
    const brokerAccountId = String(body.brokerAccountId).trim().slice(0, 120);

    if (!brokerAccountId) {
      return NextResponse.json(
        { error: "Identifiant du compte broker requis" },
        { status: 400 },
      );
    }

    updates.brokerAccountId = brokerAccountId;
  }

  if (body.serverName !== undefined) {
    updates.serverName = String(body.serverName).trim().slice(0, 120);
  }

  if (body.bridgeId !== undefined) {
    const bridgeId = String(body.bridgeId).trim().slice(0, 120);

    if (!bridgeId) {
      return NextResponse.json(
        { error: "Identifiant du bridge requis" },
        { status: 400 },
      );
    }

    updates.bridgeId = bridgeId;
  }

  if (body.bridgeToken !== undefined) {
    const bridgeToken = String(body.bridgeToken).trim();

    if (!bridgeToken) {
      return NextResponse.json(
        { error: "Token du bridge requis" },
        { status: 400 },
      );
    }

    updates.bridgeTokenHash = createBridgeTokenHash(bridgeToken);
  }

  try {
    const [row] = await db
      .update(brokerConnections)
      .set(updates)
      .where(eq(brokerConnections.id, connectionId))
      .returning(publicFields);

    if (!row) {
      return NextResponse.json(
        { error: "Impossible de modifier la connexion broker" },
        { status: 500 },
      );
    }

    return NextResponse.json(row);
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Impossible de modifier la connexion broker.";

    if (message.includes("broker_connections_bridge_id_idx")) {
      return NextResponse.json(
        { error: "Cet identifiant de bridge est déjà utilisé" },
        { status: 409 },
      );
    }

    throw error;
  }
}

export async function DELETE(_req: Request, { params }: Ctx) {
  const me = await requireUser();
  if (!me) return unauthorized();

  const { id } = await params;
  const connectionId = String(id).trim();

  if (!connectionId) {
    return NextResponse.json(
      { error: "Identifiant de connexion broker requis" },
      { status: 400 },
    );
  }

  const [existing] = await db
    .select({
      id: brokerConnections.id,
    })
    .from(brokerConnections)
    .innerJoin(accounts, eq(brokerConnections.accountId, accounts.id))
    .where(
      and(
        eq(brokerConnections.id, connectionId),
        eq(accounts.profileId, me.id),
      ),
    )
    .limit(1);

  if (!existing) {
    return NextResponse.json(
      { error: "Connexion broker introuvable" },
      { status: 404 },
    );
  }

  await db
    .delete(brokerConnections)
    .where(eq(brokerConnections.id, connectionId));

  return NextResponse.json({ ok: true });
}