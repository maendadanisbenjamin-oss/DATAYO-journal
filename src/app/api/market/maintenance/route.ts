import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { runRetention } from "@/lib/market-engine";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const token = req.headers.get("x-market-admin-token");
  const tokenAuthorized = Boolean(process.env.MARKET_ADMIN_TOKEN && token === process.env.MARKET_ADMIN_TOKEN);
  if (!tokenAuthorized && !(await requireAdmin())) {
    return NextResponse.json({ error: "Réservé à l'administrateur" }, { status: 403 });
  }
  const result = await runRetention();
  return NextResponse.json(result);
}
