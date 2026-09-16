import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { profiles } from "@/db/schema";
import { hashPassword, publicProfile } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const email = String(body.email ?? "").trim().toLowerCase();
  const password = String(body.password ?? "");
  const name = String(body.name ?? "").trim();

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: "Email invalide" }, { status: 400 });
  }

  if (password.length < 8) {
    return NextResponse.json(
      { error: "Mot de passe : 8 caractères minimum" },
      { status: 400 },
    );
  }

  const [exists] = await db
    .select({ id: profiles.id })
    .from(profiles)
    .where(eq(profiles.email, email));

  if (exists) {
    return NextResponse.json(
      { error: "Cet email est déjà utilisé" },
      { status: 409 },
    );
  }

  const fallback = email
    .split("@")[0]
    .replace(/[._-]+/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());

  const [profile] = await db
    .insert(profiles)
    .values({
      id: crypto.randomUUID(),
      email,
      displayName: name || fallback,
      passwordHash: hashPassword(password),
      status: "pending",
      memberSince: new Date().getFullYear(),
    })
    .returning();

  return NextResponse.json(
    {
      profile: publicProfile(profile),
      message: "Demande d'inscription envoyée. Votre compte doit être approuvé par un administrateur.",
    },
    { status: 201 },
  );
}
