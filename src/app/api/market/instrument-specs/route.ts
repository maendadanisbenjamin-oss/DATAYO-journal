import { NextResponse } from "next/server";
import { and, asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { instrumentSpecs, instruments } from "@/db/schema";
import { requireAdmin, requireUser, unauthorized } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  if (!(await requireUser())) return unauthorized();

  const url = new URL(req.url);
  const instrumentId = String(url.searchParams.get("instrumentId") ?? "").trim();

  const rows = await db
    .select({
      spec: instrumentSpecs,
      instrument: instruments,
    })
    .from(instrumentSpecs)
    .innerJoin(
      instruments,
      eq(instrumentSpecs.instrumentId, instruments.id)
    )
    .where(
      instrumentId
        ? and(
            eq(instrumentSpecs.instrumentId, instrumentId),
            eq(instruments.isActive, true)
          )
        : eq(instruments.isActive, true)
    )
    .orderBy(asc(instruments.symbol), asc(instrumentSpecs.broker));

  return NextResponse.json(rows);
}

export async function POST(req: Request) {
  const admin = await requireAdmin();

  if (!admin) {
    return NextResponse.json(
      { error: "Réservé à l'administrateur" },
      { status: 403 }
    );
  }

  const body = await req.json().catch(() => ({}));

  const instrumentId = String(body.instrumentId ?? "").trim();
  const broker = String(body.broker ?? "").trim().slice(0, 80);
  const calculationModel = String(
    body.calculationModel ?? "price_delta_value"
  ).trim();
  const quantityUnit = String(body.quantityUnit ?? "lot").trim();

  const valuePerPriceUnit = Number(body.valuePerPriceUnit);
  const priceIncrement = Number(body.priceIncrement);

  if (!instrumentId || !broker) {
    return NextResponse.json(
      { error: "Instrument et broker requis" },
      { status: 400 }
    );
  }

  if (
    !Number.isFinite(valuePerPriceUnit) ||
    valuePerPriceUnit <= 0 ||
    !Number.isFinite(priceIncrement) ||
    priceIncrement <= 0
  ) {
    return NextResponse.json(
      { error: "Valeurs financières invalides" },
      { status: 400 }
    );
  }

  const [instrument] = await db
    .select({ id: instruments.id })
    .from(instruments)
    .where(
      and(
        eq(instruments.id, instrumentId),
        eq(instruments.isActive, true)
      )
    )
    .limit(1);

  if (!instrument) {
    return NextResponse.json(
      { error: "Instrument introuvable" },
      { status: 404 }
    );
  }

  const [row] = await db
    .insert(instrumentSpecs)
    .values({
      instrumentId,
      broker,
      calculationModel,
      quantityUnit,
      valuePerPriceUnit,
      priceIncrement,
    })
    .returning();

  return NextResponse.json(row, { status: 201 });
}

export async function PATCH(req: Request) {
  const admin = await requireAdmin();

  if (!admin) {
    return NextResponse.json(
      { error: "Réservé à l'administrateur" },
      { status: 403 }
    );
  }

  const body = await req.json().catch(() => ({}));

  const id = String(body.id ?? "").trim();
  const broker = String(body.broker ?? "").trim().slice(0, 80);
  const calculationModel = String(
    body.calculationModel ?? "price_delta_value"
  ).trim();
  const quantityUnit = String(body.quantityUnit ?? "lot").trim();

  const valuePerPriceUnit = Number(body.valuePerPriceUnit);
  const priceIncrement = Number(body.priceIncrement);

  if (!id || !broker) {
    return NextResponse.json(
      { error: "Identifiant et broker requis" },
      { status: 400 }
    );
  }

  if (
    !Number.isFinite(valuePerPriceUnit) ||
    valuePerPriceUnit <= 0 ||
    !Number.isFinite(priceIncrement) ||
    priceIncrement <= 0
  ) {
    return NextResponse.json(
      { error: "Valeurs financières invalides" },
      { status: 400 }
    );
  }

  const [row] = await db
    .update(instrumentSpecs)
    .set({
      broker,
      calculationModel,
      quantityUnit,
      valuePerPriceUnit,
      priceIncrement,
      updatedAt: new Date(),
    })
    .where(eq(instrumentSpecs.id, id))
    .returning();

  if (!row) {
    return NextResponse.json(
      { error: "Spécification introuvable" },
      { status: 404 }
    );
  }

  return NextResponse.json(row);
}

export async function DELETE(req: Request) {
  const admin = await requireAdmin();

  if (!admin) {
    return NextResponse.json(
      { error: "Réservé à l'administrateur" },
      { status: 403 }
    );
  }

  const body = await req.json().catch(() => ({}));
  const id = String(body.id ?? "").trim();

  if (!id) {
    return NextResponse.json(
      { error: "Identifiant requis" },
      { status: 400 }
    );
  }

  const rows = await db
    .delete(instrumentSpecs)
    .where(eq(instrumentSpecs.id, id))
    .returning({ id: instrumentSpecs.id });

  if (!rows.length) {
    return NextResponse.json(
      { error: "Spécification introuvable" },
      { status: 404 }
    );
  }

  return NextResponse.json({ ok: true });
}
