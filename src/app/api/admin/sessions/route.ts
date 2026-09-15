import { NextResponse } from "next/server";
import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { profiles, sessions } from "@/db/schema";
import { requireAdmin, unauthorized } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  const admin = await requireAdmin();
  if (!admin) return unauthorized();

  const rows = await db
    .select({
      id: sessions.id,
      profileId: sessions.profileId,
      displayName: profiles.displayName,
      email: profiles.email,
      device: sessions.device,
      createdAt: sessions.createdAt,
      lastSeenAt: sessions.lastSeenAt,
      expiresAt: sessions.expiresAt,
    })
    .from(sessions)
    .innerJoin(profiles, eq(sessions.profileId, profiles.id))
    .orderBy(desc(sessions.lastSeenAt));

  return NextResponse.json(rows);
}

export async function DELETE(req: Request) {
  const admin = await requireAdmin();
  if (!admin) return unauthorized();

  const body = await req.json().catch(() => ({}));
  const id = body?.id;

  if (typeof id !== "string" || !id) {
    return NextResponse.json(
      { error: "id requis" },
      { status: 400 },
    );
  }

  await db.delete(sessions).where(eq(sessions.id, id));

  return NextResponse.json({ ok: true });
}
