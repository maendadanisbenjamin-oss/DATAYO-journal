import { NextResponse } from "next/server";
import { clearSession, currentUser, revokeSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function POST() {
  const u = await currentUser();
  if (u?.sessionId) await revokeSession(u.sessionId);
  return clearSession(NextResponse.json({ ok: true }));
}
