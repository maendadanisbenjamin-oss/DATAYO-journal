import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { accounts, brokerConnections } from "@/db/schema";
import { requireUser, unauthorized } from "@/lib/auth";
import { syncBroker } from "@/lib/broker-sync-service";
import type { BrokerSyncMode } from "@/lib/broker/types";

export const dynamic = "force-dynamic";

const SYNC_MODES: readonly BrokerSyncMode[] = [
  "initial",
  "historical",
  "realtime",
  "manual",
];

function normalizeMode(value: unknown): BrokerSyncMode | null {
  return SYNC_MODES.includes(value as BrokerSyncMode)
    ? (value as BrokerSyncMode)
    : null;
}

function parseOptionalDate(value: unknown): Date | null {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const date = new Date(String(value));

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date;
}

export async function POST(req: Request) {
  const me = await requireUser();
  if (!me) return unauthorized();

  const body = await req.json().catch(() => ({}));

  const connectionId = String(body.connectionId ?? "").trim();
  const mode = normalizeMode(body.mode);

  if (!connectionId) {
    return NextResponse.json(
      { error: "Identifiant de connexion broker requis" },
      { status: 400 },
    );
  }

  if (!mode) {
    return NextResponse.json(
      { error: "Mode de synchronisation invalide" },
      { status: 400 },
    );
  }

  const from = parseOptionalDate(body.from);
  const to = parseOptionalDate(body.to);

  if (body.from !== undefined && body.from !== null && body.from !== "" && !from) {
    return NextResponse.json(
      { error: "Date de début invalide" },
      { status: 400 },
    );
  }

  if (body.to !== undefined && body.to !== null && body.to !== "" && !to) {
    return NextResponse.json(
      { error: "Date de fin invalide" },
      { status: 400 },
    );
  }

  if (from && to && from > to) {
    return NextResponse.json(
      {
        error:
          "La date de début de synchronisation doit être antérieure à la date de fin",
      },
      { status: 400 },
    );
  }

  if (mode === "historical" && (!from || !to)) {
    return NextResponse.json(
      {
        error:
          "Une date de début et une date de fin sont requises pour une synchronisation historique",
      },
      { status: 400 },
    );
  }

  const [connection] = await db
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

  if (!connection) {
    return NextResponse.json(
      { error: "Connexion broker introuvable" },
      { status: 404 },
    );
  }

  try {
    const result = await syncBroker({
      connectionId: connection.id,
      mode,
      from,
      to,
    });

    return NextResponse.json({
      ok: true,
      mode,
      connectionId: connection.id,
      result,
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Erreur de synchronisation broker.";

    return NextResponse.json(
      {
        error: message,
      },
      { status: 500 },
    );
  }
}