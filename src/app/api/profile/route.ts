import { NextResponse } from "next/server";
import { and, eq, ne } from "drizzle-orm";
import { db } from "@/db";
import { profiles } from "@/db/schema";
import { hashPassword, publicProfile, requireUser, unauthorized, verifyPassword } from "@/lib/auth";
import { publish } from "@/lib/realtime";

export const dynamic = "force-dynamic";

export async function PATCH(req: Request) {
  const me = await requireUser();
  if (!me) return unauthorized();
  const b = await req.json().catch(() => ({}));
  const patch: Partial<typeof profiles.$inferInsert> = {};
  if (typeof b.displayName === "string" && b.displayName.trim()) patch.displayName = b.displayName.trim().slice(0, 80);
  if (typeof b.title === "string") patch.title = b.title.trim().slice(0, 80);
  if (typeof b.bio === "string") patch.bio = b.bio.trim().slice(0, 600);
  if (Number.isFinite(Number(b.memberSince))) patch.memberSince = Math.max(1990, Math.min(2100, Number(b.memberSince)));
  if (typeof b.email === "string") {
    const email = b.email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return NextResponse.json({ error: "Email invalide" }, { status: 400 });
    const [dup] = await db.select({ id: profiles.id }).from(profiles).where(and(eq(profiles.email, email), ne(profiles.id, me.id)));
    if (dup) return NextResponse.json({ error: "Cet email est déjà utilisé" }, { status: 409 });
    patch.email = email;
  }
  if (b.avatarUrl === null) patch.avatarUrl = null;
  else if (typeof b.avatarUrl === "string") {
    if (!b.avatarUrl.startsWith("data:image/") || b.avatarUrl.length > 1_500_000) {
      return NextResponse.json({ error: "Image invalide ou trop lourde" }, { status: 400 });
    }
    patch.avatarUrl = b.avatarUrl;
  }
  if (typeof b.newPassword === "string" && b.newPassword) {
    if (b.newPassword.length < 8) return NextResponse.json({ error: "Mot de passe : 8 caractères minimum" }, { status: 400 });
    if (!verifyPassword(String(b.currentPassword ?? ""), me.passwordHash)) {
      return NextResponse.json({ error: "Mot de passe actuel incorrect" }, { status: 403 });
    }
    patch.passwordHash = hashPassword(b.newPassword);
  }
  const [updated] = await db.update(profiles).set(patch).where(eq(profiles.id, me.id)).returning();
  await publish(me.id, "profile");
  return NextResponse.json(publicProfile(updated));
}
