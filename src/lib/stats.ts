import type { Trade } from "./types";

export function fmtMoney(v: number, currency = "USD", lang: "fr" | "en" = "fr") {
  return new Intl.NumberFormat(lang === "fr" ? "fr-FR" : "en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(v);
}

export function fmtR(v: number) {
  return `${v > 0 ? "+" : ""}${v.toFixed(2)}R`;
}

export function computeStats(trades: Trade[]) {
  const n = trades.length;
  const wins = trades.filter((t) => t.pnl > 0);
  const losses = trades.filter((t) => t.pnl < 0);
  const be = n - wins.length - losses.length;
  const gross = wins.reduce((s, t) => s + t.pnl, 0);
  const grossLoss = Math.abs(losses.reduce((s, t) => s + t.pnl, 0));
  const net = trades.reduce((s, t) => s + t.pnl, 0);
  const totalR = trades.reduce((s, t) => s + t.rMultiple, 0);
  const avgR = n ? totalR / n : 0;
  const winRate = n ? (wins.length / n) * 100 : 0;
  const pf = grossLoss > 0 ? gross / grossLoss : gross > 0 ? Infinity : 0;
  const best = n ? Math.max(...trades.map((t) => t.pnl)) : 0;
  const worst = n ? Math.min(...trades.map((t) => t.pnl)) : 0;

  // Drawdown in R (peak-to-trough)
  const sorted = [...trades].sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
  let peakR = 0;
  let cumR = 0;
  let maxDdR = 0;
  const ddList: number[] = [];

  for (const t of sorted) {
    cumR += t.rMultiple;
    if (cumR > peakR) {
      peakR = cumR;
    }
    const currentDd = peakR - cumR;
    if (currentDd > 0) {
      ddList.push(currentDd);
    }
    if (currentDd > maxDdR) {
      maxDdR = currentDd;
    }
  }

  const avgDdR = ddList.length ? ddList.reduce((a, b) => a + b, 0) / ddList.length : 0;

  // Expectancy (in R)
  const avgWinR = wins.length ? wins.reduce((s, t) => s + t.rMultiple, 0) / wins.length : 0;
  const avgLossR = losses.length ? Math.abs(losses.reduce((s, t) => s + t.rMultiple, 0) / losses.length) : 0;
  const winPct = n ? wins.length / n : 0;
  const lossPct = n ? losses.length / n : 0;
  const expectancy = winPct * avgWinR - lossPct * avgLossR;

  // Sharpe Ratio (per-trade R)
  let sharpe = 0;
  if (n > 1) {
    const variance = trades.reduce((s, t) => s + Math.pow(t.rMultiple - avgR, 2), 0) / (n - 1);
    const stdDev = Math.sqrt(variance);
    if (stdDev > 0.0001) {
      sharpe = Math.max(0, (avgR / stdDev) * Math.sqrt(Math.min(n, 50)));
    }
  }

  return {
    n,
    wins: wins.length,
    losses: losses.length,
    be,
    gross,
    grossLoss,
    net,
    totalR,
    avgR,
    winRate,
    pf,
    best,
    worst,
    maxDdR,
    avgDdR,
    expectancy,
    sharpe,
  };
}

export function equitySeries(trades: Trade[], start = 0) {
  const sorted = [...trades].sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : a.createdAt < b.createdAt ? -1 : 1));
  let cum = start;
  return sorted.map((t) => {
    cum += t.pnl;
    return { date: t.date, value: cum, tradeId: t.id };
  });
}

export function groupBy<K extends string>(trades: Trade[], key: (t: Trade) => K) {
  const map = new Map<K, Trade[]>();
  for (const t of trades) {
    const k = key(t);
    map.set(k, [...(map.get(k) ?? []), t]);
  }
  return [...map.entries()].map(([k, arr]) => ({ key: k, ...computeStats(arr) }));
}

export function weekdayIndex(date: string) {
  // Monday = 0 … Sunday = 6
  const d = new Date(date + "T12:00:00");
  return (d.getDay() + 6) % 7;
}

export function computeAnnualMonthlyMatrix(trades: Trade[], year: number) {
  const matrix = Array.from({ length: 12 }, (_, monthIdx) => {
    const monthPrefix = `${year}-${String(monthIdx + 1).padStart(2, "0")}`;
    const monthTrades = trades.filter((t) => t.date.startsWith(monthPrefix));
    const stats = computeStats(monthTrades);
    return {
      monthIdx,
      tradesCount: stats.n,
      pnl: stats.net,
      winRate: stats.winRate,
      hasData: stats.n > 0,
    };
  });

  const totalTrades = trades.filter((t) => t.date.startsWith(`${year}-`));
  const totalStats = computeStats(totalTrades);

  return {
    months: matrix,
    total: {
      tradesCount: totalStats.n,
      pnl: totalStats.net,
      winRate: totalStats.winRate,
    },
  };
}
