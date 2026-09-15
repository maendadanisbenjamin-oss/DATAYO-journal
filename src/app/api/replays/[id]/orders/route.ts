import { NextResponse } from "next/server";
import { requireUser, unauthorized } from "@/lib/auth";
import { replayOrder } from "@/lib/replay-service";

type Context = { params: Promise<{ id: string }> };
export const dynamic = "force-dynamic";

export async function POST(req: Request, { params }: Context) {
  const me = await requireUser();
  if (!me) return unauthorized();
  try {
    const body = await req.json().catch(() => ({}));
    const action = body.action;
    if (!["buy", "sell", "move_sl", "move_tp", "close"].includes(action)) return NextResponse.json({ error: "Action invalide" }, { status: 400 });
    const result = await replayOrder({
      profileId: me.id,
      replayId: (await params).id,
      action,
      replayTradeId: typeof body.replayTradeId === "string" ? body.replayTradeId : undefined,
      stopLoss: body.stopLoss === null || body.stopLoss === undefined || body.stopLoss === "" ? null : Number(body.stopLoss),
      takeProfit: body.takeProfit === null || body.takeProfit === undefined || body.takeProfit === "" ? null : Number(body.takeProfit),
      quantity: body.quantity === undefined ? undefined : Number(body.quantity),
      commission: body.commission === undefined ? undefined : Number(body.commission),
    });
    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Ordre impossible" }, { status: 400 });
  }
}
