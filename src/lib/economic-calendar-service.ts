import "server-only";
import { and, asc, eq, gt, gte, inArray, lte, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  economicCalendarImports,
  economicEventRevisions,
  economicEvents,
  tradeEconomicEvents,
  trades,
} from "@/db/schema";
import { ensureManualSource, retentionCutoff, runRetention } from "@/lib/market-engine";

const IMPORTANCES = new Set(["low", "medium", "high"]);
const STATUSES = new Set(["scheduled", "released", "revised", "cancelled"]);

export type EconomicEventInput = {
  externalId?: string;
  scheduledAt: string | Date;
  knownAt: string | Date;
  publishedAt?: string | Date | null;
  timezone?: string;
  country?: string;
  region?: string;
  currency?: string;
  title: string;
  category?: string;
  importance?: "low" | "medium" | "high";
  previous?: string | null;
  forecast?: string | null;
  actual?: string | null;
  revision?: string | null;
  status?: "scheduled" | "released" | "revised" | "cancelled";
  sourceUrl?: string;
  metadata?: unknown;
};

function date(value: string | Date | null | undefined, label: string) {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) throw new Error(`${label} invalide`);
  return d;
}

export function normalizeEconomicEvent(input: EconomicEventInput) {
  const scheduledAt = date(input.scheduledAt, "Date planifiée");
  const knownAt = date(input.knownAt, "Date de connaissance");
  const publishedAt = date(input.publishedAt, "Date de publication");
  if (!scheduledAt || !knownAt) throw new Error("scheduledAt et knownAt sont requis");
  if (publishedAt && publishedAt < knownAt) throw new Error("publishedAt ne peut pas précéder knownAt");
  const title = String(input.title ?? "").trim();
  if (!title) throw new Error("Nom de l'événement requis");
  const importance = IMPORTANCES.has(input.importance ?? "medium") ? (input.importance ?? "medium") : "medium";
  const status = STATUSES.has(input.status ?? "scheduled") ? (input.status ?? "scheduled") : "scheduled";
  const externalId = String(input.externalId ?? `${title}:${scheduledAt.toISOString()}`).slice(0, 240);
  return {
    externalId,
    scheduledAt,
    knownAt,
    publishedAt,
    timezone: String(input.timezone ?? "UTC").slice(0, 80),
    country: String(input.country ?? "").trim().toUpperCase().slice(0, 8),
    region: String(input.region ?? "").trim().slice(0, 80),
    currency: String(input.currency ?? "").trim().toUpperCase().slice(0, 8),
    title: title.slice(0, 240),
    category: String(input.category ?? "").trim().slice(0, 120),
    importance,
    previous: input.previous === undefined || input.previous === null ? null : String(input.previous).slice(0, 120),
    forecast: input.forecast === undefined || input.forecast === null ? null : String(input.forecast).slice(0, 120),
    actual: input.actual === undefined || input.actual === null ? null : String(input.actual).slice(0, 120),
    revision: input.revision === undefined || input.revision === null ? null : String(input.revision).slice(0, 120),
    status,
    sourceUrl: String(input.sourceUrl ?? "").slice(0, 1000),
    metadata: JSON.stringify(input.metadata ?? {}),
  };
}

export async function upsertEconomicEvent(profileId: string, input: EconomicEventInput) {
  const source = await ensureManualSource("economic");
  const item = normalizeEconomicEvent(input);
  if (item.scheduledAt < retentionCutoff()) {
    throw new Error("Cet événement est hors de la fenêtre active de rétention de 15 ans");
  }

  const event = await db.transaction(async (tx) => {
    const [existing] = await tx
      .select()
      .from(economicEvents)
      .where(
        and(
          eq(economicEvents.sourceId, source.id),
          eq(economicEvents.externalId, item.externalId),
        ),
      );

    let event;
    if (existing) {
      [event] = await tx
        .update(economicEvents)
        .set({ ...item, retrievedAt: new Date(), updatedAt: new Date() })
        .where(eq(economicEvents.id, existing.id))
        .returning();
    } else {
      [event] = await tx
        .insert(economicEvents)
        .values({ sourceId: source.id, ...item, retrievedAt: new Date() })
        .returning();
    }

    if (!event) {
      throw new Error("Impossible d'enregistrer l'événement économique");
    }

    await tx.insert(economicEventRevisions).values({
      eventId: event.id,
      knownAt: item.publishedAt ?? item.knownAt,
      previous: item.previous,
      forecast: item.forecast,
      actual: item.actual,
      revision: item.revision,
      status: item.status,
      rawPayload: item.metadata,
    });

    await tx.insert(economicCalendarImports).values({
      profileId,
      sourceId: source.id,
      mode: existing ? "sync" : "historical",
      status: "completed",
      requestedFrom: item.scheduledAt,
      requestedTo: item.scheduledAt,
      rowsReceived: 1,
      rowsAccepted: 1,
    });

    return event;
  });

  await runRetention();
  return event;
}

/**
 * Returns calendar data as it was knowable at `asOf`.
 * Actual/revisions are never returned before their stored knownAt/publishedAt.
 */
export async function listEconomicEvents(input: {
  from?: Date;
  to?: Date;
  currency?: string;
  country?: string;
  importance?: string;
  search?: string;
  asOf?: Date;
  limit?: number;
}) {
  const conditions = [];
  if (input.from) conditions.push(gte(economicEvents.scheduledAt, input.from));
  if (input.to) conditions.push(lte(economicEvents.scheduledAt, input.to));
  if (input.currency) conditions.push(eq(economicEvents.currency, input.currency.toUpperCase()));
  if (input.country) conditions.push(eq(economicEvents.country, input.country.toUpperCase()));
  if (input.importance && IMPORTANCES.has(input.importance)) conditions.push(eq(economicEvents.importance, input.importance));
  if (input.asOf) conditions.push(lte(economicEvents.knownAt, input.asOf));
  if (input.search?.trim()) {
    const q = `%${input.search.trim().toLowerCase()}%`;
    conditions.push(
      sql`(lower(${economicEvents.title}) like ${q} or lower(${economicEvents.category}) like ${q})`,
    );
  }

  const rows = await db
    .select()
    .from(economicEvents)
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(asc(economicEvents.scheduledAt))
    .limit(Math.min(Math.max(input.limit ?? 300, 1), 1000));
  if (!input.asOf || !rows.length) return rows;

  const revisions = await db
    .select()
    .from(economicEventRevisions)
    .where(and(inArray(economicEventRevisions.eventId, rows.map((r) => r.id)), lte(economicEventRevisions.knownAt, input.asOf)))
    .orderBy(asc(economicEventRevisions.knownAt));
  const latest = new Map<string, (typeof revisions)[number]>();
  for (const revision of revisions) latest.set(revision.eventId, revision);

  return rows.map((row) => {
    const revision = latest.get(row.id);
    const published = row.publishedAt && row.publishedAt <= input.asOf!;
    // Redact all results when there is no verifiable visible revision at as-of time.
    return {
      ...row,
      previous: revision?.previous ?? null,
      forecast: revision?.forecast ?? null,
      actual: published ? revision?.actual ?? null : null,
      revision: published ? revision?.revision ?? null : null,
      status: published ? revision?.status ?? "released" : "scheduled",
      publishedAt: published ? row.publishedAt : null,
    };
  });
}

function currenciesForSymbol(symbol: string) {
  const s = symbol.replace(/[^A-Z]/gi, "").toUpperCase();
  const currencies = new Set<string>();
  if (s === "DXY") currencies.add("USD");
  if (s.length >= 6) {
    currencies.add(s.slice(0, 3));
    currencies.add(s.slice(3, 6));
  }
  if (s.includes("XAU") || s.includes("XAG") || s.includes("NAS") || s.includes("US30") || s.includes("SPX")) {
    currencies.add("USD");
  }
  return [...currencies];
}

export async function getBacktestEconomicEvents(input: {
  from: Date;
  to: Date;
}) {
  const batchSize = 500;
  const rows: Array<(typeof economicEvents)["$inferSelect"]> = [];
  let cursor: { scheduledAt: Date; id: string } | null = null;

  while (true) {
    const conditions = [
      gte(economicEvents.scheduledAt, input.from),
      lte(economicEvents.scheduledAt, input.to),
    ];

    if (cursor) {
      conditions.push(
        sql`(${economicEvents.scheduledAt}, ${economicEvents.id}) > (${cursor.scheduledAt}, ${cursor.id})`
      );
    }

    const batch = await db
      .select()
      .from(economicEvents)
      .where(and(...conditions))
      .orderBy(asc(economicEvents.scheduledAt), asc(economicEvents.id))
      .limit(batchSize);

    if (!batch.length) break;

    rows.push(...batch);
    const last = batch[batch.length - 1];
    cursor = { scheduledAt: last.scheduledAt, id: last.id };

    if (batch.length < batchSize) break;
  }

  return rows;
}

/** Associates a journal trade with relevant economic events around execution time. */
export async function associateTradeEconomicEvents(tradeId: string) {
  const [trade] = await db.select().from(trades).where(eq(trades.id, tradeId));
  if (!trade?.openedAt) return [];
  const currencies = currenciesForSymbol(trade.symbol);
  if (!currencies.length) return [];
  const entry = trade.openedAt;
  const end = trade.closedAt ?? new Date(entry.getTime() + 60 * 60_000);
  const from = new Date(entry.getTime() - 60 * 60_000);
  const to = new Date(Math.max(end.getTime(), entry.getTime()) + 60 * 60_000);

  const events = await db
    .select()
    .from(economicEvents)
    .where(and(inArray(economicEvents.currency, currencies), gte(economicEvents.scheduledAt, from), lte(economicEvents.scheduledAt, to)));

  await db.transaction(async (tx) => {
    await tx.delete(tradeEconomicEvents).where(eq(tradeEconomicEvents.tradeId, tradeId));
    if (!events.length) return;

    await tx.insert(tradeEconomicEvents).values(
      events.map((event) => {
        const minutesFromEntry = Math.round((event.scheduledAt.getTime() - entry.getTime()) / 60_000);
        const relation =
          event.scheduledAt < entry
            ? "before_entry"
            : event.scheduledAt <= end
            ? "during"
            : "after_exit";
        return { tradeId, eventId: event.id, relation, minutesFromEntry };
      })
    );
  });

  return events;
}

export async function eventsNearTrade(tradeId: string) {
  return db
    .select({ event: economicEvents, relation: tradeEconomicEvents.relation, minutesFromEntry: tradeEconomicEvents.minutesFromEntry })
    .from(tradeEconomicEvents)
    .innerJoin(economicEvents, eq(tradeEconomicEvents.eventId, economicEvents.id))
    .where(eq(tradeEconomicEvents.tradeId, tradeId))
    .orderBy(asc(economicEvents.scheduledAt));
}
