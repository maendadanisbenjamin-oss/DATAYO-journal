import { NextResponse } from "next/server";
import { and, desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { notifications } from "@/db/schema";
import { currentUser, unauthorized } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  const u = await currentUser();
  if (!u) return unauthorized();

  const rows = await db
    .select()
    .from(notifications)
    .where(eq(notifications.profileId, u.profile.id))
    .orderBy(desc(notifications.createdAt));

  return NextResponse.json(rows);
}

export async function PATCH(req: Request) {
  const u = await currentUser();
  if (!u) return unauthorized();

  const body = await req.json().catch(() => ({}));
  const id = body?.id;

  if (typeof id !== "string" || !id) {
    return NextResponse.json(
      { error: "id requis" },
      { status: 400 },
    );
  }

  const [updated] = await db
    .update(notifications)
    .set({ readAt: new Date() })
    .where(
      and(
        eq(notifications.id, id),
        eq(notifications.profileId, u.profile.id),
      ),
    )
    .returning({ id: notifications.id });

  if (!updated) {
    return NextResponse.json(
      { error: "Notification introuvable" },
      { status: 404 },
    );
  }

  return NextResponse.json({ ok: true });
}
