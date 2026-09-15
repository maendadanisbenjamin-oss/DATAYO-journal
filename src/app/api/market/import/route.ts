import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { ingestMarketCandles } from "@/lib/market-data-service";
import { parseCsv } from "@/lib/market-engine";
import type { CandleInput } from "@/lib/market-engine";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Réservé à l'administrateur" }, { status: 403 });
  try {
    const body = await req.json().catch(() => ({}));
    const instrumentId = String(body.instrumentId ?? "");
    if (!instrumentId) return NextResponse.json({ error: "instrumentId requis" }, { status: 400 });
    const candles: CandleInput[] = typeof body.csvText === "string" ? parseCsv(body.csvText) : Array.isArray(body.candles) ? body.candles : [];
    const result = await ingestMarketCandles({
      profileId: admin.id,
      instrumentId,
      candles,
      sourceKey: typeof body.sourceKey === "string" ? body.sourceKey : undefined,
      mode: body.mode === "gap_recovery" ? "gap_recovery" : body.mode === "live" ? "live" : "historical",
    });
    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Import impossible" }, { status: 400 });
  }
}
