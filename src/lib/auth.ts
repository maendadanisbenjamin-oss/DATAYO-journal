import "server-only";
import { createHash, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { and, eq, gt } from "drizzle-orm";
import { db } from "@/db";
import { profiles, sessions } from "@/db/schema";

export const SESSION_COOKIE = "tj_session";
export const GUEST_COOKIE = "tj_guest";
const SESSION_DAYS = 90;

export type ProfileRow = typeof profiles.$inferSelect;
export type PublicProfile = Omit<ProfileRow, "passwordHash">;

export function publicProfile(p: ProfileRow): PublicProfile {
  const { passwordHash: _ph, ...rest } = p;
  void _ph;
  return rest;
}

export function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

export function verifyPassword(password: string, stored: string) {
  const [salt, hash] = stored.split(":");
  if (!salt || !hash) return false;
  const a = Buffer.from(hash, "hex");
  const b = scryptSync(password, salt, 64);
  return a.length === b.length && timingSafeEqual(a, b);
}

const sha = (v: string) => createHash("sha256").update(v).digest("hex");

export async function createSession(profileId: string, device: string) {
  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 86400_000);
  await db
    .insert(sessions)
    .values({
      id: sha(token),
      profileId,
      device: device.slice(0, 200),
      expiresAt,
    });
  return token;
}

export function attachSession(res: NextResponse, token: string) {
  const isProd = process.env.NODE_ENV === "production";
  res.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: isProd,
    path: "/",
    maxAge: SESSION_DAYS * 86400,
  });
  res.cookies.set(GUEST_COOKIE, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: isProd,
    path: "/",
    maxAge: 0,
  });
  return res;
}

export function clearSession(res: NextResponse) {
  const isProd = process.env.NODE_ENV === "production";
  res.cookies.set(SESSION_COOKIE, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: isProd,
    path: "/",
    maxAge: 0,
  });
  res.cookies.set(GUEST_COOKIE, "1", {
    httpOnly: true,
    sameSite: "lax",
    secure: isProd,
    path: "/",
    maxAge: 365 * 86400,
  });
  return res;
}

export async function currentUser(): Promise<{ profile: ProfileRow; sessionId: string } | null> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const id = sha(token);
  const [row] = await db
    .select({ profile: profiles, sessionId: sessions.id })
    .from(sessions)
    .innerJoin(profiles, eq(sessions.profileId, profiles.id))
    .where(
      and(
        eq(sessions.id, id),
        gt(sessions.expiresAt, new Date()),
        eq(profiles.status, "active"),
      ),
    );

  if (!row) return null;

  db.update(sessions)
    .set({ lastSeenAt: new Date() })
    .where(eq(sessions.id, id))
    .catch(() => {});

  return row;
}

export async function requireUser() {
  const u = await currentUser();
  return u?.profile ?? null;
}

export async function requireAdmin() {
  const profile = await requireUser();
  return profile?.role === "admin" ? profile : null;
}

export function unauthorized() {
  return NextResponse.json(
    { error: "Authentification requise" },
    { status: 401 },
  );
}

export const devAutoLogin = () =>
  process.env.NODE_ENV !== "production" &&
  process.env.DEV_AUTO_LOGIN === "true";

/** Returns the demo profile (creating it if needed) for dev auto-login. */
export async function demoProfile(): Promise<ProfileRow> {
  const [existing] = await db
    .select()
    .from(profiles)
    .where(eq(profiles.id, "me"));

  if (existing) return existing;

  const [first] = await db.select().from(profiles).limit(1);
  if (first) return first;

  const [created] = await db
    .insert(profiles)
    .values({
      id: "me",
      displayName: "Yowel Kanezi",
      email: "yowel.kanezi@email.com",
      passwordHash: hashPassword("demo1234"),
      title: "Trader Indépendant",
      memberSince: 2024,
    })
    .returning();

  return created;
}

export async function isGuest() {
  const store = await cookies();
  return store.get(GUEST_COOKIE)?.value === "1";
}

export async function revokeSession(id: string) {
  await db.delete(sessions).where(eq(sessions.id, id));
}
