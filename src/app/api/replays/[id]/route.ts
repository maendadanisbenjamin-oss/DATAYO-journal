import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { replaySessions } from "@/db/schema";
import { requireUser, unauthorized } from "@/lib/auth";
import { getOwnedReplay, replaySnapshot } from "@/lib/replay-service";

type Context = { params: Promise<{ id: string }> };
export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: Context) {
  const me = await requireUser();
  if (!me) return unauthorized();
  try {
    return NextResponse.json(await replaySnapshot(me.id, (await params).id));
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Replay introuvable" }, { status: 404 });
  }
}

export async function PATCH(req: Request, { params }: Context) {
  const me = await requireUser();
  if (!me) return unauthorized();
  const id = (await params).id;
  const replay = await getOwnedReplay(me.id, id);
  if (!replay) return NextResponse.json({ error: "Replay introuvable" }, { status: 404 });
  const body = await req.json().catch(() => ({}));
  const speed = Number(body.speed);
  const status = body.status === "playing" || body.status === "paused" ? body.status : replay.status;
  const [updated] = await db.update(replaySessions).set({
    status,
    speed: [0.5, 1, 2, 5, 10].includes(speed) ? speed : replay.speed,
    updatedAt: new Date(),
  }).where(eq(replaySessions.id, id)).returning();
  return NextResponse.json(updated);
}
