import { NextResponse } from "next/server";
import { desc, eq, and } from "drizzle-orm";
import { db } from "@/db";
import { profiles, sessions } from "@/db/schema";
import { publicProfile, requireAdmin, unauthorized } from "@/lib/auth";
import { notifyProfile } from "@/lib/notifications";

async function notifyStatus(profileId: string, type: string, title: string, message: string) {
  try {
    await notifyProfile({ profileId, type, title, message });
  } catch (error) {
    console.error("Impossible d'enregistrer la notification de statut :", error);
  }
}

export const dynamic = "force-dynamic";

const VALID_ACTIONS = new Set([
  "approve",
  "reject",
  "suspend",
  "reactivate",
  "promote",
  "demote",
]);

export async function GET() {
  const admin = await requireAdmin();
  if (!admin) return unauthorized();

  const rows = await db
    .select()
    .from(profiles)
    .orderBy(desc(profiles.createdAt));

  return NextResponse.json(rows.map(publicProfile));
}

export async function PATCH(req: Request) {
  const admin = await requireAdmin();
  if (!admin) return unauthorized();

  const body = await req.json().catch(() => ({}));
  const id = String(body.id ?? "").trim();
  const action = String(body.action ?? "").trim();
  const rejectionReason = String(body.rejectionReason ?? "").trim();

  if (!id) {
    return NextResponse.json(
      { error: "id requis" },
      { status: 400 },
    );
  }

  if (!VALID_ACTIONS.has(action)) {
    return NextResponse.json(
      { error: "Action invalide" },
      { status: 400 },
    );
  }

  if (
    id === admin.id &&
    (action === "suspend" ||
      action === "reject" ||
      action === "demote")
  ) {
    return NextResponse.json(
      {
        error:
          "Vous ne pouvez pas suspendre, rejeter ou rétrograder votre propre compte administrateur.",
      },
      { status: 400 },
    );
  }

  const [target] = await db
    .select()
    .from(profiles)
    .where(eq(profiles.id, id));

  if (!target) {
    return NextResponse.json(
      { error: "Utilisateur introuvable" },
      { status: 404 },
    );
  }

  if (action === "promote") {
    if (target.role === "admin") {
      return NextResponse.json(
        { error: "Cet utilisateur est déjà administrateur." },
        { status: 400 },
      );
    }

    const [updated] = await db
      .update(profiles)
      .set({
        role: "admin",
      })
      .where(eq(profiles.id, id))
      .returning();

    return NextResponse.json({ profile: publicProfile(updated) });
  }

  if (action === "demote") {
    if (target.role !== "admin") {
      return NextResponse.json(
        { error: "Cet utilisateur n'est pas administrateur." },
        { status: 400 },
      );
    }

    const activeAdmins = await db
      .select({ id: profiles.id })
      .from(profiles)
      .where(
        and(
          eq(profiles.role, "admin"),
          eq(profiles.status, "active"),
        ),
      );

    if (activeAdmins.length <= 1) {
      return NextResponse.json(
        {
          error:
            "Impossible de rétrograder le dernier administrateur actif.",
        },
        { status: 400 },
      );
    }

    const [updated] = await db
      .update(profiles)
      .set({
        role: "member",
      })
      .where(eq(profiles.id, id))
      .returning();

    return NextResponse.json({ profile: publicProfile(updated) });
  }

  if (id === admin.id && (action === "suspend" || action === "reject")) {
    return NextResponse.json(
      {
        error:
          "Vous ne pouvez pas suspendre ou rejeter votre propre compte administrateur.",
      },
      { status: 400 },
    );
  }

  const now = new Date();

  if (action === "approve") {
    if (target.status !== "pending") {
      return NextResponse.json(
        { error: "Seule une demande en attente peut être approuvée." },
        { status: 400 },
      );
    }

    const [updated] = await db
      .update(profiles)
      .set({
        status: "active",
        approvedAt: now,
        approvedBy: admin.id,
        rejectedAt: null,
        rejectedBy: null,
        rejectionReason: null,
      })
      .where(eq(profiles.id, id))
      .returning();

    await notifyStatus(id, "account_approved", "Compte activé", "Votre demande d'inscription a été approuvée. Vous pouvez maintenant accéder à DATAYO-journal.");

    return NextResponse.json({ profile: publicProfile(updated) });
  }

  if (action === "reject") {
    if (target.status !== "pending") {
      return NextResponse.json(
        { error: "Seule une demande en attente peut être rejetée." },
        { status: 400 },
      );
    }

    const [updated] = await db
      .update(profiles)
      .set({
        status: "rejected",
        rejectedAt: now,
        rejectedBy: admin.id,
        rejectionReason: rejectionReason || null,
        approvedAt: null,
        approvedBy: null,
      })
      .where(eq(profiles.id, id))
      .returning();

    await notifyStatus(id, "account_rejected", "Demande refusée", rejectionReason ? `Votre demande d'inscription a été refusée : ${rejectionReason}` : "Votre demande d'inscription a été refusée.");

    return NextResponse.json({ profile: publicProfile(updated) });
  }

  if (action === "suspend") {
    if (target.role === "admin") {
      return NextResponse.json(
        {
          error:
            "Un compte administrateur ne peut pas être suspendu depuis cette interface.",
        },
        { status: 400 },
      );
    }

    const [updated] = await db
      .update(profiles)
      .set({
        status: "suspended",
      })
      .where(eq(profiles.id, id))
      .returning();

    await db.delete(sessions).where(eq(sessions.profileId, id));

    await notifyStatus(id, "account_suspended", "Compte suspendu", "Votre compte DATAYO-journal a été suspendu. Contactez un administrateur pour plus d'informations.");

    return NextResponse.json({ profile: publicProfile(updated) });
  }

  if (target.status === "pending") {
    return NextResponse.json(
      {
        error:
          "Une demande en attente doit d'abord être approuvée ou rejetée.",
      },
      { status: 400 },
    );
  }

  const [updated] = await db
    .update(profiles)
    .set({
      status: "active",
      rejectedAt: null,
      rejectedBy: null,
      rejectionReason: null,
    })
    .where(eq(profiles.id, id))
    .returning();

  await notifyStatus(id, "account_reactivated", "Compte réactivé", "Votre compte DATAYO-journal a été réactivé.");

  return NextResponse.json({ profile: publicProfile(updated) });
}
