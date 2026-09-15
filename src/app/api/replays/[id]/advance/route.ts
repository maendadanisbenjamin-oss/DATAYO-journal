import { NextResponse } from "next/server";
import { requireUser, unauthorized } from "@/lib/auth";
import { advanceReplay } from "@/lib/replay-service";

type Context = { params: Promise<{ id: string }> };
export const dynamic = "force-dynamic";

export async function POST(req: Request, { params }: Context) {
  const me = await requireUser();
  if (!me) return unauthorized();
  try {
    const body = await req.json().catch(() => ({}));
    const session = await advanceReplay(me.id, (await params).id, Number(body.steps ?? 1));
    return NextResponse.json(session);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Impossible d'avancer le Replay" }, { status: 400 });
  }
}
