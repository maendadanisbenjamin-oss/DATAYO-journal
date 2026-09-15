import { NextResponse } from "next/server";
import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { invitations } from "@/db/schema";
import { hashInvitationCode, requireAdmin, unauthorized } from "@/lib/auth";
import { sendInvitationEmail } from "@/lib/email";

export const dynamic = "force-dynamic";

export async function GET() {
  const admin = await requireAdmin();
  if (!admin) return unauthorized();
  const rows = await db.select().from(invitations).orderBy(desc(invitations.createdAt)).limit(100);
  return NextResponse.json(rows.map(({ tokenHash: _tokenHash, ...row }) => row));
}

export async function POST(req: Request) {
  const admin = await requireAdmin();
  if (!admin) return unauthorized();
  const body = await req.json().catch(() => ({}));
  const email = String(body.email ?? "").trim().toLowerCase();
  const expiresInDays = Math.min(Math.max(Number(body.expiresInDays ?? 14), 1), 90);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: "Email invalide" }, { status: 400 });
  }
  const code = crypto.randomUUID().replace(/-/g, "").slice(0, 16).toUpperCase();
  const expiresAt = new Date(Date.now() + expiresInDays * 86400_000);
  const [row] = await db
    .insert(invitations)
    .values({ email, tokenHash: hashInvitationCode(code), invitedBy: admin.id, expiresAt })
    .onConflictDoUpdate({
      target: invitations.email,
      set: { tokenHash: hashInvitationCode(code), status: "pending", invitedBy: admin.id, expiresAt, acceptedAt: null },
    })
    .returning();
  let emailSent = false;
  let emailError = "";

  try {
    await sendInvitationEmail({
      to: email,
      invitationCode: code,
      expiresInDays,
    });
    emailSent = true;
  } catch (error) {
    console.error("Erreur lors de l'envoi de l'invitation :", error);
    emailError = "Impossible d'envoyer l'e-mail d'invitation.";
  }

  return NextResponse.json(
    {
      invitation: { ...row, tokenHash: undefined },
      invitationCode: code,
      emailSent,
      emailError: emailSent ? undefined : emailError,
    },
    { status: 201 },
  );
}

export async function DELETE(req: Request) {
  const admin = await requireAdmin();
  if (!admin) return unauthorized();
  const { id } = await req.json().catch(() => ({}));
  if (!id || typeof id !== "string") return NextResponse.json({ error: "id requis" }, { status: 400 });
  await db.update(invitations).set({ status: "revoked" }).where(eq(invitations.id, id));
  return NextResponse.json({ ok: true });
}
