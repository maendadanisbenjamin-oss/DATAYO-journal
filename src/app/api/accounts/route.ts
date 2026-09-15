import { NextResponse } from "next/server";
import { db } from "@/db";
import { accounts } from "@/db/schema";
import { requireUser, unauthorized } from "@/lib/auth";
import { publish } from "@/lib/realtime";
import { parseAccount } from "@/lib/parsers";

export const dynamic = "force-dynamic";


export async function POST(req: Request) {
  const me = await requireUser();
  if (!me) return unauthorized();
  const data = parseAccount(await req.json().catch(() => ({})));
  if (!data.name) return NextResponse.json({ error: "Nom requis" }, { status: 400 });
  const [row] = await db.insert(accounts).values({ ...data, profileId: me.id }).returning();
  await publish(me.id, "accounts");
  return NextResponse.json(row, { status: 201 });
}
