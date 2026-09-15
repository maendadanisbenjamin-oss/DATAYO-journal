import { NextResponse } from "next/server";
import { asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { instruments } from "@/db/schema";
import { requireAdmin, requireUser, unauthorized } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!(await requireUser())) return unauthorized();
  const rows = await db.select().from(instruments).where(eq(instruments.isActive, true)).orderBy(asc(instruments.symbol));
  return NextResponse.json(rows);
}

export async function POST(req: Request) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Réservé à l'administrateur" }, { status: 403 });
  const body = await req.json().catch(() => ({}));
  const symbol = String(body.symbol ?? "").trim().toUpperCase().replace(/[^A-Z0-9._-]/g, "");
  const displayName = String(body.displayName ?? symbol).trim().slice(0, 120);
  const assetClass = String(body.assetClass ?? "").trim().toLowerCase().slice(0, 40);
  if (!symbol || !assetClass) return NextResponse.json({ error: "Symbole et classe d'actif requis" }, { status: 400 });
  const parseDate = (v: unknown) => {
    if (!v) return null;
    const d = new Date(String(v));
    return Number.isNaN(d.getTime()) ? null : d;
  };
  const [row] = await db
    .insert(instruments)
    .values({
      symbol,
      displayName,
      assetClass,
      baseCurrency: String(body.baseCurrency ?? "").trim().toUpperCase().slice(0, 8),
      quoteCurrency: String(body.quoteCurrency ?? "USD").trim().toUpperCase().slice(0, 8),
      providerSymbols: JSON.stringify(body.providerSymbols ?? {}),
      marketHours: ["weekday", "continuous", "custom"].includes(String(body.marketHours)) ? String(body.marketHours) : "weekday",
      availableFrom: parseDate(body.availableFrom),
      availableTo: parseDate(body.availableTo),
      availableResolutions: JSON.stringify(body.availableResolutions ?? ["1m"]),
      qualityNotes: String(body.qualityNotes ?? "").trim().slice(0, 2000),
    })
    .returning();
  return NextResponse.json(row, { status: 201 });
}
