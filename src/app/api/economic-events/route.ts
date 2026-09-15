import { NextResponse } from "next/server";
import { requireAdmin, requireUser, unauthorized } from "@/lib/auth";
import { listEconomicEvents, upsertEconomicEvent } from "@/lib/economic-calendar-service";

export const dynamic = "force-dynamic";

function date(v: string | null) {
  if (!v) return undefined;
  const parsed = new Date(v);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed;
}

export async function GET(req: Request) {
  if (!(await requireUser())) return unauthorized();
  const q = new URL(req.url).searchParams;
  const asOf = date(q.get("asOf"));
  const events = await listEconomicEvents({
    from: date(q.get("from")),
    to: date(q.get("to")),
    currency: q.get("currency") ?? undefined,
    country: q.get("country") ?? undefined,
    importance: q.get("importance") ?? undefined,
    search: q.get("search") ?? undefined,
    asOf,
    limit: Number(q.get("limit") ?? 300),
  });
  return NextResponse.json({ events, asOf: asOf?.toISOString() ?? null });
}

export async function POST(req: Request) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Réservé à l'administrateur" }, { status: 403 });
  try {
    const body = await req.json();
    const batch = Array.isArray(body.events) ? body.events : [body];
    if (!batch.length || batch.length > 500) {
      return NextResponse.json({ error: "Importez entre 1 et 500 événements par lot" }, { status: 400 });
    }
    const events = [];
    const rejected: string[] = [];
    for (const item of batch) {
      try {
        events.push(await upsertEconomicEvent(admin.id, item));
      } catch (error) {
        rejected.push(error instanceof Error ? error.message : "Événement invalide");
      }
    }
    if (!events.length) return NextResponse.json({ error: rejected[0] ?? "Événement invalide", rejected }, { status: 400 });
    return NextResponse.json({ events, accepted: events.length, rejected }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Événement invalide" }, { status: 400 });
  }
}
