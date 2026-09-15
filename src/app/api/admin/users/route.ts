import { NextResponse } from "next/server";
import { desc } from "drizzle-orm";
import { db } from "@/db";
import { profiles } from "@/db/schema";
import { publicProfile, requireAdmin, unauthorized } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  const admin = await requireAdmin();
  if (!admin) return unauthorized();

  const rows = await db
    .select()
    .from(profiles)
    .orderBy(desc(profiles.createdAt));

  return NextResponse.json(rows.map(publicProfile));
}
