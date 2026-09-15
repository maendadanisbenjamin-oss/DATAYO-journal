import { NextResponse } from "next/server";
import { and, asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { accounts, instruments, replaySessions } from "@/db/schema";
import { requireUser, unauthorized } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  const me = await requireUser();
  if (!me) return unauthorized();
  const rows = await db.select().from(replaySessions).where(eq(replaySessions.profileId, me.id)).orderBy(asc(replaySessions.createdAt)).limit(50);
  return NextResponse.json(rows);
}

export async function POST(req: Request) {
  const me = await requireUser();
  if (!me) return unauthorized();
  const body = await req.json().catch(() => ({}));
  const instrumentId = String(body.instrumentId ?? "");
  const startAt = new Date(String(body.startAt ?? ""));
  if (!instrumentId || Number.isNaN(startAt.getTime())) return NextResponse.json({ error: "Instrument et date de départ requis" }, { status: 400 });
  if (startAt > new Date()) return NextResponse.json({ error: "Un Replay ne peut pas démarrer dans le futur" }, { status: 400 });
  const [instrument] = await db.select({ id: instruments.id }).from(instruments).where(eq(instruments.id, instrumentId));
  if (!instrument) return NextResponse.json({ error: "Instrument introuvable" }, { status: 404 });
  const accountId = body.accountId ? String(body.accountId) : null;
  if (accountId) {
    const [account] = await db.select({ id: accounts.id }).from(accounts).where(and(eq(accounts.id, accountId), eq(accounts.profileId, me.id)));
    if (!account) return NextResponse.json({ error: "Compte introuvable" }, { status: 403 });
  }
  const timeframe = ["1m", "5m", "15m", "30m", "1h", "4h", "1d"].includes(String(body.timeframe)) ? String(body.timeframe) : "15m";
  const initialCapital = Math.max(0, Number(body.initialCapital ?? 10000));
  const [session] = await db.insert(replaySessions).values({
    profileId: me.id,
    accountId,
    instrumentId,
    timeframe,
    startAt,
    simulatedAt: startAt,
    initialCapital,
    currentEquity: initialCapital,
    speed: [0.5, 1, 2, 5, 10].includes(Number(body.speed)) ? Number(body.speed) : 1,
  }).returning();
  return NextResponse.json(session, { status: 201 });
}
