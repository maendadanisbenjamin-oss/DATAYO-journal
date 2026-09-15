import { NextResponse } from "next/server";
import { and, asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { marketDataGaps } from "@/db/schema";
import { requireUser, unauthorized } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  if (!(await requireUser())) return unauthorized();
  const q = new URL(req.url).searchParams;
  const instrumentId = q.get("instrumentId");
  const status = q.get("status");
  const conditions = [];
  if (instrumentId) conditions.push(eq(marketDataGaps.instrumentId, instrumentId));
  if (status) conditions.push(eq(marketDataGaps.status, status));
  const rows = await db.select().from(marketDataGaps).where(conditions.length ? and(...conditions) : undefined).orderBy(asc(marketDataGaps.gapStart)).limit(300);
  return NextResponse.json(rows);
}
