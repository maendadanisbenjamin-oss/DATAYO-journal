import { NextResponse } from "next/server";
import { and, eq, gt } from "drizzle-orm";
import { db } from "@/db";
import { invitations, profiles } from "@/db/schema";
import { attachSession, createSession, hashInvitationCode, hashPassword, publicProfile } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const email = String(body.email ?? "").trim().toLowerCase();
  const password = String(body.password ?? "");
  const name = String(body.name ?? "").trim();
  const invitationCode = String(body.invitationCode ?? "").trim();

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: "Email invalide" }, { status: 400 });
  }
  if (password.length < 8) {
    return NextResponse.json({ error: "Mot de passe : 8 caractères minimum" }, { status: 400 });
  }
  if (!invitationCode) {
    return NextResponse.json({ error: "Une invitation valide est requise pour créer un compte" }, { status: 403 });
  }

  const [exists] = await db.select({ id: profiles.id }).from(profiles).where(eq(profiles.email, email));
  if (exists) return NextResponse.json({ error: "Cet email est déjà utilisé" }, { status: 409 });

  const [invitation] = await db
    .select()
    .from(invitations)
    .where(
      and(
        eq(invitations.email, email),
        eq(invitations.tokenHash, hashInvitationCode(invitationCode)),
        eq(invitations.status, "pending"),
        gt(invitations.expiresAt, new Date())
      )
    );
  if (!invitation) {
    return NextResponse.json({ error: "Invitation invalide, expirée ou déjà utilisée" }, { status: 403 });
  }

  const fallback = email.split("@")[0].replace(/[._-]+/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  const [p] = await db
    .insert(profiles)
    .values({ id: crypto.randomUUID(), email, displayName: name || fallback, passwordHash: hashPassword(password), memberSince: new Date().getFullYear() })
    .returning();
  await db.update(invitations).set({ status: "accepted", acceptedAt: new Date() }).where(eq(invitations.id, invitation.id));

  const token = await createSession(p.id, req.headers.get("user-agent") ?? "");
  return attachSession(NextResponse.json({ profile: publicProfile(p) }, { status: 201 }), token);
}
