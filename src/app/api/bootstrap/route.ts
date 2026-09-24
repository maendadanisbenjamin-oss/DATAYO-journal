import { NextResponse } from "next/server";
import { asc, eq, inArray, or } from "drizzle-orm";
import { db } from "@/db";
import { accounts, tradeAccounts, trades } from "@/db/schema";
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
      return NextResponse.json({ profile: null, accounts: [], trades: [], tradeAccounts: [], devMode: devAutoLogin() });
    }
    const acc = await db.select().from(accounts).where(eq(accounts.profileId, user.profile.id)).orderBy(asc(accounts.createdAt));
    const accountIds = acc.map((a) => a.id);
    const tradeAcc = accountIds.length
      ? await db.select().from(tradeAccounts).where(inArray(tradeAccounts.accountId, accountIds))
      : [];

    const tradeIds = [...new Set(tradeAcc.map((ta) => ta.tradeId))];

    const tradeConditions = [];
    if (accountIds.length) {
      tradeConditions.push(inArray(trades.accountId, accountIds));
    }
    if (tradeIds.length) {
      tradeConditions.push(inArray(trades.id, tradeIds));
    }

    const trd = tradeConditions.length
      ? await db
          .select()
          .from(trades)
          .where(or(...tradeConditions))
          .orderBy(asc(trades.date))
      : [];
    const res = NextResponse.json({
      profile: publicProfile(user.profile),
      accounts: acc,
      trades: trd,
      tradeAccounts: tradeAcc,
      devMode: devAutoLogin(),
    });
    if (token) attachSession(res, token);
    void req;
    return res;
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "bootstrap failed" }, { status: 500 });
  }
}
