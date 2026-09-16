import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { profiles } from "@/db/schema";
import { attachSession, createSession, publicProfile, verifyPassword } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const email = String(body.email ?? "").trim().toLowerCase();
  const password = String(body.password ?? "");

  if (!email || !password) {
    return NextResponse.json(
      { error: "Email et mot de passe requis" },
      { status: 400 },
    );
  }

  const [profile] = await db
    .select()
    .from(profiles)
    .where(eq(profiles.email, email));

  if (!profile || !verifyPassword(password, profile.passwordHash)) {
    return NextResponse.json(
      { error: "Identifiants invalides" },
      { status: 401 },
    );
  }

  if (profile.status === "pending") {
    return NextResponse.json(
      {
        error: "Votre demande d'inscription est en attente d'approbation par un administrateur.",
        status: "pending",
      },
      { status: 403 },
    );
  }

  if (profile.status === "rejected") {
    return NextResponse.json(
      {
        error: profile.rejectionReason
          ? `Votre demande d'inscription a été refusée : ${profile.rejectionReason}`
          : "Votre demande d'inscription a été refusée.",
        status: "rejected",
      },
      { status: 403 },
    );
  }

  if (profile.status === "suspended") {
    return NextResponse.json(
      {
        error: "Votre compte est actuellement suspendu.",
        status: "suspended",
      },
      { status: 403 },
    );
  }

  if (profile.status !== "active") {
    return NextResponse.json(
      {
        error: "Votre compte n'est pas autorisé à accéder à la plateforme.",
        status: profile.status,
      },
      { status: 403 },
    );
  }

  const token = await createSession(
    profile.id,
    req.headers.get("user-agent") ?? "",
  );

  return attachSession(
    NextResponse.json({ profile: publicProfile(profile) }),
    token,
  );
}
