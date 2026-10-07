import { NextResponse } from "next/server";
import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import {
  accounts,
  brokerConnections,
  brokerSyncRuns,
  dataSources,
  instrumentSpecs,
  instruments,
  profiles,
} from "@/db/schema";
import { requireAdmin, unauthorized } from "@/lib/auth";
import { configuredProviders } from "@/lib/market-providers";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!(await requireAdmin())) return unauthorized();

  const [instrumentRows, specRows, sourceRows, providerRows, connectionRows, runRows] = await Promise.all([
    db.select().from(instruments).orderBy(instruments.symbol),
    db.select({ spec: instrumentSpecs, instrument: instruments })
      .from(instrumentSpecs).innerJoin(instruments, eq(instrumentSpecs.instrumentId, instruments.id))
      .orderBy(instruments.symbol, instrumentSpecs.broker),
    db.select().from(dataSources).orderBy(dataSources.name),
    Promise.resolve(configuredProviders()),
    db.select({
      id: brokerConnections.id,
      accountId: accounts.id,
      accountName: accounts.name,
      profileId: profiles.id,
      profileName: profiles.displayName,
      profileEmail: profiles.email,
      platform: brokerConnections.platform,
      brokerName: brokerConnections.brokerName,
      brokerAccountId: brokerConnections.brokerAccountId,
      serverName: brokerConnections.serverName,
      bridgeId: brokerConnections.bridgeId,
      status: brokerConnections.status,
      lastSeenAt: brokerConnections.lastSeenAt,
      lastSyncAt: brokerConnections.lastSyncAt,
      lastError: brokerConnections.lastError,
      updatedAt: brokerConnections.updatedAt,
    }).from(brokerConnections)
      .innerJoin(accounts, eq(brokerConnections.accountId, accounts.id))
      .innerJoin(profiles, eq(accounts.profileId, profiles.id))
      .orderBy(desc(brokerConnections.updatedAt)),
    db.select().from(brokerSyncRuns).orderBy(desc(brokerSyncRuns.startedAt)).limit(50),
  ]);

  const persisted = new Map(sourceRows.map((source) => [source.key, source]));
  const providers = providerRows.map((provider) => {
    const source = persisted.get(provider.key);
    return {
      ...provider,
      active: source?.isActive ?? provider.configured,
      licenseStatus: source?.licenseStatus ?? "unverified",
      licenseNotes: source?.licenseNotes ?? provider.notes,
    };
  });

  return NextResponse.json({
    instruments: instrumentRows,
    instrumentSpecs: specRows,
    providers,
    connections: connectionRows,
    syncRuns: runRows,
  });
}

export async function PATCH(req: Request) {
  if (!(await requireAdmin())) return unauthorized();
  const body = await req.json().catch(() => ({}));
  const action = String(body.action ?? "");

  if (action === "instrument_status") {
    const id = String(body.id ?? "");
    if (!id || typeof body.isActive !== "boolean") {
      return NextResponse.json({ error: "Instrument et statut requis" }, { status: 400 });
    }
    const [row] = await db.update(instruments)
      .set({ isActive: body.isActive, updatedAt: new Date() })
      .where(eq(instruments.id, id)).returning({ id: instruments.id });
    if (!row) return NextResponse.json({ error: "Instrument introuvable" }, { status: 404 });
    return NextResponse.json({ ok: true });
  }

  if (action === "provider") {
    const key = String(body.key ?? "");
    const provider = configuredProviders().find((item) => item.key === key);
    const licenseStatus = String(body.licenseStatus ?? "unverified");
    if (!provider || typeof body.active !== "boolean" || !["unverified", "verified_internal", "blocked"].includes(licenseStatus)) {
      return NextResponse.json({ error: "Paramètres provider invalides" }, { status: 400 });
    }
    await db.insert(dataSources).values({
      key: provider.key,
      name: provider.name,
      providerKind: provider.kind,
      licenseStatus,
      licenseNotes: String(body.licenseNotes ?? provider.notes).slice(0, 2000),
      retentionPolicy: "15_year_rolling",
      configEnvKey: provider.envKey,
      isActive: body.active,
    }).onConflictDoUpdate({
      target: dataSources.key,
      set: {
        licenseStatus,
        licenseNotes: String(body.licenseNotes ?? provider.notes).slice(0, 2000),
        isActive: body.active,
        updatedAt: new Date(),
      },
    });
    return NextResponse.json({ ok: true });
  }

  if (action === "connection_status") {
    const id = String(body.id ?? "");
    if (!id || !["pending", "disabled"].includes(String(body.status))) {
      return NextResponse.json({ error: "Connexion ou statut invalide" }, { status: 400 });
    }
    const [row] = await db.update(brokerConnections)
      .set({ status: body.status, updatedAt: new Date() })
      .where(eq(brokerConnections.id, id)).returning({ id: brokerConnections.id });
    if (!row) return NextResponse.json({ error: "Connexion introuvable" }, { status: 404 });
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "Action invalide" }, { status: 400 });
}
