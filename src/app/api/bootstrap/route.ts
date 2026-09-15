import { NextResponse } from "next/server";
import { asc, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { accounts, trades } from "@/db/schema";
import { attachSession, createSession, currentUser, demoProfile, devAutoLogin, isGuest, publicProfile } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    let user = await currentUser();
    let token: string | null = null;
    if (!user && devAutoLogin() && !(await isGuest())) {
      const p = await demoProfile();
      token = await createSession(p.id, "Auto (développement)");
      user = { profile: p, sessionId: "" };
    }
    if (!user) {
      return NextResponse.json({ profile: null, accounts: [], trades: [], devMode: devAutoLogin() });
    }
    const acc = await db.select().from(accounts).where(eq(accounts.profileId, user.profile.id)).orderBy(asc(accounts.createdAt));
    const trd = acc.length
      ? await db.select().from(trades).where(inArray(trades.accountId, acc.map((a) => a.id))).orderBy(asc(trades.date))
      : [];
    const res = NextResponse.json({ profile: publicProfile(user.profile), accounts: acc, trades: trd, devMode: devAutoLogin() });
    if (token) attachSession(res, token);
    void req;
    return res;
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "bootstrap failed" }, { status: 500 });
  }
}
