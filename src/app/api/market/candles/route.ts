import { NextResponse } from "next/server";
import { requireUser, unauthorized } from "@/lib/auth";
import { getMarketCandles } from "@/lib/market-data-service";
import type { Timeframe } from "@/lib/market-engine";

export const dynamic = "force-dynamic";
const frames = new Set(["1m", "5m", "15m", "30m", "1h", "4h", "1d", "1w", "1mo"]);

function parseDate(v: string | null) {
  if (!v) return undefined;
  const date = new Date(v);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

export async function GET(req: Request) {
  if (!(await requireUser())) return unauthorized();
  const q = new URL(req.url).searchParams;
  const instrumentId = q.get("instrumentId");
  if (!instrumentId) return NextResponse.json({ error: "instrumentId requis" }, { status: 400 });
  const candidate = q.get("timeframe") ?? "15m";
  const timeframe = (frames.has(candidate) ? candidate : "15m") as Timeframe;
  const start = parseDate(q.get("start"));
  const end = parseDate(q.get("end"));
  if (q.get("start") && !start) return NextResponse.json({ error: "start invalide" }, { status: 400 });
  if (q.get("end") && !end) return NextResponse.json({ error: "end invalide" }, { status: 400 });
  const limit = Number(q.get("limit") ?? 800);
  const candles = await getMarketCandles({ instrumentId, timeframe, start, end, limit });
  return NextResponse.json({ timeframe, candles });
}
