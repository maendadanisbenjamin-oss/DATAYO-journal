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
  if (!email || !password) return NextResponse.json({ error: "Email et mot de passe requis" }, { status: 400 });
  const [p] = await db.select().from(profiles).where(eq(profiles.email, email));
  if (!p || !verifyPassword(password, p.passwordHash)) {
    return NextResponse.json({ error: "Identifiants invalides" }, { status: 401 });
  }
  const token = await createSession(p.id, req.headers.get("user-agent") ?? "");
  return attachSession(NextResponse.json({ profile: publicProfile(p) }), token);
}
