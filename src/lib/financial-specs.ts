import "server-only";

import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { instrumentSpecs, instruments } from "@/db/schema";
import type { Account, Instrument, InstrumentSpec } from "./types";

type DatabaseClient = Pick<typeof db, "select">;

export type FinancialInstrumentSpec = {
  instrument: Instrument;
  spec: InstrumentSpec;
  quoteCurrency: string;
  accountCurrency: string;
  valuePerPriceUnit: number;
  priceIncrement: number;
  calculationModel: string;
  quantityUnit: string;
};

export async function getFinancialInstrumentSpec(
  instrumentId: string,
  account: Account,
  client: DatabaseClient = db
): Promise<FinancialInstrumentSpec | null> {
  const normalizedInstrumentId = String(instrumentId).trim();
  const normalizedBroker = String(account.broker).trim();

  if (!normalizedInstrumentId || !normalizedBroker) {
    return null;
  }

  const [row] = await client
    .select({
      instrument: instruments,
      spec: instrumentSpecs,
    })
    .from(instruments)
    .innerJoin(
      instrumentSpecs,
      eq(instrumentSpecs.instrumentId, instruments.id)
    )
    .where(
      and(
        eq(instruments.id, normalizedInstrumentId),
        eq(instrumentSpecs.broker, normalizedBroker),
        eq(instruments.isActive, true)
      )
    )
    .limit(1);

  if (!row) {
    return null;
  }

  return {
    instrument: row.instrument,
    spec: row.spec,
    quoteCurrency: row.instrument.quoteCurrency,
    accountCurrency: account.currency,
    valuePerPriceUnit: row.spec.valuePerPriceUnit,
    priceIncrement: row.spec.priceIncrement,
    calculationModel: row.spec.calculationModel,
    quantityUnit: row.spec.quantityUnit,
  };
}

export async function getFinancialInstrumentSpecBySymbol(
  symbol: string,
  account: Account,
  client: DatabaseClient = db
): Promise<FinancialInstrumentSpec | null> {
  const normalizedSymbol = String(symbol).trim().toUpperCase();

  if (!normalizedSymbol) {
    return null;
  }

  const [instrument] = await client
    .select()
    .from(instruments)
    .where(
      and(
        eq(instruments.symbol, normalizedSymbol),
        eq(instruments.isActive, true)
      )
    )
    .limit(1);

  if (!instrument) {
    return null;
  }

  return getFinancialInstrumentSpec(instrument.id, account, client);
}
