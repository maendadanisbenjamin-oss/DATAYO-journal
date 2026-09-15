import { NextResponse } from "next/server";
import { and, desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { sessions } from "@/db/schema";
import { currentUser, unauthorized } from "@/lib/auth";
import { publish } from "@/lib/realtime";

export const dynamic = "force-dynamic";

export async function GET() {
  const u = await currentUser();
  if (!u) return unauthorized();
  const rows = await db.select().from(sessions).where(eq(sessions.profileId, u.profile.id)).orderBy(desc(sessions.lastSeenAt));
  return NextResponse.json(rows.map((r) => ({ id: r.id, device: r.device, createdAt: r.createdAt, lastSeenAt: r.lastSeenAt, current: r.id === u.sessionId })));
}

export async function DELETE(req: Request) {
  const u = await currentUser();
  if (!u) return unauthorized();
  const { id } = await req.json().catch(() => ({}));
  if (typeof id !== "string") return NextResponse.json({ error: "id requis" }, { status: 400 });
  await db.delete(sessions).where(and(eq(sessions.id, id), eq(sessions.profileId, u.profile.id)));
  await publish(u.profile.id, "security");
  return NextResponse.json({ ok: true });
}
