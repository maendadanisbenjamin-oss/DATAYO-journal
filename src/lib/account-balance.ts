import "server-only";

import { and, eq, isNotNull } from "drizzle-orm";
import { db } from "@/db";
import { accounts, tradeAccounts, trades } from "@/db/schema";

type DatabaseClient = Pick<typeof db, "select">;

type TradeOrder = {
  openedAt: Date | null;
  createdAt: Date;
  tradeId: string;
};

function compareTradeOrder(a: TradeOrder, b: TradeOrder): number {
  const aPrimary = (a.openedAt ?? a.createdAt).getTime();
  const bPrimary = (b.openedAt ?? b.createdAt).getTime();

  if (aPrimary !== bPrimary) {
    return aPrimary - bPrimary;
  }

  const aCreated = a.createdAt.getTime();
  const bCreated = b.createdAt.getTime();

  if (aCreated !== bCreated) {
    return aCreated - bCreated;
  }

  return a.tradeId.localeCompare(b.tradeId);
}

export async function getAccountBalanceBeforeTrade(
  accountId: string,
  tradeId?: string,
  client: DatabaseClient = db
): Promise<number | null> {
  const normalizedAccountId = String(accountId).trim();

  if (!normalizedAccountId) {
    return null;
  }

  const [account] = await client
    .select({
      initialBalance: accounts.initialBalance,
    })
    .from(accounts)
    .where(eq(accounts.id, normalizedAccountId))
    .limit(1);

  if (!account) {
    return null;
  }

  const currentTradeId = tradeId ? String(tradeId).trim() : "";

  let currentTrade: TradeOrder | null = null;

  if (currentTradeId) {
    const [row] = await client
      .select({
        tradeId: trades.id,
        openedAt: trades.openedAt,
        createdAt: trades.createdAt,
      })
      .from(trades)
      .where(eq(trades.id, currentTradeId))
      .limit(1);

    if (row) {
      currentTrade = row;
    }
  }

  const rows = await client
    .select({
      tradeId: trades.id,
      openedAt: trades.openedAt,
      createdAt: trades.createdAt,
      pnl: tradeAccounts.pnl,
    })
    .from(tradeAccounts)
    .innerJoin(trades, eq(tradeAccounts.tradeId, trades.id))
    .where(
      and(
        eq(tradeAccounts.accountId, normalizedAccountId),
        isNotNull(tradeAccounts.pnl)
      )
    );

  const previousRows = rows
    .filter((row) => {
      if (currentTradeId && row.tradeId === currentTradeId) {
        return false;
      }

      if (!currentTrade) {
        return true;
      }

      return compareTradeOrder(row, currentTrade) < 0;
    })
    .sort(compareTradeOrder);

  let balance = account.initialBalance;

  for (const row of previousRows) {
    if (row.pnl !== null) {
      balance += row.pnl;
    }
  }

  return Number(balance.toFixed(10));
}
