import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { accounts } from "@/db/schema";
import { requireUser, unauthorized } from "@/lib/auth";
import { publish } from "@/lib/realtime";
import { parseAccount } from "@/lib/parsers";

export const dynamic = "force-dynamic";
type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(req: Request, { params }: Ctx) {
  const me = await requireUser();
  if (!me) return unauthorized();
  const { id } = await params;
  const data = parseAccount(await req.json().catch(() => ({})));
  if (!data.name) return NextResponse.json({ error: "Nom requis" }, { status: 400 });
  const [row] = await db.update(accounts).set(data).where(and(eq(accounts.id, id), eq(accounts.profileId, me.id))).returning();
  if (!row) return NextResponse.json({ error: "Introuvable" }, { status: 404 });
  await publish(me.id, "accounts");
  return NextResponse.json(row);
}

export async function DELETE(_req: Request, { params }: Ctx) {
  const me = await requireUser();
  if (!me) return unauthorized();
  const { id } = await params;
  const rows = await db.delete(accounts).where(and(eq(accounts.id, id), eq(accounts.profileId, me.id))).returning({ id: accounts.id });
  if (!rows.length) return NextResponse.json({ error: "Introuvable" }, { status: 404 });
  await publish(me.id, "accounts");
  return NextResponse.json({ ok: true });
}
