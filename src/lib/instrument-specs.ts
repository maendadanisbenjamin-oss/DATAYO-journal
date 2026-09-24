import "server-only";

import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { instrumentSpecs } from "@/db/schema";
import type { InstrumentSpec } from "./types";

export async function getInstrumentSpec(
  instrumentId: string,
  broker: string
): Promise<InstrumentSpec | null> {
  const normalizedInstrumentId = String(instrumentId).trim();
  const normalizedBroker = String(broker).trim();

  if (!normalizedInstrumentId || !normalizedBroker) {
    return null;
  }

  const [row] = await db
    .select()
    .from(instrumentSpecs)
    .where(
      and(
        eq(instrumentSpecs.instrumentId, normalizedInstrumentId),
        eq(instrumentSpecs.broker, normalizedBroker)
      )
    )
    .limit(1);

  return row ?? null;
}
