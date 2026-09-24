import { NextResponse } from "next/server";
import { and, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { accounts, tradeAccounts, trades } from "@/db/schema";
import { requireUser, unauthorized } from "@/lib/auth";
import { publish } from "@/lib/realtime";
import { ownsAccount, parseTrade } from "@/lib/parsers";
import { associateTradeEconomicEvents } from "@/lib/economic-calendar-service";
import { getAccountBalanceBeforeTrade } from "@/lib/account-balance";
import { getFinancialInstrumentSpecBySymbol } from "@/lib/financial-specs";
import { calculateFinancialResult } from "@/lib/financial-calculator";
import type { Account } from "@/lib/types";

export const dynamic = "force-dynamic";
type Ctx = { params: Promise<{ id: string }> };

async function ownedTrade(profileId: string, id: string) {
  const [linked] = await db
    .select({ id: tradeAccounts.id })
    .from(tradeAccounts)
    .innerJoin(accounts, eq(tradeAccounts.accountId, accounts.id))
    .where(
      and(
        eq(tradeAccounts.tradeId, id),
        eq(accounts.profileId, profileId)
      )
    );

  if (linked) return true;

  const [legacy] = await db
    .select({ id: trades.id })
    .from(trades)
    .innerJoin(accounts, eq(trades.accountId, accounts.id))
    .where(
      and(
        eq(trades.id, id),
        eq(accounts.profileId, profileId)
      )
    );

  return !!legacy;
}

export async function PATCH(req: Request, { params }: Ctx) {
  const me = await requireUser();
  if (!me) return unauthorized();

  const { id } = await params;

  if (!(await ownedTrade(me.id, id))) {
    return NextResponse.json(
      { error: "Introuvable" },
      { status: 404 }
    );
  }

  const body = await req.json().catch(() => ({}));
  const data = parseTrade(body);

  if (!data.date || !data.symbol) {
    return NextResponse.json(
      { error: "Date et symbole requis" },
      { status: 400 }
    );
  }

  const accountInputs = Array.isArray(body.accountInputs)
    ? body.accountInputs
    : [];

  if (accountInputs.length === 0) {
    return NextResponse.json(
      { error: "Au moins un compte doit ?tre s?lectionn?" },
      { status: 400 }
    );
  }

  const normalizedAccounts: Array<{
    accountId: string;
    lotSize: number | null;
  }> = accountInputs
    .map((item: Record<string, unknown>) => ({
      accountId: String(item.accountId ?? ""),
      lotSize:
        item.lotSize !== null &&
        item.lotSize !== undefined &&
        item.lotSize !== "" &&
        Number.isFinite(Number(item.lotSize))
          ? Number(item.lotSize)
          : null,
    }))
    .filter((item: { accountId: string }) => item.accountId);

  if (normalizedAccounts.length === 0) {
    return NextResponse.json(
      { error: "Compte invalide" },
      { status: 400 }
    );
  }

  const uniqueAccountIds = [
    ...new Set(normalizedAccounts.map((item) => item.accountId)),
  ];

  if (uniqueAccountIds.length !== normalizedAccounts.length) {
    return NextResponse.json(
      { error: "Un m?me compte ne peut ?tre associ? qu'une seule fois" },
      { status: 400 }
    );
  }

  for (const item of normalizedAccounts) {
    if (!(await ownsAccount(me.id, item.accountId))) {
      return NextResponse.json(
        { error: "Compte invalide" },
        { status: 403 }
      );
    }
  }

  const legacyAccount = normalizedAccounts[0];

  const tradeData = {
    ...data,
    // Transitional compatibility with the legacy mono-account columns.
    accountId: legacyAccount.accountId,
    lotSize: null,
    riskPct: 1,
    rMultiple: 0,
    pnl: 0,
  };

  const row = await db.transaction(async (tx) => {
    const accountRows = await tx
      .select()
      .from(accounts)
      .where(inArray(accounts.id, uniqueAccountIds));

    const accountById = new Map(
      accountRows.map((account) => [account.id, account])
    );

    const [updatedTrade] = await tx
      .update(trades)
      .set(tradeData)
      .where(eq(trades.id, id))
      .returning();

    if (!updatedTrade) {
      throw new Error("Trade introuvable");
    }

    const tradeAccountRows: Array<{
      tradeId: string;
      accountId: string;
      lotSize: number | null;
      riskPct: number | null;
      riskAmount: number | null;
      rMultiple: number | null;
      pnl: number | null;
    }> = [];

    for (const item of normalizedAccounts) {
      const account = accountById.get(item.accountId) as Account | undefined;

      if (!account) {
        throw new Error("Compte invalide");
      }

      const balanceBefore = await getAccountBalanceBeforeTrade(
        item.accountId,
        id,
        tx
      );

      const financialSpec = await getFinancialInstrumentSpecBySymbol(
        data.symbol,
        account,
        tx
      );

      let riskAmount: number | null = null;
      let riskPct: number | null = null;
      let rMultiple: number | null = null;
      let pnl: number | null = null;

      if (
        balanceBefore !== null &&
        item.lotSize !== null &&
        data.entryPrice !== null &&
        financialSpec !== null
      ) {
        const result = calculateFinancialResult({
          direction: data.direction as "long" | "short",
          entryPrice: data.entryPrice,
          stopLoss: data.stopLoss,
          exitPrice: data.exitPrice,
          lotSize: item.lotSize,
          accountBalance: balanceBefore,
          valuePerPriceUnit: financialSpec.valuePerPriceUnit,
          quoteCurrency: financialSpec.quoteCurrency,
          accountCurrency: financialSpec.accountCurrency,
          conversionRate:
            financialSpec.quoteCurrency === financialSpec.accountCurrency
              ? 1
              : null,
        });

        riskAmount = result.riskAmountAccount;
        riskPct = result.riskPct;
        rMultiple = result.rMultiple;
        pnl = result.pnlAccount;
      }

      tradeAccountRows.push({
        tradeId: id,
        accountId: item.accountId,
        lotSize: item.lotSize,
        riskPct,
        riskAmount,
        rMultiple,
        pnl,
      });
    }

    await tx
      .delete(tradeAccounts)
      .where(eq(tradeAccounts.tradeId, id));

    await tx.insert(tradeAccounts).values(tradeAccountRows);

    return updatedTrade;
  });

  await associateTradeEconomicEvents(row.id);
  await publish(me.id, "trades");

  return NextResponse.json(row);
}

export async function DELETE(_req: Request, { params }: Ctx) {
  const me = await requireUser();
  if (!me) return unauthorized();

  const { id } = await params;

  if (!(await ownedTrade(me.id, id))) {
    return NextResponse.json(
      { error: "Introuvable" },
      { status: 404 }
    );
  }

  await db.delete(trades).where(eq(trades.id, id));
  await publish(me.id, "trades");

  return NextResponse.json({ ok: true });
}
